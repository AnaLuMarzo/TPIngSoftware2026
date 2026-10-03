const URL_CHARLAS = 'data/charlas.json';
const URL_SEDES_CHARLAS = 'data/sedes.json';

function crearDatoCharla(texto) {
    const dato = document.createElement('p');
    dato.className = 'meta';
    dato.textContent = texto;
    return dato;
}

function esCharlaValida(charla) {
    if (!charla || typeof charla !== 'object') return false;
    const camposRequeridos = ['Nombre', 'Tema', 'Aula', 'Fecha', 'Horario', 'Profesor', 'Sede'];
    if (!camposRequeridos.every(campo =>
        typeof charla[campo] === 'string' && charla[campo].trim())) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(charla.Fecha)) return false;
    const fecha = new Date(`${charla.Fecha}T00:00:00`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === charla.Fecha;
}

function crearTarjetaCharla(charla, sedesPorNombre) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'card charla-card';

    const titulo = document.createElement('h3');
    titulo.textContent = charla.Nombre;
    tarjeta.append(titulo);

    const fecha = new Date(`${charla.Fecha}T00:00:00`).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    tarjeta.append(crearDatoCharla(`Fecha: ${fecha} · ${charla.Horario} hs`));

    const sede = sedesPorNombre.get(charla.Sede);
    const ubicacion = sede ? `${sede.nombre} · ${sede.direccion}` : charla.Sede;
    tarjeta.append(crearDatoCharla(`Sede: ${ubicacion}`));
    tarjeta.append(crearDatoCharla(`Aula: ${charla.Aula} · Profesor/a: ${charla.Profesor}`));

    const tema = document.createElement('p');
    tema.className = 'charla-tema';
    tema.textContent = `Tema: ${charla.Tema}`;
    tarjeta.append(tema);

    return tarjeta;
}

async function cargarCharlas() {
    const contenedor = document.getElementById('lista-charlas');
    if (!contenedor) return;

    try {
        const [respuestaCharlas, respuestaSedes] = await Promise.all([
            fetch(URL_CHARLAS),
            fetch(URL_SEDES_CHARLAS)
        ]);
        if (!respuestaCharlas.ok || !respuestaSedes.ok) {
            throw new Error('No se pudieron cargar los datos de charlas y sedes.');
        }

        const [charlas, sedes] = await Promise.all([
            respuestaCharlas.json(),
            respuestaSedes.json()
        ]);
        if (!Array.isArray(charlas) || !Array.isArray(sedes)) {
            throw new Error('Los archivos de datos no contienen listas válidas.');
        }
        const sedesValidas = sedes.filter(esSedeValida);
        const sedesPorNombre = new Map(sedesValidas.map(sede => [sede.nombre, sede]));
        const charlasValidas = charlas.filter(esCharlaValida);
        const limiteConfigurado = Number(contenedor.dataset.limite);
        const limite = Number.isInteger(limiteConfigurado) && limiteConfigurado > 0
            ? limiteConfigurado
            : charlasValidas.length;

        charlasValidas.slice(0, limite).forEach(charla => {
            contenedor.append(crearTarjetaCharla(charla, sedesPorNombre));
        });

        if (charlasValidas.length === 0) {
            contenedor.textContent = charlas.length === 0
                ? 'No hay charlas disponibles.'
                : 'No hay charlas válidas para mostrar.';
        } else if (charlasValidas.length < charlas.length) {
            const aviso = document.createElement('p');
            aviso.className = 'data-warning';
            aviso.textContent = 'Algunas charlas no se muestran porque sus datos están incompletos o son inválidos.';
            contenedor.append(aviso);
        }
    } catch (error) {
        console.error('Error al cargar las charlas:', error);
        contenedor.textContent = 'No se pudieron cargar las charlas. Intentalo nuevamente más tarde.';
    }
}

cargarCharlas();
