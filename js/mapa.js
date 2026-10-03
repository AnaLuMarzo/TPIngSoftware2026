const URL_USIG = 'https://servicios.usig.buenosaires.gob.ar/normalizar/';
const URL_SEDES = 'data/sedes.json';

const elementoMapa = document.getElementById('mapa');
let mapa = null;
if (elementoMapa && window.L) {
    mapa = L.map(elementoMapa).setView([-34.6037, -58.3816], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapa);
}

async function normalizarDireccion(direccion) {
    const parametros = new URLSearchParams({ direccion, geocodificar: 'TRUE' });
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
            : direccion
    };
}

const sedesGeolocalizadas = [];

function agregarMarcador(ubicacion, nombre, referencia = '') {
    const contenidoPopup = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = nombre;
    contenidoPopup.append(titulo, document.createElement('br'), ubicacion.direccionNormalizada);
    if (referencia) {
        contenidoPopup.append(document.createElement('br'));
        const textoReferencia = document.createElement('em');
        textoReferencia.textContent = referencia;
        contenidoPopup.append(textoReferencia);
    }

    return L.marker([ubicacion.latitud, ubicacion.longitud])
        .addTo(mapa)
        .bindPopup(contenidoPopup);
}

async function cargarSedes() {
    const estado = document.getElementById('info-sedes');
    if (!mapa) {
        if (estado) estado.textContent = 'El mapa no está disponible en este momento.';
        return;
    }

    let sedes;
    try {
        const respuesta = await fetch(URL_SEDES);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        sedes = await respuesta.json();
        if (!Array.isArray(sedes)) throw new Error('El archivo de sedes no contiene una lista válida.');
    } catch (error) {
        console.error('No se pudo cargar', URL_SEDES, error);
        if (estado) estado.textContent = 'No se pudo cargar la lista de sedes. Verificá la conexión e intentá nuevamente.';
        return;
    }

    const sedesValidas = sedes.filter(esSedeValida);
    if (sedesValidas.length === 0) {
        if (estado) estado.textContent = 'No hay sedes válidas disponibles para mostrar.';
        return;
    }

    const tareasGeocodificacion = sedesValidas.map(async (sede) => {
        let ubicacion;
        try {
            ubicacion = await normalizarDireccion(sede.direccion.trim());
        } catch (error) {
            console.warn('Falló la búsqueda de la dirección de una sede:', error);
            return;
        }
        if (!ubicacion) {
            console.warn('No se pudo geocodificar la sede:', sede);
            return;
        }
        const marcador = agregarMarcador(ubicacion, sede.nombre, sede.referencia || '');
        sedesGeolocalizadas.push({
            latitud: ubicacion.latitud,
            longitud: ubicacion.longitud,
            nombre: sede.nombre,
            direccionNormalizada: ubicacion.direccionNormalizada,
            marcador,
        });
    });

    await Promise.all(tareasGeocodificacion);

    if (sedesGeolocalizadas.length === 0) {
        if (estado) estado.textContent = 'No se pudieron ubicar las sedes. Revisá la conexión e intentá más tarde.';
        return;
    }
    if (estado) estado.textContent = `Se muestran ${sedesGeolocalizadas.length} de ${sedesValidas.length} sedes.`;

    const bounds = mapa.getBounds();
    if (bounds.isValid()) mapa.fitBounds(bounds.pad(0.2));
}

function normalizarTexto(texto) {
    return (texto || '').trim().toUpperCase();
}

async function buscarDireccion(direccion) {
    const botonBuscar = document.getElementById('btn-buscar-sede');
    const estadoBusqueda = document.getElementById('info-buscar-sede');
    if (!botonBuscar || !estadoBusqueda) return;
    if (!direccion.trim()) {
        estadoBusqueda.textContent = 'Ingresá una dirección para realizar la búsqueda.';
        return;
    }
    if (!mapa) {
        estadoBusqueda.textContent = 'El mapa no está disponible en este momento.';
        return;
    }
    botonBuscar.disabled = true;
    estadoBusqueda.textContent = 'Buscando la ubicación…';

    try {
        const ubicacion = await normalizarDireccion(direccion);
        if (!ubicacion) {
            estadoBusqueda.textContent = 'No encontramos esa dirección. Probá escribir, por ejemplo: "cordoba 1538, caba".';
            return;
        }

        const sede = sedesGeolocalizadas.find(sedeRegistrada =>
            normalizarTexto(sedeRegistrada.direccionNormalizada) === normalizarTexto(ubicacion.direccionNormalizada));
        if (!sede) {
            estadoBusqueda.textContent = 'No es una Sede.';
            return;
        }

        mapa.setView([sede.latitud, sede.longitud], 15);
        sede.marcador.openPopup();
        estadoBusqueda.textContent = `Sede encontrada: ${sede.nombre}`;
    } catch (error) {
        console.error('No se pudo buscar la dirección:', error);
        estadoBusqueda.textContent = 'No se pudo completar la búsqueda. Verificá tu conexión e intentá nuevamente.';
    } finally {
        botonBuscar.disabled = false;
    }
}

function inicializarBuscador() {
    const input = document.getElementById('input-buscar-sede');
    const botonBuscar = document.getElementById('btn-buscar-sede');
    if (!input || !botonBuscar) return;

    const enviarBusqueda = (evento) => {
        if (evento) evento.preventDefault();
        buscarDireccion(input.value.trim());
    };

    botonBuscar.addEventListener('click', enviarBusqueda);
    input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') enviarBusqueda(evento);
    });
}

cargarSedes();
inicializarBuscador();