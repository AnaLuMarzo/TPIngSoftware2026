# TPIngSoftware2026

### 2da entrega:
Modelo Conceptual: Desarrollar el diagrama de dominio para los datos involucrados en el problema. Prueba de Concepto: La funcionalidad debe abarcar los casos de uso relacionados con la inscripción de un postulante para autoridad de mesa, y la consulta de charlas. Incluir la interacción con el sistema externo geográfico para las referencias en mapa.

## Tecnologías y requisitos

### Tecnologías del proyecto

| Lenguaje | Versión requerida | Uso |
|----------|-------------------|-----|
| HTML5 | Estándar del navegador (no se instala) | Estructura de `main.html`, `charlas.html` y los fragmentos `formulario.html` y `mapa.html` |
| CSS3 | Estándar del navegador (no se instala) | Estilos y maquetación (`css/styles.css`) |
| JavaScript (ES2015+) | ES2015 o posterior | Carga de secciones (`js/main.js`), acceso a datos JSON (`js/datos.js`), formulario e inscripción (`js/formulario.js`), mapa interactivo (`js/mapa.js`), listado de charlas (`js/charlas.js`), reglas de validación (`js/validaciones.js`) y comunicación con API externa (`js/usig.js`) |

### Librerías externas

| Librería | Versión | Distribución | Uso |
|----------|---------|--------------|-----|
| Leaflet | 1.9.4 | CDN (unpkg.com) | Visualización del mapa interactivo de sedes |
| OpenStreetMap Tiles | — | CDN (tile.openstreetmap.org) | Imágenes de fondo (tiles) del mapa |

### Servicios externos (API)

| Servicio | URL | Uso |
|----------|-----|-----|
| USIG – Normalizador de Direcciones (Gobierno de CABA) | https://servicios.usig.buenosaires.gob.ar/normalizar/ | Normaliza y geocodifica direcciones para ubicar las sedes en el mapa |

> El proyecto **requiere conexión a internet** para:
> - Cargar Leaflet y los tiles de OpenStreetMap desde CDN.
> - Consumir la API de normalización de direcciones de USIG para geocodificar cada sede.

#### Datos, charlas, sedes y postulantes

- `data/charlas.json` contiene las charlas precargadas; cada charla identifica su sede por nombre.
- `data/sedes.json` contiene los datos de las sedes (nombre, dirección, referencia).
- `data/postulantes.json` almacena los postulantes registrados (array vacío inicial).
- Al cargar el mapa, la aplicación envía cada dirección a USIG y utiliza la respuesta para colocar los marcadores con Leaflet.
- El buscador del mapa comprueba si una dirección corresponde a una sede registrada. Si lo es, centra el mapa en esa sede; si no, informa **"No es una Sede"** y no agrega un marcador.
- La portada muestra tres charlas y el enlace **"Ver más charlas"** abre `charlas.html`, donde se muestra el listado completo. Ambas vistas obtienen la información desde los archivos JSON.
- El período de inscripción se determina automáticamente a partir de las charlas: se abre con la primera charla y cierra con la última.

### Herramientas recomendadas

| Herramienta | Versión requerida | Uso |
|-------------|-------------------|-----|
| Navegador web moderno | Última versión (Chrome, Firefox, Edge, Safari) | Ejecutar y visualizar la aplicación |
| Python | 3.x (opcional) | Alternativa para levantar el servidor local |

### Cómo ejecutar el proyecto

El código se entrega en un archivo `.zip`. Seguir estos pasos:

1. **Descargar** el archivo `TPIngSoftware2026.zip`.
2. **Descomprimir** en la carpeta deseada (clic derecho → "Extraer todo" / Extract All).
3. Ingresar a la carpeta del proyecto:
   ```bash
   cd TPIngSoftware2026
   ```
4. Abrir una terminal en la carpeta del proyecto e iniciar el servidor local:
   ```bash
   python servidor.py 8080
   ```
5. Abrir `http://localhost:8080/main.html` en el navegador. No abrir el archivo con doble clic, porque el navegador podría bloquear la lectura de los JSON y el envío de inscripciones.

> El proyecto incluye `servidor.py`, un servidor Python personalizado que sirve los archivos estáticos y acepta las inscripciones de postulantes (`POST /api/postulantes`). Este servidor es necesario porque el formulario guarda los datos en `data/postulantes.json`, lo cual requiere un backend.

Si no tiene Python instalado, puede usar cualquiera de estas alternativas desde la carpeta del proyecto ya descomprimida:

#### Opción A: Visual Studio Code y Live Server

⚠️ **Importante:** Live Server y Node.js `http-server` **no sirven** para este proyecto porque no manejan el endpoint `POST /api/postulantes` necesario para guardar inscripciones. Se requiere usar `servidor.py`.

#### Opción B: Node.js con express

Si tenés Node.js instalado, podés usar un servidor Express que sirva archivos estáticos y acepte POSTs. Sin embargo, la opción recomendada sigue siendo `servidor.py`.

La dirección local funciona únicamente en la computadora donde se inició el servidor. Cada persona
que reciba el ZIP debe iniciar su propio servidor. No se debe abrir `main.html` con doble clic,
porque el navegador puede bloquear la carga de archivos JSON y de las secciones HTML.

> No se necesita instalar paquetes del proyecto con npm. Leaflet se carga desde CDN; se requiere
> internet para Leaflet, OpenStreetMap, USIG y para descargar `http-server` la primera vez que se
> usa la opción de Node.js.

---




