# 07 — Rutas: direcciones y permisos

Una ruta relaciona verbo HTTP y dirección con una función del controlador. Los routers agrupan rutas por tema. `app.js` monta cada grupo con un prefijo y aplica la autenticación común.

## Archivos de router

| Archivo | Prefijo al montarlo | Función |
|---|---|---|
| `routes/login_router.js` | `/` | Pantalla de login, recepción de credenciales, inicio y cierre de sesión. `/inicio` aplica `rutaProteger` dentro del router. |
| `routes/tipo_router.js` | `/tipos` | Lista, alta, edición y borrado de tipos. Borrado solo admin. |
| `routes/comprador_router.js` | `/compradores` | CRUD de compradores. Borrado solo admin. |
| `routes/lote_router.js` | `/lotes` | CRUD de lotes. Borrado solo admin. |
| `routes/especie_router.js` | `/especies` | CRUD de especies. Borrado solo admin. |
| `routes/compra_router.js` | `/compras` | CRUD de compras. Borrado solo admin. |
| `routes/reporte_router.js` | `/reportes` | Página diaria y descarga CSV; requiere sesión. |
| `routes/usuario_router.js` | `/usuarios` | CRUD de usuarios; `app.js` protege todo el grupo para admin. |

Los routers CRUD importan validaciones y funciones desde el controlador de su módulo. `GET` muestra, `POST` crea, `PUT` actualiza y `DELETE` elimina. Los formularios HTML no envían PUT/DELETE nativamente; `method-override` en `app.js` convierte `?_method=PUT` o `?_method=DELETE`.

## Tabla de rutas principales

| Método | Dirección | Función |
|---|---|---|
| GET | `/` | Formulario de acceso |
| POST | `/credenciales` | Valida credenciales, establece cookie, redirige |
| GET | `/cerrarsesion` | Borra cookie |
| GET | `/inicio` | Resumen diario; exige sesión |
| GET | `/reportes/diario?fecha=AAAA-MM-DD` | Reporte diario; exige sesión |
| GET | `/reportes/diario.csv?fecha=AAAA-MM-DD` | Descarga del reporte; exige sesión |
| GET | `/{modulo}` | Lista del módulo |
| GET | `/{modulo}/crear` | Formulario de nuevo registro |
| POST | `/{modulo}` | Alta validada |
| GET | `/{modulo}/:id/editar` | Formulario de edición |
| PUT | `/{modulo}/:id` | Actualización validada |
| DELETE | `/{modulo}/:id` | Borrado de administrador |
| GET/POST | `/usuarios`, `/usuarios/crear` | Lista y alta (solo admin) |

En las rutas CRUD, `{modulo}` se sustituye por `tipos`, `compradores`, `lotes`, `especies` o `compras`. El identificador puede llamarse distinto en la tabla (`id_tpo`, `codigo_cpr`, etc.), pero en la URL se recibe como `req.params.id`.

## Dónde se aplican permisos

- `app.js` monta `/tipos`, `/compradores`, `/lotes`, `/especies`, `/compras` y `/reportes` detrás de `rutaProteger`.
- `routes/*_router.js` añade `permitir("admin")` a los endpoints DELETE de catálogos y compras.
- `app.js` monta `/usuarios` con `rutaProteger` y `permitir("admin")` para todas sus operaciones.
- `login_router.js` protege `/inicio` por separado, pues está dentro del router público raíz.

La lista completa de acciones/roles y sus validaciones también aparece en `doc/03-rutas-y-permisos.md`.
