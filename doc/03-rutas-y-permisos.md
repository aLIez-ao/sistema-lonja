# Rutas y permisos

Roles: **admin** (todo) y **capturista** (captura y consulta; no borra ni administra usuarios).
"Sesión" = cookie `_token` válida de un usuario activo. Sin sesión, cualquier ruta privada redirige a `/`.

## Públicas

| Método | Ruta | Acción |
|---|---|---|
| GET | `/` | Formulario de acceso |
| POST | `/credenciales` | Valida usuario y contraseña, crea la cookie y redirige a `/inicio` (401 si fallan) |
| GET | `/cerrarsesion` | Borra la cookie |

## Con sesión (admin y capturista)

| Método | Ruta | Acción |
|---|---|---|
| GET | `/inicio` | Resumen del día: compras, importe y lotes sin comprar |
| GET | `/reportes/diario?fecha=AAAA-MM-DD` | **Reporte diario** (hoy si no se indica fecha o es inválida) |
| GET | `/reportes/diario.csv?fecha=…` | Mismo reporte en CSV (abre en Excel con acentos) |

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

## Solo administrador

| Método | Ruta | Acción |
|---|---|---|
| GET/POST | `/usuarios`, `/usuarios/crear` | Listar / crear usuarios |
| GET/PUT/DELETE | `/usuarios/:id…` | Editar (rol, activo, contraseña opcional) / eliminar |

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
| Usuario | 3–40 caracteres (letras, números, `. - _`); contraseña de 8 a 72 caracteres |

Los errores se muestran en el mismo formulario (HTTP 400) conservando lo que se escribió.
