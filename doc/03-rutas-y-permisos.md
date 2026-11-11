# Rutas y permisos

Roles: **admin** (todo) y **capturista** (captura y consulta; no borra ni administra usuarios).
"Sesión" = cookie `_token` válida de un usuario activo. Sin sesión, cualquier ruta privada redirige a `/`.

## Públicas

| Método | Ruta | Acción |
|---|---|---|
| GET | `/` | Formulario de acceso |
| POST | `/credenciales` | Valida usuario y contraseña, crea la cookie y redirige a `/inicio` (401 si fallan; 429 tras 5 fallos seguidos) |
| POST | `/cerrarsesion` | Borra la cookie (un `GET /cerrarsesion` solo redirige) |
| GET/POST | `/olvide-password` | Solicitar el enlace de recuperación (por correo o usuario) |
| GET/POST | `/recuperar-password/:token` | Definir una contraseña nueva con el enlace recibido |
| GET | `/verificar-email/:token` | Confirmar el correo de la cuenta |

## Con sesión (admin y capturista)

| Método | Ruta | Acción |
|---|---|---|
| GET | `/inicio` | Tablero: indicadores de hoy y del mes, gráficas, avance de lotes y últimas compras |
| GET | `/reportes/diario?anio=AAAA` | **Reporte anual** con selector de año, gráficas y compras por mes (año actual si falta o es inválido) |
| GET | `/reportes/anual.pdf?anio=AAAA` | Reporte anual oficial en PDF |
| GET | `/reportes/diario.csv?anio=AAAA` o `?fecha=AAAA-MM-DD` | Reporte en CSV (abre en Excel con acentos) |
| GET | `/configuracion` | Apariencia, cookies y privacidad, cuenta y seguridad |
| POST | `/configuracion/guardar`, `/guardar-rapido`, `/cookies`, `/actualizar-cuenta`, `/solicitar-verificacion`, `/cambiar-password` | Guardan preferencias, consentimiento de cookies y datos de la cuenta |
| GET | `/buscar/sugerencias?entidad=…&q=…` | Sugerencias del buscador (JSON, máximo 8). `entidad`: `compras`, `lotes`, `especies`, `compradores`, `tipos`, `usuarios`. `q` de 2 a 60 caracteres; `usuarios` solo para admin (403 a otros) |

CRUD de cada módulo (`{m}` = `tipos`, `compradores`, `lotes`, `especies`, `compras`):

| Método | Ruta | Acción | Rol |
|---|---|---|---|
| GET | `/{m}` | Lista | admin, capturista |
| GET | `/{m}/crear` | Formulario de alta | admin, capturista |
| POST | `/{m}` | Registrar (con validación) | admin, capturista |
| GET | `/{m}/:id/editar` | Formulario de edición | admin, capturista |
| PUT | `/{m}/:id` | Actualizar (`?_method=PUT`) | admin, capturista |
| DELETE | `/{m}/:id` | Eliminar (`?_method=DELETE`) | **solo admin** (otros: 403) |

El `:id` es `id_tpo`, `codigo_cpr`, `id_lte`, `id_epe` o `id_cmp` según el módulo.

**Páginas de detalle** (solo lectura, con enlaces a los registros relacionados): `GET /compradores/:id`, `/lotes/:id`, `/especies/:id` y `/tipos/:id`. Si el id no existe redirigen a la lista con un mensaje. En compras, el detalle es la factura:

| Método | Ruta | Acción |
|---|---|---|
| GET | `/compras/:id/factura` | Factura en página completa |
| GET | `/compras/:id/factura?parcial=1` | Solo la hoja y sus acciones (la usa la ventana superpuesta de `/compras`) |
| GET | `/compras/:id/factura.pdf` | Factura en PDF (`?ver=1` la muestra en el navegador) |
| POST | `/compras/:id/enviar-correo` | Envía la factura en PDF al correo del comprador |

## Parámetros de los listados

Las seis listas (`compras`, `lotes`, `especies`, `compradores`, `tipos`, `usuarios`) aceptan los mismos parámetros en la URL. Los valores no válidos se ignoran o se normalizan; cambiar `tam`, `orden`, `q` o un filtro vuelve a la página 1.

| Parámetro | Valores |
|---|---|
| `pagina` | entero ≥ 1 (se ajusta a la última página) |
| `tam` | 10, 25 (por defecto), 50 o 100 |
| `orden`, `dir` | columna de la lista blanca de cada tabla y `asc` o `desc` |
| `q` | texto (hasta 60 caracteres); búsqueda literal, `%` y `_` no son comodines |

Filtros por entidad:

| Entidad | Filtros |
|---|---|
| compras | `desde`, `hasta`, `comprador`, `tipo`, `totalMin`, `totalMax` |
| lotes | `estado`, `desde`, `hasta`, `tipo`, `kilosMin`, `kilosMax` |
| especies | `tipo`, `estado` |
| compradores | `compras`, `correo` |
| tipos | solo búsqueda |
| usuarios | `rol`, `activo`, `verificado` |

Las fechas (`AAAA-MM-DD`) se interpretan en la zona horaria de la aplicación (`APP_TZ`).

## Solo administrador

| Método | Ruta | Acción |
|---|---|---|
| GET/POST | `/usuarios`, `/usuarios/crear` | Listar / crear usuarios |
| GET/PUT/DELETE | `/usuarios/:id…` | Editar (rol, activo, contraseña opcional) / eliminar |
| POST | `/usuarios/:id/restablecer` | Envía al usuario un enlace para definir su contraseña |

Un capturista que entra a `/usuarios` recibe **403**. Un admin no puede desactivarse, quitarse el rol ni eliminarse a sí mismo.

## Validaciones principales

| Campo | Regla |
|---|---|
| Lote.kilos | número > 0 |
| Lote.numero_cajas | entero 0 – 32767 |
| Lote.precio_kilo_salida | número ≥ 0 |
| Compra.precio_kilo_final | número > 0 |
| Compra | lote existente y sin comprar; comprador existente |
| Comprador | nombre y apellido paterno obligatorios; longitudes del diagrama; correo válido y único |
| Usuario | 3–40 caracteres (letras, números, `. - _`); correo obligatorio; contraseña de 8 a 72 caracteres con los requisitos de `helpers/seguridad.js` |

Los errores se muestran en el mismo formulario (HTTP 400) conservando lo que se escribió.
