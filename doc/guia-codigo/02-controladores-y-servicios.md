# 02 — Controladores y servicios

Una ruta es una dirección web; un controlador es quien decide qué hacer con la solicitud. Comprueba datos, coordina modelos y ayudantes, y devuelve una página, una redirección o una respuesta JSON.

## Camino de una solicitud

1. `index.js` carga configuración, conecta la base de datos y pone el servidor en marcha.
2. `app.js` instala middleware y monta routers.
3. `routes/` decide qué controlador ejecuta la URL y aplica autenticación o permisos.
4. `controllers/` valida reglas de negocio y coordina la operación.
5. Los modelos Sequelize consultan la base; los ayudantes reúnen lógica reutilizable.
6. El controlador renderiza una plantilla EJS o envía una respuesta.

## Controladores

Los controladores de `controllers/` se agrupan por área: acceso y cuentas, catálogos y operación de mostrador, tienda y pedidos, comunidad (listas, preguntas y opiniones) y reportes. El nombre del archivo suele indicar el área, por ejemplo `pedidoController.js` o `reporteController.js`.

Al cambiar una operación revisa también el router que la llama, sus validadores, los alias de asociaciones en `models/index.js` y la vista que recibe los datos. Los límites por área y rol están en [rutas y permisos](../03-rutas-y-permisos.md).

## Configuración del servidor

`app.js` construye la aplicación Express y configura sesiones, cookies, contenido estático, rutas y errores. `index.js` realiza el arranque de proceso. Esta división permite que las pruebas HTTP puedan importar la aplicación sin abrir el puerto de producción.
