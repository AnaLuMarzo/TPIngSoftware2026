const formulario = document.getElementById('form-inscripcion');
const CLAVE_POSTULANTES = 'postulantes';
let periodoInscripcion = { apertura: null, cierre: null };
let textoAperturaInscripciones = '';
let textoCierreInscripciones = '';
const botonEnviarInscripcion = formulario?.querySelector('button[type="submit"]');
const botonDescargarPostulantes = document.getElementById('descargar-postulantes');

function obtenerPostulantesGuardados() {
    const datosGuardados = localStorage.getItem(CLAVE_POSTULANTES);
    if (!datosGuardados) return [];

    const postulantes = JSON.parse(datosGuardados);
    if (!Array.isArray(postulantes)) {
        throw new Error('El almacenamiento de postulantes no tiene el formato esperado.');
    }
    return postulantes;
}

function descargarPostulantes() {
    const estado = document.getElementById('estado-inscripcion');

    try {
        const postulantes = obtenerPostulantesGuardados();
        if (postulantes.length === 0) {
            if (estado) {
                estado.textContent = 'Todavía no hay inscripciones guardadas para descargar.';
                estado.className = 'form-status error';
            }
            return;
        }

        const archivo = new Blob([JSON.stringify(postulantes, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'postulantes.json';
        document.body.append(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);

        if (estado) {
            estado.textContent = 'Se descargó postulantes.json. Si necesitás incluirlo en el proyecto, guardalo en la carpeta data/.';
            estado.className = 'form-status success';
        }
    } catch (error) {
        console.error('No se pudieron descargar las inscripciones:', error);
        if (estado) {
            estado.textContent = 'No se pudieron descargar las inscripciones. Revisá que el almacenamiento del navegador esté disponible.';
            estado.className = 'form-status error';
        }
    }
}

if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = true;
if (botonDescargarPostulantes) botonDescargarPostulantes.addEventListener('click', descargarPostulantes);

function cerrarInscripciones(motivo) {
    if (!formulario) return;

    formulario.querySelectorAll('input, select, button[type="submit"]').forEach(control => {
        control.disabled = true;
    });

    const estado = document.getElementById('estado-inscripcion');
    if (estado) {
        estado.textContent = motivo || 'El período de inscripción no se encuentra disponible.';
        estado.className = 'form-status error';
    }
}

function actualizarEstadoInscripcion() {
    if (!periodoInscripcion.cierre || !formulario) return;

    if (!estaInscripcionAbierta(periodoInscripcion)) {
        let motivo = null;
        if (periodoInscripcion.apertura && Date.now() < periodoInscripcion.apertura.getTime()) {
            motivo = `El período de inscripción abrirá el ${textoAperturaInscripciones}.`;
        } else {
            motivo = `El período de inscripción cerró el ${textoCierreInscripciones}.`;
        }
        cerrarInscripciones(motivo);
        return;
    }

    const tiempoRestante = periodoInscripcion.cierre.getTime() - Date.now();
    if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = false;
    window.setTimeout(actualizarEstadoInscripcion, Math.min(tiempoRestante, 60_000));
}

async function cargarPeriodoInscripcion() {
    const avisoCierre = document.getElementById('fecha-cierre-inscripcion');

    try {
        const charlas = await obtenerCharlas();
        if (!Array.isArray(charlas)) throw new Error('La lista de charlas no es válida.');

        periodoInscripcion = obtenerPeriodoInscripcion(charlas);
        if (!periodoInscripcion.apertura || !periodoInscripcion.cierre) throw new Error('No hay charlas con fecha y horario válidos.');

        const fechaApertura = periodoInscripcion.apertura.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const horaApertura = periodoInscripcion.apertura.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        textoAperturaInscripciones = `${fechaApertura} a las ${horaApertura}`;

        const fechaCierre = periodoInscripcion.cierre.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const horaCierre = periodoInscripcion.cierre.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        textoCierreInscripciones = `${fechaCierre} a las ${horaCierre}`;

        if (avisoCierre) avisoCierre.textContent = `El registro estará abierto desde el ${textoAperturaInscripciones} hasta el ${textoCierreInscripciones}.`;

        actualizarEstadoInscripcion();
    } catch (error) {
        console.error('No se pudo determinar el período de inscripción:', error);
        if (avisoCierre) avisoCierre.textContent = 'No se pudo verificar el período de inscripción; las inscripciones no están disponibles.';
        const estado = document.getElementById('estado-inscripcion');
        if (estado) {
            estado.textContent = 'No se pudo verificar el período de inscripción. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
    }
}

if (formulario) cargarPeriodoInscripcion();

if (formulario) formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const estado = document.getElementById('estado-inscripcion');

    if (!periodoInscripcion.cierre) {
        if (estado) {
            estado.textContent = 'No se pudo verificar el período de inscripción. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
        return;
    }
    if (!estaInscripcionAbierta(periodoInscripcion)) {
        let motivo = null;
        if (periodoInscripcion.apertura && Date.now() < periodoInscripcion.apertura.getTime()) {
            motivo = `El período de inscripción abrirá el ${textoAperturaInscripciones}.`;
        } else {
            motivo = `El período de inscripción cerró el ${textoCierreInscripciones}.`;
        }
        cerrarInscripciones(motivo);
        return;
    }

    const camposTexto = formulario.querySelectorAll('input[required]:not([type="email"]), select[required]');
    camposTexto.forEach(campo => {
        campo.setCustomValidity(campo.value.trim() ? '' : 'Completá este campo.');
    });
    const nombre = formulario.elements.nombre;
    if (nombre) {
        if (nombre.value && !esNombreValido(nombre.value)) {
            nombre.setCustomValidity('El nombre y apellido solo puede contener letras y espacios.');
        } else if (nombre.value.trim()) {
            nombre.setCustomValidity('');
        }
    }
    const dni = formulario.elements.dni;
    if (dni) {
        dni.setCustomValidity(dni.value && !esDniValido(dni.value)
            ? 'El DNI debe tener solo números y entre 8 y 9 dígitos.'
            : '');
    }
    const fechaNacimiento = formulario.elements.fecha_nacimiento;
    if (fechaNacimiento) {
        fechaNacimiento.setCustomValidity(fechaNacimiento.value && !esFechaNacimientoValida(fechaNacimiento.value)
            ? 'La fecha de nacimiento debe ser igual o anterior al 31/12/2010.'
            : '');
    }
    const telefono = formulario.elements.telefono;
    if (telefono) {
        telefono.setCustomValidity(telefono.value.trim() && !esTelefonoValido(telefono.value)
            ? 'El teléfono debe tener al menos 8 números.'
            : '');
    }
    const email = formulario.elements.email;
    if (email) {
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
        email.setCustomValidity(emailValido ? '' : 'Ingresá un correo electrónico válido.');
    }

    if (!formulario.checkValidity()) {
        if (estado) {
            estado.textContent = 'Revisá el nombre (solo letras y espacios), los campos obligatorios, el DNI (8 o 9 números), el teléfono (al menos 8 números), el formato del correo y la fecha de nacimiento (hasta el 31/12/2010).';
            estado.className = 'form-status error';
        }
        formulario.reportValidity();
        return;
    }

    const direccion = formulario.elements.direccion;
    if (direccion) {
        if (!esDireccionValida(direccion.value)) {
            direccion.setCustomValidity('Ingresá una dirección válida (calle y número).');
            if (estado) {
                estado.textContent = 'Revisá la dirección: debe incluir el nombre de la calle y el número.';
                estado.className = 'form-status error';
            }
            formulario.reportValidity();
            return;
        }
    }

    try {
        const postulante = Object.fromEntries(
            Array.from(new FormData(formulario).entries(), ([campo, valor]) => [campo, String(valor).trim()])
        );
        postulante.fecha_inscripcion = new Date().toISOString();

        const postulantes = obtenerPostulantesGuardados();
        postulantes.push(postulante);
        localStorage.setItem(CLAVE_POSTULANTES, JSON.stringify(postulantes));
    } catch (error) {
        console.error('No se pudo guardar la inscripción:', error);
        if (estado) {
            estado.textContent = 'No se pudo guardar la inscripción. El almacenamiento local puede estar deshabilitado, lleno o contener datos inválidos.';
            estado.className = 'form-status error';
        }
        return;
    }

    if (estado) {
        estado.textContent = 'Inscripción guardada en este navegador. Podés descargar los registros como postulantes.json.';
        estado.className = 'form-status success';
    }
    formulario.reset();
});