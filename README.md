# TPIngSoftware2026

### 2da entrega:
Modelo Conceptual: Desarrollar el diagrama de dominio para los datos involucrados en el problema. Prueba de Concepto: La funcionalidad debe abarcar los casos de uso relacionados con la inscripción de un postulante para autoridad de mesa, y la consulta de charlas. Incluir la interacción con el sistema externo geográfico para las referencias en mapa.

## Tecnologías y requisitos

### Lenguajes de programación

| Lenguaje | Versión requerida | Uso |
|----------|-------------------|-----|
| HTML5 | 5.x | Estructura de las páginas (`main.html`) |
| CSS3 | 3.x | Estilos y maquetación (`css/styles.css`) |
| JavaScript (ES6+) | ES2015+ | Lógica del mapa y del formulario (`js/main.js`) |

### Librerías externas

| Librería | Versión | Distribución | Uso |
|----------|---------|--------------|-----|
| Leaflet | 1.9.4 | CDN (unpkg.com) | Visualización del mapa interactivo de sedes |
| OpenStreetMap Tiles | — | CDN (tile.openstreetmap.org) | Imágenes de fondo (tiles) del mapa |

> Las librerías se cargan desde un CDN, por lo que **se requiere conexión a internet** para que el mapa funcione correctamente.

### Herramientas recomendadas

| Herramienta | Versión requerida | Uso |
|-------------|-------------------|-----|
| Navegador web moderno | Última versión (Chrome, Firefox, Edge, Safari) | Ejecutar y visualizar la aplicación |
| Python | 3.x (opcional) | Levantar un servidor local (`python -m http.server`) |
| Node.js / npm | 14+ (opcional) | Alternativa para servidor local (`npx serve`) |

### Cómo ejecutar el proyecto

El código se entrega en un archivo `.zip`. Seguir estos pasos:

1. **Descargar** el archivo `TPIngSoftware2026.zip`.
2. **Descomprimir** en la carpeta deseada (clic derecho → "Extraer todo" / Extract All).
3. Ingresar a la carpeta del proyecto:
   ```bash
   cd TPIngSoftware2026
   ```
4. Opción **A** — abrir `main.html` directamente en el navegador (doble click).
5. Opción **B** — levantar un servidor local:
   ```bash
   # Con Python 3.x
   python -m http.server 8080
   ```
   ```bash
   # o con Node.js >= 14
   npx serve
   ```
6. Abrir en el navegador la URL indicada en la terminal (ej. `http://localhost:8080`).

> Nota: no hay dependencias que instalar localmente (`package.json`) en este momento, ya que la única librería (Leaflet) se carga por CDN. Si se incorpora un backend, se actualizará esta sección con los requisitos correspondientes.

---




