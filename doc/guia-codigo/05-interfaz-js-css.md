# 05 — CSS, JavaScript y recursos

## Código que ejecuta el navegador

| Archivo | Función |
|---|---|
| `public/js/lonja-app.js` | Arranque general: preferencias, validación accesible, formularios y componentes globales |
| `public/js/lonja-clics.js` | Acciones rápidas de interfaz y botones de navegación |
| `public/js/lonja-busqueda.js` | Sugerencias y controles de búsqueda |
| `public/js/lonja-cuenta.js` | Interacciones de perfil y cuenta |
| `public/js/lonja-facturas.js` | Acciones de vista e impresión de facturas |
| `public/js/lonja-graficas.js` | Renderiza gráficos del tablero usando los datos JSON que entrega EJS |
| `public/js/lonja-preferencias.js` | Preferencias de presentación del usuario |
| `public/js/lonja-tienda.js` | Agrega/quita lotes por JSON, actualiza contador y mensajes de tienda |
| `public/js/lonja-ventas.js` | Interacciones del flujo de ventas del personal |
| `public/js/pedido-nuevo.js`, `pedido-pago.js` | Comportamientos específicos para checkout y pago simulado |
| `public/js/tienda-utils.js` | Utilidades del navegador compartidas por la tienda |
| `public/css/lonja.css` | Diseño compartido del panel, temas y componentes generales |
| `public/css/tienda.css` | Diseño de tienda, tarjetas, ficha de lote y ficha de especie |

## Imágenes SVG

- `public/img/logo.svg`, `logo-oscuro.svg`, `favicon.svg`: marca y favicon.
- `public/img/flags/mx.svg`, `us.svg`: selector de idioma.
- `public/img/placeholder-pescado.svg`, `placeholder-marisco.svg`, `placeholder-molusco.svg`: ilustraciones cuando falta una imagen.

Bootstrap y Chart.js se sirven desde dependencias locales indicadas en `package.json`; no dependen de un CDN.

## Cómo se encuentran las capas

El servidor añade las hojas del panel y de tienda al encabezado. Las plantillas cargan los módulos ES que necesita cada pantalla: `lonja-app.js` sirve de arranque y los demás separan búsqueda, cuenta, facturas, ventas o checkout. Los atributos `data-*` conectan HTML y JavaScript sin insertar scripts en línea. Los valores de tema vienen de preferencias y atributos HTML en `header.ejs`.
