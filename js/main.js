// ===== Constantes =====
const URL_USIG = 'http://servicios.usig.buenosaires.gob.ar/normalizar/';
const URL_SEDES = 'data/sedes.json';

// ===== Inicialización del mapa (Leaflet + OpenStreetMap) =====
const mapa = L.map('mapa').setView([-34.6037, -58.3816], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

/**
 * Normaliza una dirección usando la API de USIG (Gobierno de CABA).
 * https://servicios.usig.buenosaires.gob.ar/normalizar
 *
 * @param {string} direccion - Dirección a normalizar, ej. "cordoba 1538, caba".
 * @returns {Promise<{lat:number, lng:number, direccionNormalizada:string}|null>}
 *          Datos geográficos y la dirección ya normalizada, o null si no hay resultado.
 */
async function normalizarDireccion(direccion) {
    const params = new URLSearchParams({
        direccion: direccion,
        geocodificar: 'TRUE'
    });
    const url = `${URL_USIG}?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        console.warn('USIG devolvió un error', res.status, direccion);
        return null;
    }

    const data = await res.json();

    // USIG devuelve: { direccionesNormalizadas: [ { direccion, coordenadas: {x, y}, ... } ] }
    const r = data?.direccionesNormalizadas?.[0];
    if (!r || !r.coordenadas) {
        console.warn('USIG no devolvió resultados para:', direccion);
        return null;
    }

    // coordenadas.x = longitud (lng), coordenadas.y = latitud (lat) — vienen como string
    const lng = parseFloat(r.coordenadas.x);
    const lat = parseFloat(r.coordenadas.y);
    if (Number.isNaN(lng) || Number.isNaN(lat)) {
        console.warn('Coordenadas inválidas en la respuesta de USIG:', r);
        return null;
    }

    return { lat, lng, direccionNormalizada: r.direccion };
}

/**
 * Sedes ya geocodificadas y colocadas en el mapa.
 * Cada entrada: { lat, lng, nombre, direccionNormalizada, marker }
 * Se usa para comparar contra las búsquedas del usuario.
 */
const Sedes = [];

/**
 * Dado un resultado de USIG y datos de la sede, se agrega un marcador al mapa.
 *
 * @param {object} result - Resultado de `normalizarDireccion()`.
 * @param {string} nombre - Nombre de la sede.
 * @param {string} extra - Texto opcional adicional (referencia).
 */
function agregarMarcador(result, nombre, extra = '') {
    const html =
        `<strong>${nombre}</strong><br>` +
        result.direccionNormalizada + '<br>' +
        (extra ? `<em>${extra}</em>` : '');

    return L.marker([result.lat, result.lng])
        .addTo(mapa)
        .bindPopup(html);
}

/**
 * Esto carga el JSON de sedes y, para cada una, consume la API USIG para ubicarla en el mapa.
 */
async function cargarSedes() {
    let sedes;
    try {
        const res = await fetch(URL_SEDES);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        sedes = await res.json();
    } catch (err) {
        console.error('No se pudo cargar', URL_SEDES, err);
        alert('No se pudo cargar la lista de sedes. Verificá que estés ejecutando la aplicación ' +
              'desde un servidor local (ej. `python -m http.server 8080`).');
        return;
    }

    const promises = sedes.map(async (sede) => {
        const result = await normalizarDireccion(sede.direccion);
        if (!result) {
            console.warn('No se pudo geocodificar la sede:', sede);
            return;
        }
        const marker = agregarMarcador(result, sede.nombre, sede.referencia || '');
        Sedes.push({
            lat: result.lat,
            lng: result.lng,
            nombre: sede.nombre,
            direccionNormalizada: result.direccionNormalizada,
            marker,
        });
    });

    await Promise.all(promises);

    // Encuadra el mapa en todos los marcadores colocados.
    const bounds = mapa.getBounds();
    if (bounds.isValid()) {
        mapa.fitBounds(bounds.pad(0.2));
    }
}

/**
 * Normaliza un texto para comparar de forma insensible a mayúsculas/espacios.
 */
function normalizarTexto(s) {
    return (s || '').trim().toUpperCase();
}

/**
 * Buscador de sedes: toma la dirección escrita por el usuario, la envía al
 * servicio de normalización de direcciones y, si corresponde a una de las
 * sedes registradas, resalta su marcador en el mapa.
 * Si la dirección existe pero no es una sede, no se agrega ningún marcador
 * ni se mueve el mapa; solo se notifica al usuario.
 */
async function buscarDireccion(direccion) {
    const btn = document.getElementById('btn-buscar-sede');
    const info = document.getElementById('info-buscar-sede');
    btn.disabled = true;
    info.textContent = 'Buscando la ubicación…';

    try {
        const result = await normalizarDireccion(direccion);
        if (!result) {
            info.textContent = 'No encontramos esa dirección. Probá escribir, por ejemplo: "cordoba 1538, caba".';
            return;
        }

        // Buscar si la dirección normalizada coincide con alguna sede registrada.
        const sede = Sedes.find(s =>
            normalizarTexto(s.direccionNormalizada) === normalizarTexto(result.direccionNormalizada));

        if (!sede) {
            info.textContent = 'No es una Sede.';
            return;
        }

        // Resaltar el marcador de la sede encontrada (ya existe en el mapa).
        mapa.setView([sede.lat, sede.lng], 15);
        sede.marker.openPopup();
        info.textContent = `Sede encontrada: ${sede.nombre}`;
    } finally {
        btn.disabled = false;
    }
}

function initBuscador() {
    const input = document.getElementById('input-buscar-sede');
    const btn = document.getElementById('btn-buscar-sede');
    if (!input || !btn) return;

    const submit = (e) => {
        if (e) e.preventDefault();
        const direccion = input.value.trim();
        if (direccion) buscarDireccion(direccion);
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(e); });
}

cargarSedes();
initBuscador();

// ===== Formulario de inscripción =====
const form = document.getElementById('form-inscripcion');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Recopilar datos del formulario
    const postulante = Object.fromEntries(new FormData(form).entries());

    // TODO: enviar los datos al backend (fetch a la API de inscripción)
    console.log('Postulante:', postulante);

    alert('¡Gracias! Tu inscripción fue registrada correctamente.');
    form.reset();
});
