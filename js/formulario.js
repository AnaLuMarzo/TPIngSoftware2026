const URL_CHARLAS_CIERRE = 'data/charlas.json';
const formulario = document.getElementById('form-inscripcion');
let fechaHoraCierreInscripciones = null;
let textoCierreInscripciones = '';
const botonEnviarInscripcion = formulario?.querySelector('button[type="submit"]');

if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = true;

function cerrarInscripciones() {
    if (!formulario) return;

    formulario.querySelectorAll('input, select, button').forEach(control => {
        control.disabled = true;
    });

    const estado = document.getElementById('estado-inscripcion');
    if (estado) {
        estado.textContent = `El período de inscripción cerró el ${textoCierreInscripciones}.`;
        estado.className = 'form-status error';
    }
}

function actualizarEstadoCierreInscripciones() {
    if (!fechaHoraCierreInscripciones || !formulario) return;

    if (!estaInscripcionAbierta(fechaHoraCierreInscripciones)) {
        cerrarInscripciones();
        return;
    }

    const tiempoRestante = fechaHoraCierreInscripciones.getTime() - Date.now();
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

        fechaHoraCierreInscripciones = obtenerFechaHoraLimiteInscripcion(charlas);
        if (!fechaHoraCierreInscripciones) throw new Error('No hay charlas con fecha y horario válidos.');
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

if (formulario) cargarCierreInscripciones();

if (formulario) formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const estado = document.getElementById('estado-inscripcion');

    if (!fechaHoraCierreInscripciones) {
        if (estado) {
            estado.textContent = 'No se pudo verificar el horario de cierre. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
        return;
    }
    if (!estaInscripcionAbierta(fechaHoraCierreInscripciones)) {
        cerrarInscripciones();
        return;
    }

    const camposTexto = formulario.querySelectorAll('input[required]:not([type="email"]), select[required]');
    camposTexto.forEach(campo => {
        campo.setCustomValidity(campo.value.trim() ? '' : 'Completá este campo.');
    });
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
            estado.textContent = 'Revisá los campos obligatorios, el DNI (8 o 9 números), el teléfono (al menos 8 números), el formato del correo y la fecha de nacimiento (hasta el 31/12/2010).';
            estado.className = 'form-status error';
        }
        formulario.reportValidity();
        return;
    }

    const direccion = formulario.elements.direccion;
    if (direccion) {
        botonEnviarInscripcion.disabled = true;
        if (estado) estado.textContent = 'Verificando la dirección...';

        try {
            const direccionValida = await esDireccionValida(direccion.value);
            if (!estaInscripcionAbierta(fechaHoraCierreInscripciones)) {
                cerrarInscripciones();
                return;
            }
            if (!direccionValida) {
                direccion.setCustomValidity('Ingresá una dirección que se pueda encontrar.');
                if (estado) {
                    estado.textContent = 'No se encontró la dirección. Revisá la calle y la altura.';
                    estado.className = 'form-status error';
                }
                formulario.reportValidity();
                return;
            }
        } catch (error) {
            console.error('No se pudo verificar la dirección:', error);
            direccion.setCustomValidity('No se pudo verificar la dirección. Revisá tu conexión e intentá nuevamente.');
            if (estado) {
                estado.textContent = 'No se pudo verificar la dirección. Revisá tu conexión e intentá nuevamente.';
                estado.className = 'form-status error';
            }
            formulario.reportValidity();
            return;
        } finally {
            if (estaInscripcionAbierta(fechaHoraCierreInscripciones)) {
                botonEnviarInscripcion.disabled = false;
            }
        }
    }

    if (estado) {
        estado.textContent = 'Los datos son válidos. Esta demostración no envía ni guarda la inscripción.';
        estado.className = 'form-status success';
    }
    formulario.reset();
});