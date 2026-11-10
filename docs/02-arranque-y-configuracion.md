# 02 — Arranque y configuración

## `package.json`

**En palabras simples:** es la ficha del proyecto. Indica qué bibliotecas necesita y los comandos disponibles.

**Para trabajo técnico:** declara módulos ESM (`"type": "module"`), dependencias Express/EJS/Sequelize/MariaDB/Bootstrap y scripts:

- `npm run server`: servidor de desarrollo con reinicio automático mediante nodemon.
- `npm start`: servidor normal (`node index.js`).
- `npm test`: ejecuta las pruebas Node del directorio `test/`.
- `npm run demo`: carga registros demostrativos usando `scripts/demo.js`.

`package-lock.json` fija las versiones instaladas para que las instalaciones sean reproducibles; es un archivo generado por npm, no contiene lógica de la aplicación.

## `.env.example`

Plantilla de variables de entorno para configurar puerto, base de datos, zona horaria, duración del token y usuario inicial. Se copia a `.env` y se completan los valores locales. No se debe publicar el `.env` real porque puede contener credenciales y secretos.

Variables clave: `PORT`, `BD_DIALEC`, `BD_NOMBRE`, `BD_USUARIO`, `BD_CLAVE`, `BD_HOST`, `BD_PORT`, `BD_TIMEZONE`, `APP_TZ`, `SC_JWT`, `JWT_DURACION`, `ADMIN_USER`, `ADMIN_PASSWORD` y, para SQLite, `BD_STORAGE`.

## `index.js`

**En palabras simples:** es el interruptor de encendido del sistema.

Carga configuración, asociaciones y aplicación; valida que exista el secreto JWT; abre la conexión; sincroniza las tablas; crea el administrador inicial y los tipos base si hacen falta; por último, empieza a escuchar solicitudes en el puerto (2800 por defecto). Si falla un paso de inicio, registra el error y termina el proceso.

**Cuidado técnico:** `BD_SYNC=safe` es el valor predeterminado; `alter` ajusta tablas y `force` las elimina y recrea. No usar `force` con datos que se necesiten conservar. La carga de `dotenv` se hace antes de conectar la BD.

## `app.js`

Construye y exporta la aplicación Express, sin abrir el puerto. Esta separación permite importar la app desde las pruebas sin iniciar un servidor por sí sola.

> no se entiende el propósito

Configura lectura de formularios/JSON, cookies, `method-override`, EJS, Bootstrap local, archivos públicos, funciones auxiliares en las vistas y rutas. Las rutas privadas se montan bajo su prefijo; `/usuarios` añade el permiso de administrador. Al final configura respuestas 404 y errores 500.

> cuales json? no hay bootstrap local.

**Para trabajo técnico:** el orden de middlewares importa. `rutaProteger` debe ejecutarse antes de rutas que necesiten identidad; el router de usuarios se monta además con `permitir("admin")`.

## `config/db.js`

Prepara la instancia Sequelize que comparten modelos, controladores, servidor de inicio, demo y pruebas. Por defecto usa MariaDB. Si `BD_DIALEC=sqlite`, usa el archivo `BD_STORAGE` o una base en memoria cuando la variable vale `:memory:`. Oculta SQL de consola y desactiva timestamps automáticos.

No abre la conexión aquí; `index.js` hace `authenticate()` y la prueba prepara SQLite por separado.

## `app.js` e `index.js`: por qué son archivos distintos

`app.js` describe cómo atender solicitudes; `index.js` se ocupa de preparar recursos y arrancar el proceso. Así se puede probar la aplicación contra una base temporal sin ejecutar el arranque de producción.

> como se diferencia la prueba de produccion. como hace hace cada uno?

## Archivos generados o externos

- `package-lock.json`: inventario exacto de versiones npm.
- `node_modules/`: bibliotecas instaladas; no editar a mano.
- `.env`: valores específicos de cada instalación; no compartir secretos.
- `.env.example`: referencia segura para preparar otro entorno.
