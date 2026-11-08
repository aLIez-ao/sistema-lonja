# 05 — Controladores de acceso, inicio y reportes

Un controlador recibe una petición ya encaminada por Express. Consulta modelos y decide si devuelve una página, redirige o responde con un archivo.

## `controllers/loginController.js`

Administra el acceso y la página principal.

- `reglasLogin`: exige usuario y contraseña.
- `login`: presenta el formulario.
- `credenciales`: valida campos, busca la cuenta, compara contraseña con bcrypt (usa un hash ficticio cuando no existe cuenta para reducir diferencias de tiempo) y responde con el mismo mensaje ante usuario/clave incorrectos o cuenta inactiva. Si todo coincide, crea JWT, guarda cookie `_token` y redirige a `/inicio`.
- `principal`: busca las compras del día local, suma importe y calcula lotes aún libres; entrega los valores a `views/inicio.ejs`.
- `cerrarsesion`: elimina cookie y vuelve al login.

Depende de `Usuario`, `Compra`, `Lote`, `helpers/tokens.js`, `helpers/fechas.js` y validaciones.

## `controllers/reporteController.js`

Construye el mismo conjunto de datos para la página y para el archivo CSV.

- `fechaDe(req)`: acepta `?fecha=AAAA-MM-DD`; si no es válida, usa hoy.
- `datosReporte(fecha)`: consulta compras dentro del inicio inclusivo y fin exclusivo del día; incluye comprador, lote, especies y tipo; crea filas legibles; suma cajas, kilos e importe; agrupa totales por comprador.
- `diario`: renderiza `views/reportes/diario.ejs` con filas, resumen y totales.
- `diarioCsv`: convierte las mismas filas en CSV, entrecomilla y escapa comillas, establece encabezados de descarga y antepone BOM para que hojas de cálculo interpreten acentos.

Si se agrega una columna, normalmente se modifica `datosReporte` y después tanto la vista como la lista de columnas CSV.

## `controllers/usuarioController.js`

Gestiona cuentas del personal (el acceso a todo este controlador se protege a nivel de `app.js`). Lista usando `scope("sinClave")`; presenta alta/edición; aplica reglas de nombre, usuario, contraseña y rol; crea y actualiza; permite contraseña nueva solo si se proporciona; y evita que un admin se desactive, se quite el rol admin o se elimine a sí mismo.

La ruta de borrado está protegida por el montaje de `/usuarios` en `app.js`; el controlador además evita autoeliminación.

## Vistas relacionadas

- Acceso: `views/login/login.ejs`.
- Resumen del día: `views/inicio.ejs`.
- Reporte de pantalla: `views/reportes/diario.ejs`.
- Administración de usuarios: `views/usuarios/index.ejs` y `views/usuarios/formulario.ejs`.

Las vistas muestran lo que el controlador prepara; deben escapar texto de usuario con `<%= ... %>`. EJS `<%- ... %>` se reserva para incluir plantillas confiables.
