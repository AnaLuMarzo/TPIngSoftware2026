# TPIngSoftware2026

### 2da entrega:
Modelo Conceptual: Desarrollar el diagrama de dominio para los datos involucrados en el problema. Prueba de Concepto: La funcionalidad debe abarcar los casos de uso relacionados con la inscripción de un postulante para autoridad de mesa, y la consulta de charlas. Incluir la interacción con el sistema externo geográfico para las referencias en mapa.

## Tecnologías y requisitos

### Tecnologías del proyecto

| Lenguaje | Versión requerida | Uso |
|----------|-------------------|-----|
| HTML5 | Estándar del navegador (no se instala) | Estructura de `main.html` y `charlas.html` |
| CSS3 | Estándar del navegador (no se instala) | Estilos y maquetación (`css/styles.css`) |
| JavaScript (ES2015+) | ES2015 o posterior | Mapa, formulario y carga de charlas (`js/main.js`, `js/charlas.js`) |

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

#### Datos, charlas y mapa

- `data/charlas.json` contiene las charlas precargadas; cada charla identifica su sede por nombre.
- `data/sedes.json` contiene nombres y direcciones, sin coordenadas.
- Al cargar el mapa, la aplicación envía cada dirección a USIG y utiliza la respuesta para
  colocar los marcadores con Leaflet.
- El buscador del mapa comprueba si una dirección corresponde a una sede registrada. Si lo es,
  centra el mapa en esa sede; si no, informa **"No es una Sede"** y no agrega un marcador.
- La portada muestra tres charlas y el enlace **"Ver más charlas"** abre `charlas.html`, donde
  se muestra el listado completo. Ambas vistas obtienen la información desde los archivos JSON.

### Herramientas recomendadas

| Herramienta | Versión requerida | Uso |
|-------------|-------------------|-----|
| Navegador web moderno | Última versión (Chrome, Firefox, Edge, Safari) | Ejecutar y visualizar la aplicación |
| Python | 3.x | Levantar el servidor local para que el navegador lea los archivos JSON |

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
   python -m http.server 8080
   ```
5. Abrir `http://localhost:8080/main.html` en el navegador. No abrir el archivo con doble clic,
  porque el navegador podría bloquear la lectura de los JSON.

> No se necesita instalar paquetes con npm. Leaflet se carga desde CDN; se requiere internet para Leaflet, OpenStreetMap y USIG.

---




