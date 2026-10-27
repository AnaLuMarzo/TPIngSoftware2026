const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const ROOT = __dirname;
const POSTULANTES_PATH = path.join(ROOT, 'data', 'postulantes.json');
const CHARLAS_PATH = path.join(ROOT, 'data', 'charlas.json');
const PORT = Number(process.env.PORT) || 8080;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 1024;
const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

let writeQueue = Promise.resolve();

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function enviarJSON(respuesta, estado, contenido) {
    respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
    respuesta.end(JSON.stringify(contenido));
}

function obtenerFechaHoraCharla(charla) {
    if (!charla || typeof charla.Fecha !== 'string' || typeof charla.Horario !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(charla.Fecha) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(charla.Horario)) return null;

    const [anio, mes, dia] = charla.Fecha.split('-').map(Number);
    const [hora, minuto] = charla.Horario.split(':').map(Number);
    const fechaHora = new Date(anio, mes - 1, dia, hora, minuto);
    if (fechaHora.getFullYear() !== anio || fechaHora.getMonth() !== mes - 1 ||
        fechaHora.getDate() !== dia || fechaHora.getHours() !== hora ||
        fechaHora.getMinutes() !== minuto) return null;

    return fechaHora;
}

async function validarPeriodoInscripcion() {
    const charlas = JSON.parse(await fs.readFile(CHARLAS_PATH, 'utf8'));
    if (!Array.isArray(charlas)) {
        throw new Error('charlas.json debe contener una lista JSON.');
    }

    let apertura = null;
    let cierre = null;
    for (const charla of charlas) {
        const fechaHora = obtenerFechaHoraCharla(charla);
        if (!fechaHora) continue;
        if (!apertura || fechaHora < apertura) apertura = fechaHora;
        if (!cierre || fechaHora > cierre) cierre = fechaHora;
    }
    if (!apertura || !cierre) {
        throw new HttpError(503, 'No se pudo determinar el período de inscripción.');
    }

    const ahora = Date.now();
    if (ahora < apertura.getTime()) {
        throw new HttpError(403, 'La convocatoria todavía no abrió.');
    }
    if (ahora >= cierre.getTime()) {
        throw new HttpError(403, 'El período de inscripción ya cerró.');
    }
}

async function leerJSON(request) {
    const partes = [];
    let bytesLeidos = 0;

    for await (const parte of request) {
        bytesLeidos += parte.length;
        if (bytesLeidos > MAX_BODY_BYTES) {
            throw new HttpError(413, 'La solicitud es demasiado grande.');
        }
        partes.push(parte);
    }

    try {
        return JSON.parse(Buffer.concat(partes).toString('utf8'));
    } catch {
        throw new HttpError(400, 'El contenido enviado no es JSON válido.');
    }
}

function validarPostulante(datos) {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        throw new HttpError(400, 'Los datos del postulante no son válidos.');
    }

    const campos = [
        'nombre', 'dni', 'fecha_nacimiento', 'direccion', 'telefono', 'email',
        'distrito', 'experiencia', 'capacitacion', 'afiliado', 'partido'
    ];
    const postulante = {};

    for (const campo of campos) {
        if (typeof datos[campo] !== 'string') {
            throw new HttpError(400, 'Completá correctamente los datos del formulario.');
        }
        postulante[campo] = datos[campo].trim();
    }

    const camposObligatorios = [
        'nombre', 'dni', 'fecha_nacimiento', 'direccion', 'telefono', 'email', 'distrito'
    ];
    if (camposObligatorios.some(campo => !postulante[campo])) {
        throw new HttpError(400, 'Completá todos los campos obligatorios.');
    }
    const fechaNacimiento = new Date(`${postulante.fecha_nacimiento}T00:00:00.000Z`);
    if (!/^[\p{L} ]+$/u.test(postulante.nombre.normalize('NFC')) ||
        !/^\d{8,9}$/.test(postulante.dni) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(postulante.fecha_nacimiento) ||
        Number.isNaN(fechaNacimiento.getTime()) ||
        fechaNacimiento.toISOString().slice(0, 10) !== postulante.fecha_nacimiento ||
        postulante.fecha_nacimiento > '2010-12-31' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(postulante.email) ||
        postulante.telefono.replace(/\D/g, '').length < 8 ||
        !['d1', 'd2', 'd3'].includes(postulante.distrito) ||
        !['si', 'no'].includes(postulante.experiencia) ||
        !['si', 'no'].includes(postulante.capacitacion) ||
        !['si', 'no'].includes(postulante.afiliado)) {
        throw new HttpError(400, 'Revisá los datos ingresados en el formulario.');
    }

    return postulante;
}

function guardarPostulante(postulante) {
    const operacion = writeQueue.then(async () => {
        await validarPeriodoInscripcion();

        let postulantes;
        try {
            postulantes = JSON.parse(await fs.readFile(POSTULANTES_PATH, 'utf8'));
        } catch (error) {
            throw new Error(`No se pudo leer postulantes.json: ${error.message}`);
        }
        if (!Array.isArray(postulantes)) {
            throw new Error('postulantes.json debe contener una lista JSON.');
        }

        postulantes.push(postulante);
        try {
            await fs.writeFile(POSTULANTES_PATH, `${JSON.stringify(postulantes, null, 2)}\n`, 'utf8');
        } catch (error) {
            throw new Error(`No se pudo guardar postulantes.json: ${error.message}`);
        }
    });

    writeQueue = operacion.catch(() => {});
    return operacion;
}

async function servirArchivo(request, response, pathname) {
    let rutaSolicitada;
    try {
        rutaSolicitada = decodeURIComponent(pathname);
    } catch {
        throw new HttpError(400, 'La ruta solicitada no es válida.');
    }

    if (rutaSolicitada === '/') rutaSolicitada = '/main.html';
    const rutaArchivo = path.resolve(ROOT, `.${rutaSolicitada}`);
    if (!rutaArchivo.startsWith(`${ROOT}${path.sep}`)) {
        throw new HttpError(403, 'Acceso denegado.');
    }

    let contenido;
    try {
        contenido = await fs.readFile(rutaArchivo);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            throw new HttpError(404, 'No se encontró el recurso solicitado.');
        }
        throw error;
    }

    response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(rutaArchivo).toLowerCase()] || 'application/octet-stream',
        'Content-Length': contenido.length
    });
    response.end(request.method === 'HEAD' ? undefined : contenido);
}

const servidor = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${HOST}:${PORT}`);
        if (url.pathname === '/api/postulantes') {
            if (request.method !== 'POST') {
                response.setHeader('Allow', 'POST');
                throw new HttpError(405, 'Método no permitido.');
            }

            const postulante = validarPostulante(await leerJSON(request));
            await guardarPostulante(postulante);
            enviarJSON(response, 201, { mensaje: 'La inscripción se guardó correctamente.' });
            return;
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.setHeader('Allow', 'GET, HEAD');
            throw new HttpError(405, 'Método no permitido.');
        }
        await servirArchivo(request, response, url.pathname);
    } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        if (status === 500) console.error('Error al procesar la solicitud:', error);
        if (!response.headersSent) {
            enviarJSON(response, status, {
                error: status === 500 ? 'No se pudo procesar la solicitud.' : error.message
            });
        } else {
            response.end();
        }
    }
});

servidor.listen(PORT, HOST, () => {
    console.log(`Servidor disponible en http://${HOST}:${PORT}`);
});
