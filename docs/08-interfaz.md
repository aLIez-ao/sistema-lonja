# 08 — CSS, JavaScript y recursos

## Código que ejecuta el navegador

| Archivo | Función |
|---|---|
| `public/js/lonja-app.js` | Arranque general: preferencias, validación accesible, formularios y componentes globales |
| `public/js/lonja-clics.js` | Acciones rápidas de interfaz y botones de navegación |
| `public/js/lonja-graficas.js` | Renderiza gráficos del tablero usando los datos JSON que entrega EJS |
| `public/js/lonja-tienda.js` | Agrega/quita lotes por JSON, actualiza contador y mensajes de tienda |
| `public/css/lonja.css` | Diseño compartido del panel, temas y componentes generales |
| `public/css/tienda.css` | Diseño de tienda, tarjetas, ficha de lote y ficha de especie |

## Imágenes SVG

- `public/img/logo.svg`, `logo-oscuro.svg`, `favicon.svg`: marca y favicon.
- `public/img/flags/mx.svg`, `us.svg`: selector de idioma.
- `public/img/placeholder-pescado.svg`, `placeholder-marisco.svg`, `placeholder-molusco.svg`: ilustraciones cuando falta una imagen.

Bootstrap y Chart.js se sirven desde dependencias locales indicadas en `package.json`; no dependen de un CDN.

## Cómo se encuentran las capas

El servidor añade la hoja del panel y la de tienda al encabezado; el pie carga `lonja-app.js` en páginas generales y `lonja-tienda.js` donde hacen falta operaciones del carrito. Los valores de tema vienen de preferencias y atributos HTML en `header.ejs`.
