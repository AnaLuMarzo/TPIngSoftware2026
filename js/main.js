// ===== Constantes =====
// La API de USIG acepta HTTPS (verificado), y es la forma más compatible:
// los routers de ISPs argentinas (Flow, Fiberhome, Telecom, etc.) suelen
// forzar el upgrade HTTP->HTTPS ("HTTPS-Only Mode") que puede romper peticiones
// a servidores que hablan solo HTTP. Con HTTPS directo se evita ese conflicto.
const URL_USIG = 'https://servicios.usig.buenosaires.gob.ar/normalizar/';
const URL_SEDES = 'data/sedes.json';
const URL_CHARLAS_CIERRE = 'data/charlas.json';

// ===== Inicialización del mapa (Leaflet + OpenStreetMap) =====
const elementoMapa = document.getElementById('mapa');
let mapa = null;
if (elementoMapa && window.L) {
    mapa = L.map(elementoMapa).setView([-34.6037, -58.3816], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapa);
}

/**
 * Normaliza una dirección usando la API de USIG (Gobierno de CABA).
 * https://servicios.usig.buenosaires.gob.ar/normalizar
 *
 * @param {string} direccion - Dirección a normalizar, ej. "cordoba 1538, caba".
 * @returns {Promise<{lat:number, lng:number, direccionNormalizada:string}|null>}
 *          Datos geográficos y la dirección ya normalizada, o null si no hay resultado.
 */
async function normalizarDireccion(direccion) {
    const parametros = new URLSearchParams({
        direccion,
        geocodificar: 'TRUE'
    });
    const url = `${URL_USIG}?${parametros.toString()}`;

    const respuesta = await fetch(url);
    if (!respuesta.ok) {
        console.warn('USIG devolvió un error', respuesta.status, direccion);
        return null;
    }

    const datosRespuesta = await respuesta.json();

    // USIG devuelve: { direccionesNormalizadas: [ { direccion, coordenadas: {x, y}, ... } ] }
    const direccionEncontrada = datosRespuesta?.direccionesNormalizadas?.[0];
    if (!direccionEncontrada || !direccionEncontrada.coordenadas) {
        console.warn('USIG no devolvió resultados para:', direccion);
        return null;
    }

    // coordenadas.x = longitud (lng), coordenadas.y = latitud (lat) — vienen como string
    const longitud = parseFloat(direccionEncontrada.coordenadas.x);
    const latitud = parseFloat(direccionEncontrada.coordenadas.y);
    if (!Number.isFinite(longitud) || !Number.isFinite(latitud) ||
        longitud < -180 || longitud > 180 || latitud < -90 || latitud > 90) {
        console.warn('Coordenadas inválidas en la respuesta de USIG:', direccionEncontrada);
        return null;
    }

    return {
        latitud,
        longitud,
        direccionNormalizada: typeof direccionEncontrada.direccion === 'string'
            ? direccionEncontrada.direccion
            : direccion
    };
}

/**
 * Se conserva la dirección normalizada para comparar búsquedas con sedes registradas.
 */
const sedesGeolocalizadas = [];

/**
 * Dado un resultado de USIG y datos de la sede, se agrega un marcador al mapa.
 *
 * @param {object} ubicacion - Resultado de `normalizarDireccion()`.
 * @param {string} nombre - Nombre de la sede.
 * @param {string} referencia - Texto opcional adicional.
 */
function agregarMarcador(ubicacion, nombre, referencia = '') {
    const contenidoPopup = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = nombre;
    contenidoPopup.append(titulo, document.createElement('br'), ubicacion.direccionNormalizada);
    if (referencia) {
        contenidoPopup.append(document.createElement('br'));
        const textoReferencia = document.createElement('em');
        textoReferencia.textContent = referencia;
        contenidoPopup.append(textoReferencia);
    }

    return L.marker([ubicacion.latitud, ubicacion.longitud])
        .addTo(mapa)
        .bindPopup(contenidoPopup);
}

