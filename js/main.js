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

let marcadorPrueba = null;

/**
 * Dado un resultado de USIG y datos de la sede, se agrega un marcador al mapa.
 *
 * @param {object} result - Resultado de `normalizarDireccion()`.
 * @param {string} nombre - Nombre a mostrar (la sede, o "Prueba").
 * @param {string} direccion - Dirección original enviada a la API.
 * @param {string} extra - Texto opcional adicional (referencia).
 * @param {boolean} [esPrueba=false] - Si es un marcador emergente (para pruebas).
 */
function agregarMarcador(result, nombre, direccion, extra = '', esPrueba = false) {
    const html =
        `<strong>${nombre}</strong><br>` +
        `Enviada: ${direccion}<br>` +
        `Normalizada: ${result.direccionNormalizada}<br>` +
        (extra ? `<em>${extra}</em><br>` : '') +
        `<code>lat: ${result.lat} &nbsp; lng: ${result.lng}</code>`;

    const marker = L.marker([result.lat, result.lng])
        .addTo(mapa)
        .bindPopup(html);

    if (esPrueba) {
        if (marcadorPrueba) mapa.removeLayer(marcadorPrueba);
        marcadorPrueba = marker;
        marker.openPopup(); // las pruebas en vivo sí abren el popup
    }
    return marker;
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
        agregarMarcador(result, sede.nombre, sede.direccion, sede.referencia || '');
    });

    await Promise.all(promises);

    // Encuadra el mapa en todos los marcadores colocados.
    const bounds = mapa.getBounds();
    if (bounds.isValid()) {
        mapa.fitBounds(bounds.pad(0.2));
    }
}

/**
 * Prueba en vivo: toma la dirección escrita por el usuario, la envía a USIG
 * y muestra el resultado en el mapa (permite verificar que la geocodificación
 * se resuelve dinámicamente en cada llamada).
 */
async function probarDireccion(direccion) {
    const btn = document.getElementById('btn-probar-direccion');
    const info = document.getElementById('info-probar-direccion');
    btn.disabled = true;
    info.textContent = 'Consultando a USIG…';

    try {
        const result = await normalizarDireccion(direccion);
        if (!result) {
            info.textContent = 'USIG no encontró la dirección. Revisá el formato (calle altura, partido).';
            return;
        }
        agregarMarcador(result, 'Prueba de dirección', direccion, '', true);
        mapa.setView([result.lat, result.lng], 16);
        info.textContent = `OK — ubicada en lat: ${result.lat}, lng: ${result.lng}`;
    } finally {
        btn.disabled = false;
    }
}

function initPruebaDireccion() {
    const input = document.getElementById('input-prueba-direccion');
    const btn = document.getElementById('btn-probar-direccion');
    if (!input || !btn) return;

    const submit = (e) => {
        if (e) e.preventDefault();
        const direccion = input.value.trim();
        if (direccion) probarDireccion(direccion);
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(e); });
}

cargarSedes();
initPruebaDireccion();

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
