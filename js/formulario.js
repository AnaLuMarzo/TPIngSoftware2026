const formulario = document.getElementById('form-inscripcion');
let periodoInscripcion = null;
let textoAperturaInscripciones = '';
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

function actualizarEstadoInscripciones() {
    if (!periodoInscripcion || !formulario) return;

    const ahora = Date.now();
    if (ahora >= periodoInscripcion.cierre.getTime()) {
        cerrarInscripciones();
        return;
    }

    if (ahora < periodoInscripcion.apertura.getTime()) {
        if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = true;
        const estado = document.getElementById('estado-inscripcion');
        if (estado) estado.textContent = `La inscripción abrirá el ${textoAperturaInscripciones}.`;
        window.setTimeout(
            actualizarEstadoInscripciones,
            Math.min(periodoInscripcion.apertura.getTime() - ahora, 60_000)
        );
        return;
    }

    if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = false;
    const tiempoRestante = periodoInscripcion.cierre.getTime() - ahora;
    window.setTimeout(actualizarEstadoInscripciones, Math.min(tiempoRestante, 60_000));
}

async function cargarPeriodoInscripciones() {
    const avisoPeriodo = document.getElementById('periodo-inscripcion');

    try {
        const charlas = await obtenerCharlas();
        if (!Array.isArray(charlas)) throw new Error('La lista de charlas no es válida.');

        periodoInscripcion = obtenerPeriodoInscripcion(charlas);
        if (!periodoInscripcion) throw new Error('No hay charlas con fecha y horario válidos.');
        const formatearFechaHora = fechaHora => {
            const fechaFormateada = fechaHora.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const horaFormateada = fechaHora.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `${fechaFormateada} a las ${horaFormateada}`;
        };
        textoAperturaInscripciones = formatearFechaHora(periodoInscripcion.apertura);
        textoCierreInscripciones = formatearFechaHora(periodoInscripcion.cierre);
        if (avisoPeriodo) {
            avisoPeriodo.textContent = `El registro estará abierto desde el ${textoAperturaInscripciones} hasta el ${textoCierreInscripciones}.`;
        }

        actualizarEstadoInscripciones();
    } catch (error) {
        console.error('No se pudo determinar el período de inscripciones:', error);
        if (avisoPeriodo) avisoPeriodo.textContent = 'No se pudo verificar el período de inscripción; las inscripciones no están disponibles.';
        const estado = document.getElementById('estado-inscripcion');
        if (estado) {
            estado.textContent = 'No se pudo verificar el período de inscripción. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
    }
}

if (formulario) cargarPeriodoInscripciones();

if (formulario) formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const estado = document.getElementById('estado-inscripcion');

    if (!periodoInscripcion) {
        if (estado) {
            estado.textContent = 'No se pudo verificar el período de inscripción. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
        return;
    }
    if (!estaInscripcionAbierta(periodoInscripcion)) {
        actualizarEstadoInscripciones();
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
        botonEnviarInscripcion.disabled = true;
        if (estado) estado.textContent = 'Verificando la dirección...';

        try {
            const direccionValida = await esDireccionValida(direccion.value);
            if (!estaInscripcionAbierta(periodoInscripcion)) {
                actualizarEstadoInscripciones();
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
            if (estaInscripcionAbierta(periodoInscripcion)) {
                botonEnviarInscripcion.disabled = false;
            }
        }
    }

    botonEnviarInscripcion.disabled = true;
    if (estado) estado.textContent = 'Guardando la inscripción...';

    try {
        const datos = Object.fromEntries(new FormData(formulario).entries());
        let respuesta;
        try {
            respuesta = await fetch('/api/postulantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor de inscripciones. Iniciá la aplicación con "node server.js" y abrí http://127.0.0.1:8080/main.html.');
        }

        if (!respuesta.headers.get('content-type')?.includes('application/json')) {
            throw new Error('El servidor no admite guardar inscripciones. Iniciá la aplicación con "node server.js" y abrí http://127.0.0.1:8080/main.html (no uses Live Server).');
        }

        let resultado;
        try {
            resultado = await respuesta.json();
        } catch {
            throw new Error('El servidor devolvió una respuesta inválida. Verificá que esté iniciado con "node server.js".');
        }
        if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar la inscripción.');

        if (estado) {
            estado.textContent = 'La inscripción se guardó correctamente.';
            estado.className = 'form-status success';
        }
        formulario.reset();
    } catch (error) {
        console.error('No se pudo guardar la inscripción:', error);
        if (estado) {
            estado.textContent = error.message || 'No se pudo guardar la inscripción. Intentá nuevamente.';
            estado.className = 'form-status error';
        }
    } finally {
        if (estaInscripcionAbierta(periodoInscripcion)) {
            botonEnviarInscripcion.disabled = false;
        }
    }
});