async function cargarSedes() {
    const estado = document.getElementById('info-sedes');
    if (!mapa) {
        if (estado) estado.textContent = 'El mapa no está disponible en este momento.';
        return;
    }

    let sedes;
    try {
        const respuesta = await fetch(URL_SEDES);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        sedes = await respuesta.json();
        if (!Array.isArray(sedes)) throw new Error('El archivo de sedes no contiene una lista válida.');
    } catch (error) {
        console.error('No se pudo cargar', URL_SEDES, error);
        if (estado) estado.textContent = 'No se pudo cargar la lista de sedes. Verificá la conexión e intentá nuevamente.';
        return;
    }

    const sedesValidas = sedes.filter(esSedeValida);
    if (sedesValidas.length === 0) {
        if (estado) estado.textContent = 'No hay sedes válidas disponibles para mostrar.';
        return;
    }

    const tareasGeocodificacion = sedesValidas.map(async (sede) => {
        let ubicacion;
        try {
            ubicacion = await normalizarDireccion(sede.direccion.trim());
        } catch (error) {
            console.warn('Falló la búsqueda de la dirección de una sede:', error);
            return;
        }
        if (!ubicacion) {
            console.warn('No se pudo geocodificar la sede:', sede);
            return;
        }
        const marcador = agregarMarcador(ubicacion, sede.nombre, sede.referencia || '');
        sedesGeolocalizadas.push({
            latitud: ubicacion.latitud,
            longitud: ubicacion.longitud,
            nombre: sede.nombre,
            direccionNormalizada: ubicacion.direccionNormalizada,
            marcador,
        });
    });

    await Promise.all(tareasGeocodificacion);

    if (sedesGeolocalizadas.length === 0) {
        if (estado) estado.textContent = 'No se pudieron ubicar las sedes. Revisá la conexión e intentá más tarde.';
        return;
    }
    if (estado) estado.textContent = `Se muestran ${sedesGeolocalizadas.length} de ${sedesValidas.length} sedes.`;

    const bounds = mapa.getBounds();
    if (bounds.isValid()) {
        mapa.fitBounds(bounds.pad(0.2));
    }
}

/**
 * Normaliza un texto para comparar de forma insensible a mayúsculas/espacios.
 */
function normalizarTexto(texto) {
    return (texto || '').trim().toUpperCase();
}

/**
 * Buscador de sedes: toma la dirección escrita por el usuario, la envía al
 * servicio de normalización de direcciones y, si corresponde a una de las
 * sedes registradas, resalta su marcador en el mapa.
 * Si la dirección existe pero no es una sede, no se agrega ningún marcador
 * ni se mueve el mapa; solo se notifica al usuario.
 */
async function buscarDireccion(direccion) {
    const botonBuscar = document.getElementById('btn-buscar-sede');
    const estadoBusqueda = document.getElementById('info-buscar-sede');
    if (!botonBuscar || !estadoBusqueda) return;
    if (!direccion.trim()) {
        estadoBusqueda.textContent = 'Ingresá una dirección para realizar la búsqueda.';
        return;
    }
    if (!mapa) {
        estadoBusqueda.textContent = 'El mapa no está disponible en este momento.';
        return;
    }
    botonBuscar.disabled = true;
    estadoBusqueda.textContent = 'Buscando la ubicación…';

    try {
        const ubicacion = await normalizarDireccion(direccion);
        if (!ubicacion) {
            estadoBusqueda.textContent = 'No encontramos esa dirección. Probá escribir, por ejemplo: "cordoba 1538, caba".';
            return;
        }

        // Buscar si la dirección normalizada coincide con alguna sede registrada.
        const sede = sedesGeolocalizadas.find(sedeRegistrada =>
            normalizarTexto(sedeRegistrada.direccionNormalizada) === normalizarTexto(ubicacion.direccionNormalizada));

        if (!sede) {
            estadoBusqueda.textContent = 'No es una Sede.';
            return;
        }

        mapa.setView([sede.latitud, sede.longitud], 15);
        sede.marcador.openPopup();
        estadoBusqueda.textContent = `Sede encontrada: ${sede.nombre}`;
    } catch (error) {
        console.error('No se pudo buscar la dirección:', error);
        estadoBusqueda.textContent = 'No se pudo completar la búsqueda. Verificá tu conexión e intentá nuevamente.';
    } finally {
        botonBuscar.disabled = false;
    }
}

function inicializarBuscador() {
    const input = document.getElementById('input-buscar-sede');
    const botonBuscar = document.getElementById('btn-buscar-sede');
    if (!input || !botonBuscar) return;

    const enviarBusqueda = (evento) => {
        if (evento) evento.preventDefault();
        const direccion = input.value.trim();
        buscarDireccion(direccion);
    };

    botonBuscar.addEventListener('click', enviarBusqueda);
    input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') enviarBusqueda(evento);
    });
}

cargarSedes();
inicializarBuscador();

// ===== Formulario de inscripción =====
const form = document.getElementById('form-inscripcion');
let fechaHoraCierreInscripciones = null;
const botonEnviarInscripcion = form?.querySelector('button[type="submit"]');

if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = true;

