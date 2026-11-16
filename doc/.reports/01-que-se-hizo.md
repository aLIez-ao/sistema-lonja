# Qué se hizo

Fecha de trabajo: 2 de noviembre de 2026 · Entrega al cliente: 12 de noviembre de 2026.

## Resultado

Aplicación web **Sistema Lonja** funcionando, construida con el mismo stack que los PDF de ejemplo (Node.js, Express 5, Sequelize + MariaDB, EJS, Bootstrap local, JWT en cookie, bcryptjs, express-validator, method-override).


## Requerimientos del cliente

| # | Requerimiento | Resultado |
|---|---|---|
| 1 | Captura, validación y almacenamiento de las compras diarias | **Hecho.** Módulos de Lotes, Especies, Tipos, Compradores y Compras con validación en servidor y restricciones en BD. El total se calcula en el servidor. |
| 2 | Autenticación y autorización | **Hecho.** Login con bcrypt + JWT en cookie `httpOnly`; roles `admin` y `capturista`; módulo de usuarios solo para admin; los borrados solo para admin. |
| 3 | Reporte diario de compras | **Hecho.** `/reportes/diario`: detalle, totales (compras, cajas, kilos, importe), resumen por comprador, selector de fecha, CSV e impresión. |
| — | Diseño relacional del PDF | **Hecho.** Cinco tablas con los nombres, tipos y relaciones del diagrama (+ tabla `usuario`). Ver `doc/base-de-datos.md`. |
| — | `doc/` con documentación y TODO | **Hecho.** 8 documentos, incluido `TODO.md` con preguntas para el cliente. |
| — | `reports/` y README | **Hecho** (este directorio y `README.md`). |

## Qué se tomó de cada ejemplo

| PDF de ejemplo | Aplicado en |
|---|---|
| Creación de un proyecto en Node.js | `package.json` (ESM, script `server` con nodemon), Express, carpetas `controllers/ routes/ public/`, Bootstrap local |
| Formulario Sequelize MariaDB | `config/db.js`, `.env`, `index.js` (authenticate + sync + listen), EJS |
| CRUD Persona (×2 versiones) | Patrón lista/crear/editar/eliminar, `method-override`, `models/index.js` con asociaciones, plantillas header/footer |
| Request Response JSON | Validación de campos y códigos HTTP (400/401/409…), bcrypt |
| Autenticación | Login, rol, hook de bcrypt en el modelo, administrador inicial desde `.env` (`config_adm.js` → `helpers/semillas.js`) |
| Web Token | `JWTGenera`, cookie `_token`, middleware `protegerRutas`, `express-validator`, cerrar sesión |

## Qué quedó fuera (y por qué)

- **Confirmación de cuenta por correo (nodemailer):** comentario histórico anterior al registro y verificación por correo implementados después; ver estado actualizado en [pendientes](TODO.md).
- **`csurf`:** obsoleto; se usa `SameSite=Strict`.
- **Subida de imágenes:** `especie.imagen` guarda una ruta/URL como texto.
- **Prueba contra MariaDB real:** no había MariaDB disponible; las pruebas usan SQLite y se verificó el SQL de creación de tablas para MariaDB. **Hay que correrlo una vez en MariaDB antes de entregar.**

## Métricas

- 13 pruebas automáticas, todas pasan (`npm test`).
- ~40 archivos de código y vistas, 8 de documentación.

## Incidente durante el trabajo

Al empezar, la carpeta `sistema-lonja/` ya contenía una **versión anterior** del proyecto (con subida de imágenes con multer, paginación y rol "operador"). No se revisó antes de escribir y **varios de sus archivos fueron sobrescritos**; esa versión no se pudo recuperar. Los archivos que no se sobrescribieron (documentación vieja, tests, helpers, vistas de detalle, Bootstrap copiado) se movieron —sin borrarlos— a `../sistema-lonja-sesion-anterior/`. Todo lo que está en este proyecto corresponde a la versión nueva.
