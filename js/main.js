// ===== Mapa con las sedes (Leaflet + OpenStreetMap) =====
const mapa = L.map('mapa').setView([-34.6037, -58.3816], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

const sedes = [
    { nombre: 'Centro Cultural', direccion: 'Av. Siempreviva 742', coords: [-34.5986, -58.4067] },
    { nombre: 'Club Atlético', direccion: 'Calle Falsa 123', coords: [-34.6118, -58.3692] },
    { nombre: 'Palacio Electoral', direccion: 'Plaza Mayor 1', coords: [-34.6070, -58.4110] }
];

sedes.forEach(sede => {
    L.marker(sede.coords).addTo(mapa)
        .bindPopup(`<strong>${sede.nombre}</strong><br>${sede.direccion}`);
});

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
