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