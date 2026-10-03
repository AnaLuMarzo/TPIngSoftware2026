const RUTA_CHARLAS = 'data/charlas.json';
const RUTA_SEDES = 'data/sedes.json';

async function obtenerJSON(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta} (HTTP ${respuesta.status}).`);
    return respuesta.json();
}

function obtenerCharlas() {
    return obtenerJSON(RUTA_CHARLAS);
}

function obtenerSedes() {
    return obtenerJSON(RUTA_SEDES);
}