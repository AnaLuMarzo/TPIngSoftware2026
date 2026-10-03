// ===== Constantes =====
// La API de USIG acepta HTTPS (verificado), y es la forma más compatible:
// los routers de ISPs argentinas (Flow, Fiberhome, Telecom, etc.) suelen
// forzar el upgrade HTTP->HTTPS ("HTTPS-Only Mode") que puede romper peticiones
// a servidores que hablan solo HTTP. Con HTTPS directo se evita ese conflicto.
const URL_CHARLAS_CIERRE = 'data/charlas.json';

async function cargarSeccionMapa() {
    const contenedor = document.getElementById('contenedor-mapa');
    if (!contenedor) return;

    try {
        const respuesta = await fetch('mapa.html');
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        contenedor.innerHTML = await respuesta.text();

        const scriptMapa = document.createElement('script');
        scriptMapa.src = 'js/mapa.js';
        scriptMapa.onerror = () => {
            contenedor.textContent = 'No se pudo cargar la sección del mapa.';
        };
        document.body.append(scriptMapa);

        if (window.location.hash === '#sedes') {
            document.getElementById('sedes')?.scrollIntoView();
        }
    } catch (error) {
        console.error('No se pudo cargar la sección del mapa:', error);
        contenedor.textContent = 'No se pudo cargar la sección del mapa.';
    }
}

cargarSeccionMapa();

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
