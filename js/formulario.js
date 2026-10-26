const formulario = document.getElementById('form-inscripcion');
let periodoInscripcion = { apertura: null, cierre: null };
let textoAperturaInscripciones = '';
let textoCierreInscripciones = '';
const botonEnviarInscripcion = formulario?.querySelector('button[type="submit"]');

if (botonEnviarInscripcion) botonEnviarInscripcion.disabled = true;

function cerrarInscripciones(motivo) {
    if (!formulario) return;

    formulario.querySelectorAll('input, select, button').forEach(control => {
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
        botonEnviarInscripcion.disabled = true;
        if (estado) estado.textContent = 'Verificando la dirección...';

        try {
            const direccionValida = await esDireccionValida(direccion.value);
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

    // Construir objeto del postulante
    const postulante = {
        nombre: formulario.elements.nombre.value.trim(),
        dni: formulario.elements.dni.value.trim(),
        fecha_nacimiento: formulario.elements.fecha_nacimiento.value,
        direccion: formulario.elements.direccion.value.trim(),
        telefono: formulario.elements.telefono.value.trim(),
        email: formulario.elements.email.value.trim(),
        distrito: formulario.elements.distrito.value,
        experiencia: formulario.elements.experiencia.value,
        capacitacion: formulario.elements.capacitacion.value,
        afiliado: formulario.elements.afiliado.value,
        partido: formulario.elements.partido?.value.trim() || ''
    };

    botonEnviarInscripcion.disabled = true;
    if (estado) estado.textContent = 'Enviando inscripción...';

    try {
        const respuesta = await fetch('/api/postulantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postulante)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.error || 'Error al guardar la inscripción.');
        }

        if (estado) {
            estado.textContent = `¡Inscripción registrada! Tu DNI ${postulante.dni} fue guardado correctamente.`;
            estado.className = 'form-status success';
        }
        formulario.reset();

    } catch (error) {
        console.error('Error al enviar inscripción:', error);
        if (estado) {
            estado.textContent = error.message || 'No se pudo conectar con el servidor. Intentá nuevamente más tarde.';
            estado.className = 'form-status error';
        }
    } finally {
        if (estaInscripcionAbierta(periodoInscripcion)) {
            botonEnviarInscripcion.disabled = false;
        }
    }
});