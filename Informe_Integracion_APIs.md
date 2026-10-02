# Informe técnico — Integración de API de Normalización de Direcciones y Visualización en Mapa

## 1. Objetivo

Describir de manera concreta cómo el **Portal de Autoridades de Mesa** integra el sistema externo
geográfico mediante la API de normalización de direcciones del **USIG** (Gobierno de la Ciudad de
Buenos Aires) y la librería **Leaflet**, cumpliendo con los criterios de evaluación de la
Prueba de Concepto.

## 2. Alcance de la implementación

- **Visualización de sedes**: el sistema muestra en un mapa interactivo las 15 sedes donde se
  realizarán las charlas de orientación.
- **Consumo dinámico de la API USIG**: cada dirección de una sede se envía en tiempo real a la
  API de normalización de direcciones. Las coordenadas resultantes **no** están precalculadas ni
  hardcodeadas.
- **Prueba en vivo**: se incluye un formulario en la página que permite introducir una dirección
  diferente a las precargadas y verificar que el sistema la geocodifica dinámicamente.

## 3. Servicios externos utilizados

| Servicio | URL | Versión / CDN | Rol |
|----------|-----|---------------|-----|
| USIG – Normalizador de Direcciones | http://servicios.usig.buenosaires.gob.ar/normalizar/ | v2.1.2 | Geocodificación de direcciones (CABA / AMBA) |
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
GET http://servicios.usig.buenosaires.gob.ar/normalizar/
```

**Parámetros enviados:**

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `direccion` | Ej.: `cordoba 1538, caba` | Dirección en formato "calle altura, partido" o "calle y calle, partido" |
| `geocodificar` | `TRUE` | Solicita las coordenadas geográficas en la respuesta |

**Nota:** La llamada se realiza desde el navegador web (cliente) mediante `fetch`, con conexión
de red directa a la API del gobierno. No hay middlewares ni proxies internos.

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

- **Sin resultados** (`direccionesNormalizadas: []`): se registra un warning en consola y la sede
  no se muestra en el mapa.
- **Error de conexión / CORS / red**: se captura la excepción y se notifica al usuario en la
  interfaz.

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
  └── agregarMarcador(result, sede.nombre, sede.direccion, sede.referencia)
        │
        └── L.marker([lat, lng]).addTo(mapa).bindPopup(HTML)
```

Después de colocar todos los marcadores, se ejecuta `mapa.fitBounds(bounds.pad(0.2))` para
encuadrar el mapa en la totalidad de las sedes.

### 6.3. Contenido del popup de cada sede

```
<strong>{nombre}</strong>
Enviada:    {direccion original}
Normalizada: {direccion normalizada por USIG}
{referencia}
lat: ... lng: ...
```

## 7. Prueba en vivo (requisito del PDF)

En la sección **Sedes** de `main.html` se implementó un formulario:

```
🧪 Probar con una dirección nueva (integración con la API USIG)
[  ____________________________  ] [ Probar ]
```

### Flujo

1. El usuario escribe una dirección (ej.: `Alsina 1386, caba`).
2. Al presionar "Probar" (o Enter), se invoca `probarDireccion(direccion)`.
3. Se realiza **una nueva llamada real a USIG** con esa dirección.
4. Si USIG devuelve coordenadas validas:
   - Se crea un **marcador nuevo** (reemplazando al anterior) en el punto geográfico.
   - El mapa centra ese punto (`mapa.setView([lat, lng], 16)`).
   - Abre el **popup** mostrando la dirección enviada, la normalizada, y las coordenadas.
   - En la UI se confirma: `OK — ubicada en lat: ..., lng: ...`.
5. Si USIG no encuentra la dirección, se muestra:
   `USIG no encontró la dirección. Revisá el formato (calle altura, partido).`

> **Criterio evaluado:** "Durante la demostración se podrá solicitar probar la integración con
> una dirección diferente de las utilizadas inicialmente, para verificar que la ubicación se
> obtiene dinámicamente mediante el consumo de la API."
>
> **Cumplimiento:** La prueba en vivo consume la API con una dirección arbitraria, distinta a las
> 15 precargadas, y muestra el resultado geográfico sin ningún dato precomputado.

## 8. Verificación realizada

Durante el desarrollo se verificó que:

- Las **15 sedes** precargadas en `data/sedes.json` se geocodifican correctamente con la API
  USIG (15/15 llamadas exitosas).
- Cada llamada HTTP corresponde a la solicitud del JSON (una petición por cada dirección,
  total 15 + 1 para el JSON = 16 requests al iniciar la página).
- Se probó una dirección **nueva** (`Alsina 1386, caba`) desde el formulario de prueba: la API
  respondió `OK — ubicada en lat: -34.611112, lng: -58.386003` y se agregó un **16° marcador**
  al mapa.

## 9. Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `main.html` | Estructura HTML. Incluye el panel de prueba y el contenedor `#mapa`. Enlaza CSS/JS. |
| `css/styles.css` | Estilos de toda la aplicación (no impacta la lógica de APIs). |
| `js/main.js` | **Lógica principal**: definición de `normalizarDireccion()`, `cargarSedes()`, `agregarMarcador()`, `probarDireccion()`. Consumidor de la API USIG y de Leaflet. |
| `data/sedes.json` | Data precargada: 15 sedes con nombre y dirección (sin coordenadas). |
| `README.md` | Documenta tecnologías, librerías, servicio USIG y cómo ejecutar. |

## 10. Requisitos de ejecución

- Navegador web moderno con soporte ES2015+ (fetch, optional chaining, arrow functions).
- **Conexión a internet** requerida para:
  - Cargar Leaflet y los tiles de OpenStreetMap.
  - Consumir la API USIG (una llamada por cada sede).
- Servidor local recomendado (el `fetch` a `data/sedes.json` no funciona con `file://`):
  ```bash
  python -m http.server 8080
  # o: npx serve
  ```

## 11. Posibles mejoras (no requeridas por las pautas)

- Implementar el **alta de charlas/sedes** por parte del administrador (no obligatorio en la 2.ª entrega).
- Validar las direcciones del formulario de inscripción contra la API de normalización (reutilizando la función `normalizarDireccion`).
- Utilizar `typeResultado=calle_altura_calle_y_calle` para mejorar el matching de sedes en el conurbano.
- Agregar `maxOptions` para controlar la cantidad de resultados cuando hay ambigüedad.
