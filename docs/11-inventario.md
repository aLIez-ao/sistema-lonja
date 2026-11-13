# 11 — Inventario de archivos de código

Esta es una referencia rápida para localizar **cada archivo de código**. La explicación detallada por capa está enlazada en los documentos anteriores.

## Raíz y configuración

| Archivo | Uso |
|---|---|
| `index.js` | Inicio de servicio y expiración de reservas |
| `app.js` | Configuración Express y montaje de routers |
| `config/db.js` | Conexión Sequelize |
| `package.json` | Dependencias y comandos `start`, `server`, `test`, `demo` |

## Modelos

`models/{Tipo,Lote,Especie,EspecieCatalogo,Comprador,Compra,Usuario,DireccionEntrega,CarritoItem,Pedido,PedidoItem,Lista,ListaItem,Pregunta,Opinion}.js` describen una tabla cada uno. `models/index.js` declara sus relaciones, aliases y exportaciones. Véanse [03](03-modelos-y-datos.md).

## Controladores

`controllers/{login,registro,configuracion,usuario,tipo,comprador,lote,especie,catalogo,compra,reporte,busqueda,tienda,carrito,pedido,pedidoAdmin,social,cuenta,direccion}Controller.js` atienden los flujos homónimos. Véanse [05](05-controladores.md) y [10](10-recorridos.md).

## Routers

`routes/{login,registro,tienda,carrito,pedido,pedido_admin,cuenta,configuracion,usuario,tipo,comprador,lote,especie,catalogo,compra,reporte,busqueda}_router.js` asocian métodos HTTP con controladores. `app.js` asigna prefijos y roles. Véase [04](04-rutas-y-permisos.md).

## Middleware y ayudantes

- Middleware: `middleware/protegerRutas.js` (sesión/roles), `middleware/preferencias.js` (idioma/tema).
- Ayudantes: `helpers/{avatar,busqueda,comprador,cookies,cuentas,email,estadisticas,factura,facturaPdf,fechas,filtros,i18n,iconos,imagenes,listado,lotes,mexico,migraciones,navegacion,pasarela,pdfComun,pedidos,reportePdf,seguridad,semillas,tienda,tokens,utiles}.js`.

El índice por archivo está en [06](06-ayudantes.md).

## Navegador y plantillas

- Navegador: `public/js/{lonja-app,lonja-clics,lonja-graficas,lonja-tienda}.js`, `public/css/{lonja,tienda}.css` y `public/img/**/*.svg`.
- Vistas EJS: `views/` separadas por área (`tienda`, `pedido`, `pedidos`, `carrito`, `cuenta`, módulos del personal y `plantillas`).

Lista por pantalla y propósito: [07](07-plantillas.md) y [08](08-interfaz.md).

## Pruebas y automatización local

`test/ayuda.js` prepara SQLite; `test/{auditoria,busqueda,catalogo,comprador,cookies,correo,cuentas,demo,detalles,factura-modal,filtros,flujo,formularios,listados,nuevas_funcionalidades,pedidos-admin,pedidos,sesion-ui,social,tienda}.test.js` prueban áreas con solicitudes HTTP. `scripts/demo.js` genera datos repetibles. Véase [09](09-pruebas-y-demo.md).
