# Arquitectura

Aplicación web **monolítica con renderizado en servidor** (MVC), siguiendo el estilo de los PDF de ejemplo de la materia: Express + EJS para las vistas, Sequelize para el acceso a MariaDB, JWT en cookie para la sesión.

## Estructura de carpetas

```
sistema-lonja/
├── index.js                 Arranque: conecta a la BD, sincroniza tablas, siembra datos, escucha el puerto
├── app.js                   Configura Express (middlewares, rutas, errores). Se exporta para las pruebas
├── config/                  entorno.js valida configuración; db.js conecta Sequelize
├── models/                  Entidades de negocio y asociaciones Sequelize
├── controllers/             Coordina solicitudes HTTP y respuestas
├── servicios/               Operaciones de negocio transaccionales, como pedidos
├── routes/                  Un router por módulo
├── middleware/protegerRutas.js   Autenticación (rutaProteger) y autorización (permitir)
├── helpers/                 Reglas reutilizables, seguridad, correo, migraciones y reportes
├── views/                   Plantillas EJS por módulo + plantillas/ (header, footer, mensajes)
├── public/css/              Estilos propios (Bootstrap se sirve desde node_modules)
├── scripts/demo.js          Datos de ejemplo
├── test/flujo.test.js       Pruebas de extremo a extremo
├── doc/                     Referencias y guía del código
```

## Flujo de una petición

```
Navegador ──► Express ──► cookieParser / urlencoded / methodOverride
                              │
                              ├─ rutas públicas: GET /  POST /credenciales  GET /cerrarsesion
                              │
                              └─ rutas privadas ► rutaProteger (valida JWT, carga el usuario, comprueba "activo")
                                                  └► permitir("admin") donde aplica
                              └► origen confiable y validadores
                                                          └► controlador ► servicio/ayudantes ► modelos Sequelize ► MariaDB
                                                                          └► res.render(vista EJS) / res.redirect
```

## Arranque y ejemplo de recorrido

`index.js` carga `.env` a través de `config/entorno.js`, prepara Sequelize y las migraciones, crea datos iniciales que hagan falta e inicia Express. `app.js` configura middleware y routers. Por ejemplo, al abrir un lote, la ruta pública llega a `tiendaController`, que consulta modelos y prepara `views/tienda/lote.ejs`; CSS y JavaScript del navegador añaden la presentación. Al crear un pedido, el router verifica la sesión, el controlador valida la entrada y `servicios/pedidos.js` calcula y guarda la reserva dentro de una transacción.

Las pruebas usan el mismo `app.js` con SQLite en memoria. Así revisan las rutas y reglas reales sin necesitar una instalación MariaDB para cada ejecución.

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
| `config/entorno.js` valida la configuración antes de iniciar | Reduce fallos tardíos por variables ausentes o valores inválidos |
| `servicios/pedidos.js` concentra transacciones de pedido | Controladores HTTP delegan creación, pago y cobro; las reglas críticas se ejecutan junto a la transacción |
| `helpers/colaTrabajos.js` serializa trabajos secundarios | Correo y otras tareas no bloquean la respuesta HTTP; el registro estructurado está en `helpers/registro.js` |
| CSP y validación del origen | `app.js` limita recursos y comprueba peticiones con efectos según el origen configurado |
| El total de la compra lo calcula el servidor | `precio_total = kilos del lote × precio_kilo_final`; el cliente no puede mandar un total distinto |
| Tabla `usuario` separada de `comprador` | El diagrama del cliente no incluye personal del sistema; los compradores son clientes, no usuarios |
| Fechas en la zona horaria de la lonja (`APP_TZ`, `BD_TIMEZONE`) | "El día" del reporte se calcula de 00:00 a 24:00 hora de Ciudad de México |

## Diferencias con los PDF de ejemplo

- La validación del origen permitido y la cookie `SameSite` protegen acciones con efectos; ver [05-seguridad.md](05-seguridad.md).
- El registro público verifica el correo y permite recuperar el acceso mediante enlaces temporales.
- El hash de la contraseña solo se recalcula cuando cambia (el ejemplo lo rehacía en cada `update`, lo que dañaba la clave).
- Se corrigieron errores de los ejemplos (`res.redirect` con segundo argumento, plantillas con `id` duplicados, `host` dentro de `dialectOptions`, etc.).
