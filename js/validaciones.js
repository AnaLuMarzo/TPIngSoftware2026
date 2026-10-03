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