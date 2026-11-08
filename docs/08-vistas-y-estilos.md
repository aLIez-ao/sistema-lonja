# 08 — Vistas y presentación

Las vistas EJS generan HTML en el servidor. Reciben datos con nombre desde el controlador; no consultan la base directamente. `<%= dato %>` inserta texto escapado; `<%- include(...) %>` incorpora una plantilla confiable.

## Plantillas comunes

| Archivo | Qué aporta |
|---|---|
| `views/plantillas/header.ejs` | Abre el documento HTML, enlaza favicon, Bootstrap y `public/css/lonja.css`; dibuja navegación y abre el contenedor principal. Muestra enlaces y nombre/rol cuando hay usuario. |
| `views/plantillas/footer.ejs` | Cierra el contenedor, muestra créditos y carga Bootstrap JavaScript. |
| `views/plantillas/mensajes.ejs` | Presenta mensajes/errores de forma reutilizable en formularios o listas. |

Cada pantalla de módulo incluye header y footer, así conserva navegación, ancho y estilos coherentes. Mantén balanceados los tags que abren/cierra el header/footer al modificar el esqueleto.

## Pantallas de módulo

| Archivo | Para qué sirve y datos que presenta |
|---|---|
| `views/inicio.ejs` | Resumen del día con número de compras, importe y lotes libres; accesos rápidos a captura y reporte. Recibe `fecha`, `numCompras`, `total`, `lotesLibres`. |
| `views/error.ejs` | Página de error con código HTTP y mensaje legible. Se usa para 403, 404 y errores internos. |
| `views/login/login.ejs` | Formulario para usuario/contraseña; conserva el usuario y presenta errores. |
| `views/tipos/index.ejs` | Lista tipos y acciones disponibles. |
| `views/tipos/formulario.ejs` | Alta/edición de nombre de tipo, con acción, método y errores preparados por el controlador. |
| `views/compradores/index.ejs` | Lista datos de compradores y accesos a alta/edición/borrado según rol. |
| `views/compradores/formulario.ejs` | Captura nombre, apellidos, dirección y correo; reutilizado para alta/edición. |
| `views/lotes/index.ejs` | Lista lotes, especies/tipos asociados y estado/comprador si se vendió. |
| `views/lotes/formulario.ejs` | Captura kilos, cajas y precio inicial del lote. |
| `views/especies/index.ejs` | Lista especies vinculadas a tipo y lote. |
| `views/especies/formulario.ejs` | Captura nombre, lote, tipo e imagen opcional. |
| `views/compras/index.ejs` | Historial de compras con lote, comprador, especies y valores monetarios. |
| `views/compras/formulario.ejs` | Selección de lote/comprador y precio final por kilo; no define el total, que calcula el servidor. |
| `views/reportes/diario.ejs` | Selector de fecha, detalle, resumen y totales; ofrece CSV e impresión. |
| `views/usuarios/index.ejs` | Lista cuentas del personal y permite gestión de administrador. |
| `views/usuarios/formulario.ejs` | Alta/edición de nombre, usuario, rol, estado y contraseña opcional. |

En controles que oculten acciones según el rol, la interfaz solo mejora la experiencia: la seguridad real debe seguir estando en middleware/rutas.

## Estilos y recursos

- `public/css/lonja.css`: paleta, tipografía, navegación, tarjetas, botones, formularios, tablas, reglas móviles e impresión.
- `public/img/logo.svg`: logotipo mostrado en la navegación y login.
- `public/img/favicon.svg`: icono de pestaña.
- `public/img/fes-01.png`, `fes-02.png`, `fes-03.png`: imágenes estáticas del proyecto disponibles públicamente; no intervienen en la lógica de captura.
- Bootstrap se sirve desde `node_modules/bootstrap/dist` bajo `/bootstrap`; no hay copia manual del framework dentro de `public/`.

## Recorrido de una pantalla

Un controlador hace `res.render("lotes/index", { lotes, mensaje })`. Express busca `views/lotes/index.ejs`, la evalúa con esos datos y la plantilla común, y devuelve HTML al navegador. Para mostrar un nuevo valor, primero pásalo en `res.render`; después úsalo en el EJS con salida escapada.
