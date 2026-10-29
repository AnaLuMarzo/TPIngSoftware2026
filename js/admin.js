function mostrarPostulantes(filtro = '') {
    const mensajeVacio = document.getElementById('mensaje-vacio-admin');
    const tabla = document.getElementById('tabla-admin');
    const cuerpoTabla = document.getElementById('cuerpo-tabla-admin');
    const contador = document.getElementById('contador-resultados');

    const todos = obtenerPostulantesGuardados();
    const filtroLower = filtro.toLowerCase().trim();
    const filtrados = filtroLower
        ? todos.filter(p => (p.nombre || '').toLowerCase().includes(filtroLower) || (p.dni || '').includes(filtroLower))
        : todos;

    if (todos.length === 0) {
        mensajeVacio.style.display = 'block';
        mensajeVacio.textContent = 'Todavía no hay inscripciones registradas.';
        tabla.style.display = 'none';
        return;
    }

    mensajeVacio.style.display = 'none';
    tabla.style.display = 'table';
    cuerpoTabla.innerHTML = '';

    if (filtrados.length === 0) {
        const fila = document.createElement('tr');
        fila.innerHTML = '<td colspan="5" style="padding:1rem; text-align:center; color:#999;">No se encontraron resultados para "' + filtro + '"</td>';
        cuerpoTabla.appendChild(fila);
        contador.textContent = '0 de ' + todos.length;
        return;
    }

    contador.textContent = filtrados.length + ' de ' + todos.length;

    filtrados.forEach((p) => {
        const fila = document.createElement('tr');
        fila.style.borderBottom = '1px solid #eee';
        fila.innerHTML = `
            <td style="padding:0.5rem;">${p.nombre || ''}</td>
            <td style="padding:0.5rem;">${p.dni || ''}</td>
            <td style="padding:0.5rem;">${p.distrito || ''}</td>
            <td style="padding:0.5rem;">${p.fecha_inscripcion ? new Date(p.fecha_inscripcion).toLocaleString('es-AR') : ''}</td>
            <td style="padding:0.5rem;">
                <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.85rem;" onclick='verDetalle(${JSON.stringify(p)})'>Ver detalle</button>
            </td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

function verDetalle(postulante) {
    const modal = document.getElementById('modal-detalles');
    const contenido = document.getElementById('contenido-modal');

    const campos = [
        ['Nombre y apellido', postulante.nombre],
        ['DNI', postulante.dni],
        ['Fecha de nacimiento', postulante.fecha_nacimiento ? new Date(postulante.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR') : ''],
        ['Dirección', postulante.direccion],
        ['Teléfono', postulante.telefono],
        ['Correo electrónico', postulante.email],
        ['Distrito electoral', postulante.distrito],
        ['Autoridad de mesa previamente', postulante.experiencia],
        ['Capacitación cumplida', postulante.capacitacion],
        ['Afiliado a agrupación', postulante.afiliado],
        ['Partido', postulante.partido],
        ['Fecha de inscripción', postulante.fecha_inscripcion ? new Date(postulante.fecha_inscripcion).toLocaleString('es-AR') : '']
    ];

    contenido.innerHTML = campos.map(([label, valor]) =>
        `<p><strong>${label}:</strong> ${valor || '—'}</p>`
    ).join('');

    modal.style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-detalles').style.display = 'none';
}

// Buscador
document.addEventListener('DOMContentLoaded', () => {
    mostrarPostulantes();

    const buscador = document.getElementById('buscador-admin');
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            mostrarPostulantes(e.target.value);
        });
    }

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModal();
    });
});
