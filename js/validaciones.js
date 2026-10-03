const URL_USIG = 'https://servicios.usig.buenosaires.gob.ar/normalizar/';

async function normalizarDireccion(direccion) {
    const parametros = new URLSearchParams({
        direccion: direccion.trim(),
        geocodificar: 'TRUE'
    });
    const respuesta = await fetch(`${URL_USIG}?${parametros.toString()}`);
    if (!respuesta.ok) {
        console.warn('USIG devolvió un error', respuesta.status, direccion);
        return null;
    }

    const datosRespuesta = await respuesta.json();
    const direccionEncontrada = datosRespuesta?.direccionesNormalizadas?.[0];
    if (!direccionEncontrada || !direccionEncontrada.coordenadas) {
        console.warn('USIG no devolvió resultados para:', direccion);
        return null;
    }

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
            : direccion.trim()
    };
}

async function esDireccionValida(direccion) {
    if (typeof direccion !== 'string' || !direccion.trim()) return false;
    return Boolean(await normalizarDireccion(direccion));
}

function esSedeValida(sede) {
    if (!sede) return false;
    if (typeof sede.nombre !== 'string' || !sede.nombre.trim()) return false;
    if (typeof sede.direccion !== 'string' || !sede.direccion.trim()) return false;
    return true;
}

function obtenerFechaHoraLimiteInscripcion(charlas) {
    if (!Array.isArray(charlas)) return null;

    let fechaHoraLimite = null;
    for (const charla of charlas) {
        if (!charla || typeof charla.Fecha !== 'string' || typeof charla.Horario !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(charla.Fecha) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(charla.Horario)) continue;

        const fechaHora = `${charla.Fecha}T${charla.Horario}:00`;
        if (Number.isNaN(new Date(fechaHora).getTime())) continue;
        if (!fechaHoraLimite || fechaHora > fechaHoraLimite) fechaHoraLimite = fechaHora;
    }

    return fechaHoraLimite ? new Date(fechaHoraLimite) : null;
}

function estaInscripcionAbierta(fechaHoraLimite) {
    return fechaHoraLimite instanceof Date &&
        !Number.isNaN(fechaHoraLimite.getTime()) &&
        Date.now() < fechaHoraLimite.getTime();
}

function esTelefonoValido(telefono) {
    if (typeof telefono !== 'string') return false;
    return telefono.replace(/\D/g, '').length >= 8;
}

function esDniValido(dni) {
    return typeof dni === 'string' && /^\d{8,9}$/.test(dni);
}

function esFechaNacimientoValida(fechaNacimiento) {
    return typeof fechaNacimiento === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) &&
        fechaNacimiento <= '2010-12-31';
}