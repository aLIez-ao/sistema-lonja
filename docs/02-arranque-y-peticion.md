# 02 — Arranque y recorrido de una petición

## Arranque

1. `index.js` carga la configuración, conecta Sequelize y crea las tablas que faltan.
2. `helpers/migraciones.js` completa columnas compatibles con bases ya existentes y enlaza especies viejas al catálogo.
3. `helpers/semillas.js` agrega tipos iniciales y, si hace falta, el administrador inicial.
4. Express escucha en el puerto `PORT` (por omisión 2800). Un temporizador libera reservas vencidas.

## Camino de una página

Por ejemplo, al abrir `/tienda/lote/25`, `app.js` aplica preferencias y reconoce al usuario si hay cookie. El router público envía la petición a `tiendaController.detalleLote`. El controlador consulta el lote y sus especies por medio de Sequelize, comprueba compra/reserva y llama a `views/tienda/lote.ejs`. La plantilla produce HTML; `public/css/tienda.css` y `public/js/lonja-tienda.js` completan la presentación.

En una acción privada, como `POST /pedido`, el router ya exige sesión de comprador. El controlador vuelve a validar los datos, calcula importes en el servidor, crea las filas dentro de una transacción y responde con una redirección.

## Entrada principal

- `index.js`: inicia la aplicación real, prepara la BD y el proceso de expiración.
- `app.js`: configura Express, locales EJS, cookies, archivos estáticos, preferencias, routers y el manejo de errores.
- `config/db.js`: crea la única conexión Sequelize desde variables del entorno.
- `middleware/protegerRutas.js`: verifica la sesión y los roles.
- `middleware/preferencias.js`: hace disponibles idioma, tema y formato en las vistas.

En las pruebas, `test/ayuda.js` monta ese mismo `app.js` en un puerto local y usa una base SQLite en memoria. No es una versión alternativa de la lógica.
