# Arquitectura

Aplicación web **monolítica con renderizado en servidor** (MVC), siguiendo el estilo de los PDF de ejemplo de la materia: Express + EJS para las vistas, Sequelize para el acceso a MariaDB, JWT en cookie para la sesión.

## Estructura de carpetas

```
sistema-lonja/
├── index.js                 Arranque: conecta a la BD, sincroniza tablas, siembra datos, escucha el puerto
├── app.js                   Configura Express (middlewares, rutas, errores). Se exporta para las pruebas
├── config/db.js             Conexión Sequelize (MariaDB; SQLite solo para pruebas)
├── models/                  Tipo, Lote, Especie, Comprador, Compra, Usuario + index.js (asociaciones)
├── controllers/             Lógica de cada módulo (login, tipo, comprador, lote, especie, compra, reporte, usuario)
├── routes/                  Un router por módulo
├── middleware/protegerRutas.js   Autenticación (rutaProteger) y autorización (permitir)
├── helpers/                 tokens (JWT), fechas (día de la lonja, dinero), utiles (errores), semillas
├── views/                   Plantillas EJS por módulo + plantillas/ (header, footer, mensajes)
├── public/css/              Estilos propios (Bootstrap se sirve desde node_modules)
├── scripts/demo.js          Datos de ejemplo
├── test/flujo.test.js       Pruebas de extremo a extremo
├── doc/  reports/           Documentación y reportes de desarrollo
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
| Tabla `usuario` separada de `comprador` | El diagrama del cliente no incluye personal del sistema; los compradores son clientes, no usuarios |
| Fechas en la zona horaria de la lonja (`APP_TZ`, `BD_TIMEZONE`) | "El día" del reporte se calcula de 00:00 a 24:00 hora de Ciudad de México |

## Diferencias con los PDF de ejemplo

- No se usa `csurf` (está obsoleto); se mitiga con `SameSite=Strict` (ver [seguridad.md](seguridad.md)).
- No se implementó la confirmación de cuenta por correo (`nodemailer`): las cuentas las crea el administrador (ver [TODO.md](TODO.md)).
- El hash de la contraseña solo se recalcula cuando cambia (el ejemplo lo rehacía en cada `update`, lo que dañaba la clave).
- Se corrigieron errores de los ejemplos (`res.redirect` con segundo argumento, plantillas con `id` duplicados, `host` dentro de `dialectOptions`, etc.).