function cerrarInscripciones() {
    if (!form) return;

    form.querySelectorAll('input, select, button').forEach(control => {
        control.disabled = true;
    });

    const estado = document.getElementById('estado-inscripcion');
    if (estado) {
        estado.textContent = `El período de inscripción cerró el ${textoCierreInscripciones}.`;
        estado.className = 'form-status error';
    }
}

let textoCierreInscripciones = '';

function actualizarEstadoCierreInscripciones() {
    if (!fechaHoraCierreInscripciones || !form) return;

    const tiempoRestante = fechaHoraCierreInscripciones.getTime() - Date.now();
    if (tiempoRestante <= 0) {
        cerrarInscripciones();
        return;
    }

    if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = false;
    window.setTimeout(actualizarEstadoCierreInscripciones, Math.min(tiempoRestante, 60_000));
}

async function cargarCierreInscripciones() {
    const avisoCierre = document.getElementById('fecha-cierre-inscripcion');

    try {
        const respuesta = await fetch(URL_CHARLAS_CIERRE);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const charlas = await respuesta.json();
        if (!Array.isArray(charlas)) throw new Error('La lista de charlas no es válida.');

        const ultimaFechaHora = charlas.reduce((ultima, charla) => {
            if (!charla || typeof charla.Fecha !== 'string' || typeof charla.Horario !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(charla.Fecha) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(charla.Horario)) return ultima;

            const fechaHora = `${charla.Fecha}T${charla.Horario}:00`;
            return Number.isNaN(new Date(fechaHora).getTime()) || (ultima && fechaHora <= ultima)
                ? ultima
                : fechaHora;
        }, null);

        if (!ultimaFechaHora) throw new Error('No hay charlas con fecha y horario válidos.');

        fechaHoraCierreInscripciones = new Date(ultimaFechaHora);
        const fechaFormateada = fechaHoraCierreInscripciones.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const horaFormateada = fechaHoraCierreInscripciones.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        textoCierreInscripciones = `${fechaFormateada} a las ${horaFormateada}`;
        if (avisoCierre) avisoCierre.textContent = `El registro estará abierto hasta el ${textoCierreInscripciones}.`;

        actualizarEstadoCierreInscripciones();
    } catch (error) {
        console.error('No se pudo determinar el cierre de inscripciones:', error);
        if (avisoCierre) avisoCierre.textContent = 'No se pudo verificar el horario de cierre; las inscripciones no están disponibles.';
        const estado = document.getElementById('estado-inscripcion');
        if (estado) {
            estado.textContent = 'No se pudo verificar el horario de cierre. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
    }
}

if (form) cargarCierreInscripciones();

if (form) form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const estado = document.getElementById('estado-inscripcion');

    if (!fechaHoraCierreInscripciones) {
        if (estado) {
            estado.textContent = 'No se pudo verificar el horario de cierre. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
        return;
    }
    if (Date.now() >= fechaHoraCierreInscripciones.getTime()) {
        cerrarInscripciones();
        return;
    }

    const camposTexto = form.querySelectorAll('input[required]:not([type="email"]), select[required]');
    camposTexto.forEach(campo => {
        campo.setCustomValidity(campo.value.trim() ? '' : 'Completá este campo.');
    });
    const fechaNacimiento = form.elements.fecha_nacimiento;
    if (fechaNacimiento) {
        const fechaLimite = '2010-12-31';
        const fechaSuperaElLimite = fechaNacimiento.value && fechaNacimiento.value > fechaLimite;
        fechaNacimiento.setCustomValidity(fechaSuperaElLimite
            ? 'La fecha de nacimiento debe ser igual o anterior al 31/12/2010.'
            : '');
    }
    const telefono = form.elements.telefono;
    if (telefono) {
        const cantidadDigitos = telefono.value.replace(/\D/g, '').length;
        telefono.setCustomValidity(telefono.value.trim() && cantidadDigitos < 8
            ? 'El teléfono debe tener al menos 8 números.'
            : '');
    }
    const email = form.elements.email;
    if (email) {
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
        email.setCustomValidity(emailValido ? '' : 'Ingresá un correo electrónico válido.');
    }

    if (!form.checkValidity()) {
        if (estado) {
            estado.textContent = 'Revisá los campos obligatorios, que el teléfono tenga al menos 8 números, el formato del correo y la fecha de nacimiento (hasta el 31/12/2010).';
            estado.className = 'form-status error';
        }
        form.reportValidity();
        return;
    }

    // El prototipo no cuenta con un backend: no se afirma que los datos se hayan guardado.
    if (estado) {
        estado.textContent = 'Los datos son válidos. Esta demostración no envía ni guarda la inscripción.';
        estado.className = 'form-status success';
    }
    form.reset();
});
