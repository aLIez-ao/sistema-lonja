# Arquitectura

Aplicación web **monolítica con renderizado en servidor** (MVC), siguiendo el estilo de los PDF de ejemplo de la materia: Express + EJS para las vistas, Sequelize para el acceso a MariaDB, JWT en cookie para la sesión.

## Estructura de carpetas

```
sistema-lonja/
├── index.js                 Arranque: conecta a la BD, sincroniza tablas, siembra datos, escucha el puerto
├── app.js                   Configura Express (middlewares, rutas, errores). Se exporta para las pruebas
├── config/db.js             Conexión Sequelize (MariaDB; SQLite solo para pruebas)
├── models/                  Modelos de operación, tienda, cuentas y comunidad + index.js (asociaciones)
├── controllers/             Lógica de acceso, operación, tienda, pedidos, comunidad y reportes
├── routes/                  Routers por área de la aplicación
├── middleware/protegerRutas.js   Autenticación (rutaProteger) y autorización (permitir)
├── helpers/                 Sesión, correo, fechas, pedidos, pagos simulados, PDFs y validaciones
├── views/                   Plantillas EJS por módulo y componentes compartidos
├── public/                  CSS, JavaScript e imágenes del navegador
├── scripts/demo.js          Datos de ejemplo
├── test/flujo.test.js       Pruebas de extremo a extremo
├── doc/                      Documentación de referencia y guía de código
```

## Flujo de una petición

```
Navegador ──► Express ──► cookieParser / urlencoded / methodOverride
                              │
                              ├─ rutas públicas: GET /  POST /credenciales  GET /cerrarsesion
                              │
                              └─ rutas privadas ► rutaProteger (valida JWT, carga el usuario, comprueba "activo")
                                                  └► permitir("admin") donde aplica
                                                      └► validadores (express-validator)
                                                          └► controlador ► modelos Sequelize ► MariaDB
                                                                          └► res.render(vista EJS) / res.redirect
```

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| ES Modules (`"type": "module"`) | Igual que los ejemplos del curso |
| Express 5 | Los handlers `async` que fallan llegan al manejador de errores sin librerías extra |
| Sesión = JWT en cookie `_token` (`httpOnly`, `SameSite=Strict`) | Es el mecanismo del ejemplo *Web Token*; la cookie no la lee JavaScript |
| El middleware vuelve a consultar al usuario en cada petición | Si se desactiva o borra una cuenta, pierde el acceso aunque su token no haya vencido |
| Bootstrap servido desde `node_modules/bootstrap/dist` en `/bootstrap` | Funciona sin Internet (como pedían los ejemplos) y sin copiar archivos a mano |
| `PUT`/`DELETE` desde formularios con `method-override` (`?_method=`) | Igual que *CRUD Persona* |
| `db.sync()` en modo `safe` por defecto | El ejemplo usaba `force: true` / `alter: true`, que borran o alteran datos; aquí solo se crean las tablas que faltan (`BD_SYNC=alter` o `force` si se quiere) |
| El total de la compra lo calcula el servidor | `precio_total = kilos del lote × precio_kilo_final`; el cliente no puede mandar un total distinto |
| Cuenta `usuario` y ficha `comprador` son entidades distintas | Una cuenta puede vincularse a una ficha de compra; el personal usa cuentas sin ficha comercial |
| Fechas en la zona horaria de la lonja (`APP_TZ`, `BD_TIMEZONE`) | "El día" del reporte se calcula de 00:00 a 24:00 hora de Ciudad de México |

## Diferencias con los PDF de ejemplo

- No se usa `csurf` (está obsoleto); se mitiga con `SameSite=Strict` (ver [seguridad](05-seguridad.md)).
- El correo puede enviarse mediante Nodemailer y Gmail cuando se configuran sus credenciales; sin ellas se usa un simulador local. El pago de tienda es simulado y no procesa cargos bancarios.
- El hash de la contraseña solo se recalcula cuando cambia (el ejemplo lo rehacía en cada `update`, lo que dañaba la clave).
- Se corrigieron errores de los ejemplos (`res.redirect` con segundo argumento, plantillas con `id` duplicados, `host` dentro de `dialectOptions`, etc.).
