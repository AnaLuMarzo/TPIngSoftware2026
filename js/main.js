async function cargarSeccion(contenedorId, rutaHtml, rutaScript, seccionId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    try {
        const respuesta = await fetch(rutaHtml, { cache: 'no-cache' });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        contenedor.innerHTML = await respuesta.text();

        const scriptSeccion = document.createElement('script');
        scriptSeccion.src = rutaScript;
        scriptSeccion.onerror = () => {
            contenedor.textContent = 'No se pudo cargar esta sección.';
        };
        document.body.append(scriptSeccion);

        if (window.location.hash === `#${seccionId}`) {
            document.getElementById(seccionId)?.scrollIntoView();
        }
    } catch (error) {
        console.error(`No se pudo cargar la sección ${seccionId}:`, error);
        contenedor.textContent = 'No se pudo cargar esta sección.';
    }
}

cargarSeccion('contenedor-formulario', 'formulario.html', 'js/formulario.js', 'inscripcion');
cargarSeccion('contenedor-mapa', 'mapa.html', 'js/mapa.js', 'sedes');
