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
    if (!Array.isArray(charlas)) return null;

    let apertura = null;
    let cierre = null;
    for (const charla of charlas) {
        if (!charla || typeof charla.Fecha !== 'string' || typeof charla.Horario !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(charla.Fecha) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(charla.Horario)) continue;

        const [anio, mes, dia] = charla.Fecha.split('-').map(Number);
        const [hora, minuto] = charla.Horario.split(':').map(Number);
        const fechaHora = new Date(anio, mes - 1, dia, hora, minuto);
        if (fechaHora.getFullYear() !== anio || fechaHora.getMonth() !== mes - 1 ||
            fechaHora.getDate() !== dia || fechaHora.getHours() !== hora ||
            fechaHora.getMinutes() !== minuto) continue;

        if (!apertura || fechaHora < apertura) apertura = fechaHora;
        if (!cierre || fechaHora > cierre) cierre = fechaHora;
    }

    return apertura && cierre ? { apertura, cierre } : null;
}

function estaInscripcionAbierta(periodo) {
    const ahora = Date.now();
    return periodo &&
        periodo.apertura instanceof Date &&
        periodo.cierre instanceof Date &&
        !Number.isNaN(periodo.apertura.getTime()) &&
        !Number.isNaN(periodo.cierre.getTime()) &&
        ahora >= periodo.apertura.getTime() &&
        ahora < periodo.cierre.getTime();
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