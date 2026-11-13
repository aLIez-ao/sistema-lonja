# Rutas y permisos

Roles: **admin** (todo), **capturista** (captura y consulta; no borra ni administra usuarios) y **comprador** (tienda y cuenta propia).
"Sesión" = cookie `_token` válida de un usuario activo. Sin sesión, una ruta privada redirige a `/acceso?volver=…` (la ruta original solo si es interna); un POST redirige a `/acceso`.

## Públicas

| Método | Ruta | Acción |
|---|---|---|
| GET | `/` | Portada de la tienda: héroe, categorías, lotes disponibles, filtros y búsqueda |
| GET | `/tienda/lote/:id` | Detalle público de un lote (avisa si ya se vendió y sugiere lotes parecidos) |
| GET | `/tienda/especie/:id` | Ficha pública de una especie del catálogo |
| GET | `/tienda/sugerencias?q=…` | Sugerencias del buscador público (JSON, máximo 8; 30 por minuto y por IP) |
| GET | `/acceso` | Formulario de acceso |
| POST | `/credenciales` | Valida usuario y contraseña, crea la cookie y redirige a la ruta pedida (`volver`) o al inicio del rol (401 si fallan; 429 tras 5 fallos seguidos) |
| POST | `/cerrarsesion` | Borra la cookie (un `GET /cerrarsesion` solo redirige a `/`) |
| GET/POST | `/registro` | Alta pública de comprador: crea la cuenta sin verificar y envía el correo de verificación |
| GET/POST | `/olvide-password` | Solicitar el enlace de recuperación (por correo o usuario) |
| GET/POST | `/recuperar-password/:token` | Definir una contraseña nueva con el enlace recibido |
| GET | `/verificar-email/:token` | Confirmar el correo de la cuenta (después enlaza al comprador de mostrador si aún no lo está) |
| GET | `/inicio` | Redirección permanente 301 a `/dashboard` para enlaces anteriores |

La tienda nunca expone nombres, correos ni montos de compradores: solo muestra lotes sin `Compra` que tengan al menos una especie y el catálogo activo.

## Con sesión de comprador

| Método | Ruta | Acción |
|---|---|---|
| GET | `/cuenta` | Resumen de la cuenta |
| GET/POST | `/cuenta/datos` | Ver / actualizar los datos personales |
| GET | `/cuenta/direcciones` | Lista de direcciones de entrega |
| GET/POST | `/cuenta/direcciones/nueva`, `/cuenta/direcciones` | Formulario / alta de una dirección |
| GET/PUT | `/cuenta/direcciones/:id/editar`, `/cuenta/direcciones/:id` | Editar una dirección propia |
| DELETE | `/cuenta/direcciones/:id` | Eliminar una dirección propia |
| POST | `/cuenta/direcciones/:id/principal` | Marcar una dirección como principal |
| GET/POST | `/carrito`, `/carrito/agregar/:id_lte`, `/carrito/quitar/:id_lte`, `/carrito/vaciar` | Consultar y cambiar el carrito propio |
| GET/POST | `/pedido`, `/pedido/:id/pago`, `/pedido/:id/pagar`, `/pedido/:id/cancelar` | Checkout, pago simulado, cancelación del pedido propio |
| GET | `/cuenta/pedidos`, `/cuenta/pedidos/:id`, `/cuenta/pedidos/:id/factura/:id_cmp[.pdf]` | Historial, detalle y factura propia |
| GET | `/cuenta/opiniones` | Opiniones propias y especies compradas pendientes de calificar |
| DELETE | `/cuenta/opiniones/:id` | Eliminar una opinión propia (una ajena responde 404) |
| GET/POST/PUT/DELETE | `/cuenta/listas`, `/cuenta/listas/:id`, `/cuenta/listas/:id/items`, `/cuenta/favoritos` | Listas y favoritos privados |
| GET/POST | `/cuenta/preguntas`, `/tienda/preguntas` | Consultar o enviar preguntas (máximo 5 por hora) |
| POST | `/tienda/especie/:id/opiniones` | Crear o editar una opinión solo tras una compra verificada |

Las opiniones en páginas públicas muestran el nombre abreviado del autor (nombre e inicial del apellido). La cuenta puede editar o eliminar sus opiniones y volver a calificarlas desde el enlace a la especie.

El `:id` de otra persona responde **404**. `/dashboard` exige rol `admin` o `capturista`; el comprador recibe 403 y su inicio es la tienda. Las cuentas de comprador solo nacen en `/registro` (no las crea el admin) y el admin únicamente puede desactivarlas, sin cambiarles el rol.

## Con sesión (admin y capturista)

| Método | Ruta | Acción |
|---|---|---|
| GET | `/dashboard` | Tablero: indicadores de hoy y del mes, gráficas, avance de lotes y últimas compras |
| GET | `/reportes/diario?anio=AAAA` | **Reporte anual** con selector de año, gráficas y compras por mes (año actual si falta o es inválido) |
| GET | `/pedidos`, `/pedidos/:id` | Búsqueda, filtro, orden, paginación y detalle de pedidos de tienda |
| POST | `/pedidos/:id/estado` | Transición de una etapa: pagado → preparando → enviado → entregado; correo al enviar y entregar |
| GET/POST | `/preguntas`, `/preguntas/:id` | Revisar, responder u ocultar preguntas |
| GET/POST | `/opiniones`, `/opiniones/:id` | Moderar visibilidad de opiniones |
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
