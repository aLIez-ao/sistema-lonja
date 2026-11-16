# 07 — Inventario de archivos de código

Esta es una referencia rápida para localizar **cada archivo de código**. La explicación detallada por capa está enlazada en los documentos anteriores.

## Raíz y configuración

| Archivo | Uso |
|---|---|
| `index.js` | Inicio de servicio y expiración de reservas |
| `app.js` | Configuración Express y montaje de routers |
| `config/db.js` | Conexión Sequelize |
| `config/entorno.js` | Carga variables de `.env` antes de iniciar la aplicación |
| `eslint.config.js`, `.prettierrc.json` | Reglas de calidad estática y formato |
| `package.json` | Dependencias y comandos de servicio, pruebas, demo, lint y formato |

## Modelos

`models/{Tipo,Lote,Especie,EspecieCatalogo,Comprador,Compra,Usuario,DireccionEntrega,CarritoItem,Pedido,PedidoItem,Lista,ListaItem,Pregunta,Opinion,Migracion}.js` describen entidades de datos. `models/index.js` declara sus relaciones, aliases y exportaciones. Véase [base de datos](../02-base-de-datos.md).

## Controladores

`controllers/{avisos,busqueda,carrito,catalogo,compra,comprador,configuracion,cuenta,direccion,especie,login,lote,pedido,pedidoAdmin,registro,reporte,social,tienda,tipo,usuario}Controller.js` atienden los flujos homónimos. La lógica transaccional de pedidos está en `servicios/pedidos.js`. Véanse [02-controladores-y-servicios](02-controladores-y-servicios.md) y [06-recorridos](06-recorridos.md).

## Routers

Los routers de `routes/` asocian métodos HTTP con controladores. `app.js` asigna prefijos y roles. Véase [rutas y permisos](../03-rutas-y-permisos.md).

## Middleware y ayudantes

- Middleware: `middleware/protegerRutas.js` (sesión/roles), `middleware/preferencias.js` (idioma/tema).
- Ayudantes: `helpers/{avatar,busqueda,comprador,cookies,cuentas,email,estadisticas,factura,facturaPdf,fechas,filtros,i18n,iconos,imagenes,listado,lotes,mexico,migraciones,navegacion,pasarela,pdfComun,pedidos,reportePdf,seguridad,semillas,tienda,tokens,utiles}.js`.

El índice por archivo está en [ayudantes](03-ayudantes.md).

## Navegador y plantillas

- Navegador: módulos ES de `public/js/` (incluidos `lonja-*.js`, `pedido-nuevo.js` y `pedido-pago.js`), `public/css/{lonja,tienda}.css` y `public/img/**/*.svg`.
- Vistas EJS: `views/` separadas por área (`tienda`, `pedido`, `pedidos`, `carrito`, `cuenta`, módulos del personal y `plantillas`).

Lista por pantalla y propósito: [plantillas](08-inventario-vistas.md) y [interfaz](05-interfaz-js-css.md).

## Pruebas y automatización local

`test/ayuda.js` prepara SQLite; los archivos `*.test.js` verifican recorridos HTTP, privacidad, seguridad y regresiones. `scripts/demo.js` genera datos repetibles. Véase [pruebas](../06-pruebas.md).

La guía explica las principales partes; para una lista exhaustiva actualizada, `rg --files` permite localizar archivos nuevos o incorporados después de esta revisión.
