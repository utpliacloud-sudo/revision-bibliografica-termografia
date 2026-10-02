# Revisión Bibliográfica · Termografía mamaria

Aplicación independiente en HTML, CSS y JavaScript. Está junto a la aplicación
original `brujula_bibliografica` y consulta el mismo dataset de 601 artículos.
El navegador realiza los filtros, gráficos, búsqueda y exportaciones. No requiere
Streamlit, Python, claves de API, instalación de paquetes ni conexión a Internet
para funcionar en localhost. Los enlaces a artículos sí necesitan Internet.

## Iniciar en Windows

Abre `iniciar.bat` dentro de esta carpeta, o `iniciar_brujula_web.bat` en la carpeta
principal. Se necesita Node.js 18 o posterior (ya disponible en este equipo).
Abre **http://localhost:3000**. Para detener el servidor, pulsa Ctrl+C.

También puedes ejecutar desde esta carpeta:

```sh
npm start
```

Si el puerto está ocupado, en PowerShell:

```powershell
$env:PORT = '3001'
node server.mjs
```

El servidor local escucha únicamente en este equipo. La aplicación usa rutas
relativas y admite publicación dentro de una subcarpeta, como GitHub Pages.

## Funciones migradas

- Portada, fuentes de Scopus y Web of Science y flujo adaptable al móvil.
- Estrategia única: mama AND termografía o imagen térmica AND IA o clasificación
  computacional, período 2020–2026. Incluye sus adaptaciones exactas para Scopus,
  Web of Science, proporcionadas por el usuario, copia al portapapeles,
  descarga TXT o JSON y las cuatro preguntas de investigación usadas para
  evaluar la afinidad de los artículos.
- Descargas originales y archivos de cada etapa del proceso.
- Filtros Alta, Media, Baja y Sin resumen; búsqueda por título, resumen, palabras
  clave y DOI. La selección se aplica a tablas, porcentajes y análisis.
- Tabla ordenable por encabezado, paginación y detalles del artículo.
- Exportaciones CSV con las 110 columnas originales, compatibles con Excel.
- Red de coocurrencia: 14 términos principales y hasta 30 conexiones de al menos
  dos artículos. Los empates se ordenan alfabéticamente para reproducibilidad.
- Motivos de recomendación con diálogo, artículos y exportación.
- Los cuatro objetivos y sus ocho secciones de evidencia; tarjetas, barras,
  puntos y anillo, filtros de categorías y artículos detrás de cada conteo.
- Matriz de métricas por artículo, enlaces DOI/recursos y las tres líneas futuras
  que ya estaban marcadas como «Próximamente» en la aplicación original.
- Tema claro/oscuro y diseño adaptable. Solo la preferencia de tema se guarda
  localmente; no se guardan decisiones ni se envían datos a un servidor.

## Datos y actualización

`data/project.json` incluye los metadatos, puntajes y menciones por artículo.
Las menciones se exportaron usando las mismas reglas científicas de la aplicación
original. JavaScript agrega esas menciones sobre los artículos seleccionados:
un artículo puede aparecer en varias categorías. Los puntajes son prioridades
de lectura; las menciones no confirman uso y la inclusión requiere texto completo.

Python solo es necesario si deseas regenerar el paquete después de actualizar
los archivos originales. Desde la carpeta principal:

```powershell
.\.venv\Scripts\python.exe brujula_web\tools\exportar_datos.py
```

Este comando actualiza el JSON, el flujograma y las copias de descarga; no modifica
la aplicación ni los datos de origen. Los datasets incluidos son una instantánea.

## Publicar en un hosting estático

Sube `index.html`, `app.js`, `styles.css`, `assets/`, `data/project.json`,
`data/cadenas_busqueda.json` y
`downloads/` al directorio público de tu hosting. No se necesita proceso de
compilación. `server.mjs`, Node.js y Python solo son herramientas locales;
el hosting estático sirve los archivos directamente. No requiere npm install.

Para GitHub Pages, publica el contenido de esta carpeta como raíz del sitio o
usa un workflow que la publique como artefacto. `tools/` y `data/reference.json`
son herramientas de mantenimiento y verificación, y pueden omitirse del hosting.

## Verificación de desarrollo

`tools/verificar.mjs` comprueba la interfaz con Playwright y Edge: datos,
filtros, conteos, ordenación, gráficos, detalles, exportación, archivos, tema,
ruta de subcarpeta y tamaño móvil. Playwright se usa únicamente para verificar;
no es una dependencia de ejecución de esta aplicación.

## Publicación del informe

Repositorio: https://github.com/utpliacloud-sudo/revision-bibliografica-termografia

Informe: https://utpliacloud-sudo.github.io/revision-bibliografica-termografia/

Cada push a main publica los archivos mediante el workflow de GitHub Pages.
