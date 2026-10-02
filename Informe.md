# Informe técnico 

## 1. Resumen

El prototipo permite consultar charlas de orientación e inscribirse como postulante a autoridad
de mesa. La página principal presenta tres charlas; el botón **"Ver más charlas"** abre otra
página con las 15 actividades y sus datos: tema, fecha, horario, profesor, aula y sede.

Las charlas y las sedes están guardadas en archivos de datos del proyecto. Para mostrar las
sedes en el mapa, el sistema envía cada dirección al servicio USIG y utiliza la ubicación que
recibe como respuesta. No se guardan coordenadas anticipadamente. El buscador localiza las sedes
registradas; si una dirección no es sede, avisa **"No es una Sede"** y no agrega un punto al mapa.

Para ejecutar el prototipo se necesita un navegador actualizado, Python 3 e internet. Hay que
descomprimir el proyecto, iniciar el servidor local y abrir la página principal en el navegador.
No hace falta instalar paquetes de programación.

## 2. Alcance de la implementación

- **Visualización de sedes**: el sistema muestra en un mapa interactivo las 15 sedes donde se
  realizarán las charlas de orientación.
- **Ubicación de sedes**: cada dirección se envía al servicio USIG cuando se carga el mapa. La
  aplicación obtiene la ubicación en ese momento; no la trae guardada de antemano.
- **Búsqueda de sedes**: se puede buscar una dirección; la aplicación consulta USIG y verifica
  si corresponde a una sede registrada. Solo las sedes existentes se pueden localizar en el mapa.
- **Consulta de charlas**: la portada presenta tres actividades y `charlas.html` muestra el
  listado completo de 15 charlas.

## 3. Servicios externos utilizados

| Servicio | URL | Versión / CDN | Rol |
|----------|-----|---------------|-----|
| USIG – Normalizador de Direcciones | https://servicios.usig.buenosaires.gob.ar/normalizar/ | v2.1.2 | Normalización y geocodificación de direcciones (CABA / AMBA) |
| Leaflet | https://unpkg.com/leaflet@1.9.4/ | 1.9.4 (CDN: unpkg.com) | Visualización del mapa interactivo |
| OpenStreetMap Tiles | https://tile.openstreetmap.org/ | — | Imágenes de fondo (tiles) del mapa |

## 4. Estructura de datos: `data/sedes.json`

El archivo contiene un **array de 15 sedes** con la información mínima requerida para la
consulta. **No incluye coordenadas**: la ubicación se obtiene exclusivamente consumiendo la API
USIG.

```json
[
    {
        "id": 1,
        "nombre": "Biblioteca Nacional Mariano Moreno",
        "direccion": "Agüero 2502, caba",
        "referencia": "Salón de actos, planta baja"
    },
    {
        "id": 2,
        "nombre": "Teatro Colón",
        "direccion": "Córdoba 1538, caba",
        "referencia": "Aula de la sala de ensayo"
    }
    /* ...13 sedes más... */
]
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | Identificador único de la sede |
| `nombre` | string | Nombre comercial/institucional del lugar |
| `direccion` | string | Dirección en el formato esperado por USIG: `"calle altura, partido"` |
| `referencia` | string | Descripción opcional de la ubicación dentro del predio |

## 5. Consumo de la API USIG

### 5.1. Punto de entrada

```
GET https://servicios.usig.buenosaires.gob.ar/normalizar/
```

**Parámetros enviados:**

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `direccion` | Ej.: `cordoba 1538, caba` | Dirección en formato "calle altura, partido" o "calle y calle, partido" |
| `geocodificar` | `TRUE` | Solicita las coordenadas geográficas en la respuesta |

La llamada se realiza desde el navegador. La dirección viaja al servicio USIG y la aplicación
lee la ubicación incluida en su respuesta.

### 5.2. Estructura de la respuesta (JSON)

```json
{
    "direccionesNormalizadas": [{
        "altura": 1538,
        "cod_calle": 3165,
        "cod_calle_cruce": null,
        "cod_partido": "caba",
        "coordenadas": {
            "srid": 4326,
            "x": "-58.388870",
            "y": "-34.599476"
        },
        "direccion": "CORDOBA AV. 1538, CABA",
        "nombre_calle": "CORDOBA AV.",
        "nombre_calle_cruce": "",
        "nombre_localidad": "CABA",
        "nombre_partido": "CABA",
        "tipo": "calle_altura"
    }]
}
```

Campos clave utilizados por el sistema:
- `coordenadas.x` → **longitud** (lng), valor tipo `string`, en SRID 4326 (WGS-84)
- `coordenadas.y` → **latitud** (lat), valor tipo `string`
- `direccion` → dirección normalizada (mayúsculas, con sufijo tipo vial)

### 5.3. Manejo de errores

- **Dirección no reconocida**: USIG no devuelve resultados y la página informa que no encontró
  esa dirección.
- **Falla de conexión**: el servicio requiere acceso a internet. Si la red bloquea USIG, la
  búsqueda o la carga del mapa puede no completarse.

## 6. Visualización en el mapa (Leaflet)

### 6.1. Inicialización

```js
const mapa = L.map('mapa').setView([-34.6037, -58.3816], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);
```

- Centro inicial: coordenadas de Buenos Aires.
- Zoom inicial: 11 (AMBA).
- Tiles: OpenStreetMap.

### 6.2. Carga de sedes y ubicación dinámica

```
cargarSedes()
  │
  ├── fetch("data/sedes.json")  →  array de 15 sedes
  │
  ├── Por cada sede:
  │     normalizarDireccion(sede.direccion)
  │       │
  │       ├── GET USIG ?direccion=...&geocodificar=TRUE
  │       │
  │       ├── Parsea data.direccionesNormalizadas[0]
  │       │
  │       ├── lat = parseFloat(r.coordenadas.y)
  │       │   lng = parseFloat(r.coordenadas.x)
  │       │
  │       └── return { lat, lng, direccionNormalizada }
  │
  └── agregarMarcador(result, sede.nombre, sede.referencia)
        │
        └── L.marker([lat, lng]).addTo(mapa).bindPopup(HTML)
