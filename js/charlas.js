const URL_CHARLAS = 'data/charlas.json';
const URL_SEDES_CHARLAS = 'data/sedes.json';

function crearDatoCharla(texto) {
    const elemento = document.createElement('p');
    elemento.className = 'meta';
    elemento.textContent = texto;
    return elemento;
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
        const sedesPorNombre = new Map(sedes.map(sede => [sede.nombre, sede]));
        const limite = Number(contenedor.dataset.limite) || charlas.length;

        charlas.slice(0, limite).forEach(charla => {
            contenedor.append(crearTarjetaCharla(charla, sedesPorNombre));
        });

        if (charlas.length === 0) {
            contenedor.textContent = 'No hay charlas disponibles.';
        }
    } catch (error) {
        console.error('Error al cargar las charlas:', error);
        contenedor.textContent = 'No se pudieron cargar las charlas. Intentalo nuevamente más tarde.';
    }
}

cargarCharlas();
