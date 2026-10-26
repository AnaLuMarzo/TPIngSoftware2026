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

function obtenerPeriodoInscripcion(charlas) {
    if (!Array.isArray(charlas) || charlas.length === 0) return { apertura: null, cierre: null };

    let fechaApertura = null;
    let fechaCierre = null;

    for (const charla of charlas) {
        if (!charla || typeof charla.Fecha !== 'string' || typeof charla.Horario !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(charla.Fecha) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(charla.Horario)) continue;

        const fechaHora = `${charla.Fecha}T${charla.Horario}:00`;
        const date = new Date(fechaHora);
        if (Number.isNaN(date.getTime())) continue;

        if (!fechaApertura || fechaHora < fechaApertura) fechaApertura = fechaHora;
        if (!fechaCierre || fechaHora > fechaCierre) fechaCierre = fechaHora;
    }

    return {
        apertura: fechaApertura ? new Date(fechaApertura) : null,
        cierre: fechaCierre ? new Date(fechaCierre) : null
    };
}

function estaInscripcionAbierta(periodo) {
    if (!periodo || !(periodo.apertura instanceof Date) || !(periodo.cierre instanceof Date)) return false;
    if (Number.isNaN(periodo.apertura.getTime()) || Number.isNaN(periodo.cierre.getTime())) return false;

    const ahora = Date.now();
    return ahora >= periodo.apertura.getTime() && ahora < periodo.cierre.getTime();
}

function esTelefonoValido(telefono) {
    if (typeof telefono !== 'string') return false;
    return telefono.replace(/\D/g, '').length >= 8;
}

function esNombreValido(nombre) {
    if (typeof nombre !== 'string') return false;
    return /^[\p{L} ]+$/u.test(nombre.normalize('NFC').trim());
}

function esDniValido(dni) {
    return typeof dni === 'string' && /^\d{8,9}$/.test(dni);
}

function esFechaNacimientoValida(fechaNacimiento) {
    return typeof fechaNacimiento === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) &&
        fechaNacimiento <= '2010-12-31';
}