```

Después de colocar todos los marcadores, se ejecuta `mapa.fitBounds(bounds.pad(0.2))` para
encuadrar el mapa en la totalidad de las sedes.

### 6.3. Contenido del popup de cada sede

El popup muestra el nombre de la sede, la dirección normalizada y una referencia del lugar.
No expone coordenadas técnicas al usuario.

## 7. Búsqueda de sedes

En la sección **Sedes** de `main.html` hay un buscador para encontrar una sede por su dirección.
La dirección se envía a USIG y la respuesta normalizada se compara con las sedes cargadas desde
`data/sedes.json`.

- Si corresponde a una sede registrada, se centra el mapa y se abre el marcador existente.
- Si la dirección existe, pero no es una de las sedes, se informa **"No es una Sede"**. No se
  agrega un marcador nuevo ni se desplaza el mapa.
- Si USIG no reconoce la dirección, se informa que no se encontró.

De este modo, la ubicación se obtiene dinámicamente mediante el servicio externo, pero el mapa
solo presenta los lugares que fueron definidos como sedes de las charlas.

## 8. Verificación realizada

Durante la verificación se comprobó que la página principal muestra tres charlas y que el enlace
"Ver más charlas" abre la página con las 15 actividades. También se probó la búsqueda: una
dirección que coincide con una sede abre su marcador; una dirección que no es sede informa
"No es una Sede" y no agrega marcadores.

## 9. Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `main.html` | Página principal con tres charlas, inscripción y mapa. |
| `charlas.html` | Vista con las 15 charlas precargadas. |
| `css/styles.css` | Estilos compartidos por las dos páginas. |
| `js/main.js` | Mapa, consulta a USIG, búsqueda de sedes y formulario. |
| `js/charlas.js` | Carga los datos de charlas y sedes y construye las tarjetas. |
| `data/charlas.json` | Datos de las 15 charlas. |
| `data/sedes.json` | Nombres y direcciones de las 15 sedes; no contiene coordenadas. |
| `README.md` | Tecnologías necesarias e instrucciones para ejecutar. |

## 10. Requisitos de ejecución

- Navegador web moderno con soporte ES2015+ (fetch, optional chaining, arrow functions).
- **Conexión a internet** requerida para:
  - Cargar Leaflet y los tiles de OpenStreetMap.
  - Consumir la API USIG (una llamada por cada sede).
- Servidor local necesario para cargar los archivos JSON (abrir el HTML mediante doble clic
  puede ser bloqueado por el navegador):
  ```bash
  python -m http.server 8080
  ```

## 11. Posibles mejoras (no requeridas por las pautas)

- Implementar el **alta de charlas/sedes** por parte del administrador (no obligatorio en la 2.ª entrega).
- Validar las direcciones del formulario de inscripción contra la API de normalización (reutilizando la función `normalizarDireccion`).
- Utilizar `typeResultado=calle_altura_calle_y_calle` para mejorar el matching de sedes en el conurbano.
- Agregar `maxOptions` para controlar la cantidad de resultados cuando hay ambigüedad.
