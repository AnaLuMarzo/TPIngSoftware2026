// ===== Constantes =====
// La API de USIG acepta HTTPS (verificado), y es la forma más compatible:
// los routers de ISPs argentinas (Flow, Fiberhome, Telecom, etc.) suelen
// forzar el upgrade HTTP->HTTPS ("HTTPS-Only Mode") que puede romper peticiones
// a servidores que hablan solo HTTP. Con HTTPS directo se evita ese conflicto.
const URL_USIG = 'https://servicios.usig.buenosaires.gob.ar/normalizar/';
const URL_SEDES = 'data/sedes.json';

// ===== Inicialización del mapa (Leaflet + OpenStreetMap) =====
const elementoMapa = document.getElementById('mapa');
let mapa = null;
if (elementoMapa && window.L) {
    mapa = L.map(elementoMapa).setView([-34.6037, -58.3816], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapa);
}

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
    if (!Number.isFinite(lng) || !Number.isFinite(lat) ||
        lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        console.warn('Coordenadas inválidas en la respuesta de USIG:', r);
        return null;
    }

    return {
        lat,
        lng,
        direccionNormalizada: typeof r.direccion === 'string' ? r.direccion : direccion
    };
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
    const popup = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = nombre;
    popup.append(titulo, document.createElement('br'), result.direccionNormalizada);
    if (extra) {
        popup.append(document.createElement('br'));
        const referencia = document.createElement('em');
        referencia.textContent = extra;
        popup.append(referencia);
    }

    return L.marker([result.lat, result.lng])
        .addTo(mapa)
        .bindPopup(popup);
}

/**
 * Esto carga el JSON de sedes y, para cada una, consume la API USIG para ubicarla en el mapa.
 */
async function cargarSedes() {
    const estado = document.getElementById('info-sedes');
    if (!mapa) {
        if (estado) estado.textContent = 'El mapa no está disponible en este momento.';
        return;
    }

    let sedes;
    try {
        const res = await fetch(URL_SEDES);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        sedes = await res.json();
        if (!Array.isArray(sedes)) throw new Error('El archivo de sedes no contiene una lista válida.');
    } catch (err) {
        console.error('No se pudo cargar', URL_SEDES, err);
        if (estado) estado.textContent = 'No se pudo cargar la lista de sedes. Verificá la conexión e intentá nuevamente.';
        return;
    }

    const sedesValidas = sedes.filter(sede =>
        sede && typeof sede.nombre === 'string' && sede.nombre.trim() &&
        typeof sede.direccion === 'string' && sede.direccion.trim());
    if (sedesValidas.length === 0) {
        if (estado) estado.textContent = 'No hay sedes válidas disponibles para mostrar.';
        return;
    }

    const promises = sedesValidas.map(async (sede) => {
        let result;
        try {
            result = await normalizarDireccion(sede.direccion.trim());
        } catch (err) {
            console.warn('Falló la búsqueda de la dirección de una sede:', err);
            return;
        }
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

    if (Sedes.length === 0) {
        if (estado) estado.textContent = 'No se pudieron ubicar las sedes. Revisá la conexión e intentá más tarde.';
        return;
    }
    if (estado) estado.textContent = `Se muestran ${Sedes.length} de ${sedesValidas.length} sedes.`;

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
    if (!btn || !info) return;
    if (!direccion.trim()) {
        info.textContent = 'Ingresá una dirección para realizar la búsqueda.';
        return;
    }
    if (!mapa) {
        info.textContent = 'El mapa no está disponible en este momento.';
        return;
    }
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
    } catch (err) {
        console.error('No se pudo buscar la dirección:', err);
        info.textContent = 'No se pudo completar la búsqueda. Verificá tu conexión e intentá nuevamente.';
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
        buscarDireccion(direccion);
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(e); });
}

cargarSedes();
initBuscador();

// ===== Formulario de inscripción =====
const form = document.getElementById('form-inscripcion');

if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const estado = document.getElementById('estado-inscripcion');
    const camposTexto = form.querySelectorAll('input[required]:not([type="email"]), select[required]');
    camposTexto.forEach(campo => {
        campo.setCustomValidity(campo.value.trim() ? '' : 'Completá este campo.');
    });
    const fechaNacimiento = form.elements.fecha_nacimiento;
    if (fechaNacimiento) {
        const fechaLimite = '2010-12-31';
        const fechaFueraDeRango = fechaNacimiento.value && fechaNacimiento.value > fechaLimite;
        fechaNacimiento.setCustomValidity(fechaFueraDeRango
            ? 'La fecha de nacimiento debe ser igual o anterior al 31/12/2010.'
            : '');
    }
    const telefono = form.elements.telefono;
    if (telefono) {
        const cantidadDigitos = telefono.value.replace(/\D/g, '').length;
        telefono.setCustomValidity(telefono.value.trim() && cantidadDigitos < 8
            ? 'El teléfono debe tener al menos 8 números.'
            : '');
    }
    const email = form.elements.email;
    if (email) {
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
        email.setCustomValidity(emailValido ? '' : 'Ingresá un correo electrónico válido.');
    }

    if (!form.checkValidity()) {
        if (estado) {
            estado.textContent = 'Revisá los campos obligatorios, que el teléfono tenga al menos 8 números, el formato del correo y la fecha de nacimiento (hasta el 31/12/2010).';
            estado.className = 'form-status error';
        }
        form.reportValidity();
        return;
    }

    // El prototipo no cuenta con un backend: no se afirma que los datos se hayan guardado.
    if (estado) {
        estado.textContent = 'Los datos son válidos. Esta demostración no envía ni guarda la inscripción.';
        estado.className = 'form-status success';
    }
    form.reset();
});
