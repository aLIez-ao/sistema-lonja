# 04 — Seguridad y utilidades compartidas

## Sesión y permisos

### `middleware/protegerRutas.js`

Tiene dos funciones que se usan en las rutas:

- `rutaProteger`: busca la cookie `_token`; valida la firma y vigencia; vuelve a consultar el usuario sin contraseña; si no existe o está inactivo, borra la cookie y devuelve al login. Si es válido, deja el usuario en `req.usuario` y en `res.locals.usuario` para que controladores y vistas lo usen.
- `permitir(...roles)`: después de autenticar, permite continuar solo si el rol está en la lista; si no, muestra una página de error 403.

**En palabras simples:** autenticación responde “¿quién eres?” y autorización “¿puedes hacer esto?”. Las dos comprobaciones son distintas.

### `helpers/tokens.js`

Genera y verifica los JWT. El token contiene id y rol, se firma con `SC_JWT` y expira según `JWT_DURACION` (8 horas si no se configura). Si falta el secreto, lanza un error en vez de emitir tokens inseguros.

El token se crea desde `controllers/loginController.js`; la cookie se guarda allí; el middleware lo verifica en páginas protegidas. La consulta del usuario en cada petición permite revocar acceso desactivando la cuenta.

> cuales son paginas protegidas?

## Fechas, moneda y errores

### `helpers/fechas.js`

Centraliza el significado de “hoy” para la lonja. Usa `APP_TZ` (por defecto `America/Mexico_City`) y `BD_TIMEZONE` (por defecto `-06:00`) para construir el rango de un día, evitar tomar fechas inválidas y mostrar hora, fecha y pesos mexicanos.

Funciones exportadas: `hoy`, `fechaValida`, `rangoDelDia`, `formatoFechaHora`, `formatoHora`, `dinero`, `redondea`. Las usan login/página inicial, reporte, compras y plantillas.

### `helpers/utiles.js`

- `mensajesError(req)`: recoge mensajes que dejaron los validadores `express-validator`.
- `mensajeBD(err)`: convierte errores frecuentes de Sequelize (duplicado, relación, validación) a texto entendible; para otros errores evita exponer detalles internos.
- `aMensaje(texto)`: codifica un mensaje para ponerlo en la URL después de guardar o borrar.

Los controladores CRUD usan estas funciones para dar respuestas coherentes.

## Creación inicial de datos

### `helpers/semillas.js`

`crearAdministradorInicial()` crea un usuario admin solo si están configuradas `ADMIN_USER` y `ADMIN_PASSWORD` y no existe esa cuenta; la contraseña se cifra mediante el hook de `Usuario`. `crearTiposIniciales()` crea Pescado, Marisco y Molusco solo si la tabla de tipos está vacía.

`index.js` llama ambas funciones en el arranque. `scripts/demo.js` también reutiliza la carga de tipos.

## Cómo se encadenan

```text
POST /credenciales → loginController → tokens.js → cookie _token
petición privada → protegerRutas.js → tokens.js → Usuario.scope("sinClave")
controlador/reporte → fechas.js + modelos → vista o CSV
controlador CRUD → utiles.js + validadores → vista con mensajes
```

## Notas de mantenimiento

- No imprimir el token, la contraseña ni `SC_JWT` en consola.
- No quitar el scope `sinClave` de consultas que pasan datos a las vistas.
- Si se cambia la zona horaria, cambiarla de forma consistente en aplicación y conexión y volver a revisar reportes alrededor de medianoche.
- `SameSite=Strict` y `HttpOnly` reducen riesgos de cookie, pero no sustituyen una revisión de seguridad completa; límites conocidos están en `doc/05-seguridad.md`.
