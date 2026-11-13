# 04 — Rutas y permisos

Una ruta conecta una URL con una función. Los routers viven en `routes/`; `app.js` los monta bajo un prefijo y les pone el control de acceso que les corresponde.

## Rutas de entrada por rol

| Usuario | Lugares a los que entra | Objetivo |
|---|---|---|
| Sin cuenta | `/`, `/tienda/*`, `/acceso`, `/registro` | Explorar y crear cuenta |
| Comprador | `/carrito`, `/pedido/*`, `/cuenta/*` | Comprar y consultar solo sus propios datos |
| Personal | `/inicio`, `/pedidos`, `/preguntas`, `/opiniones`, módulos CRUD | Operar la lonja y atender la tienda |
| Admin | Todo lo del personal y `/usuarios` | Administrar cuentas y acciones exclusivas |

## Routers (uno por archivo)

| Router | URLs que registra |
|---|---|
| `routes/login_router.js` | `/acceso`, `/credenciales`, `/inicio`, recuperación, verificación y sesión |
| `routes/registro_router.js` | Registro público de comprador |
| `routes/tienda_router.js` | Portada `/` y fichas públicas `/tienda/*`; preguntas/opiniones requieren comprador |
| `routes/carrito_router.js` | Consultar, agregar, quitar y vaciar carrito |
| `routes/pedido_router.js` | Checkout, pago, cancelación |
| `routes/pedido_admin_router.js` | Lista, detalle y estado de los pedidos del personal |
| `routes/cuenta_router.js` | Perfil, direcciones, pedidos, listas, favoritos y preguntas propias |
| `routes/catalogo_router.js` | Catálogo administrativo de especies |
| `routes/compra_router.js` | Ventas de mostrador y sus facturas |
| `routes/comprador_router.js` | Fichas y registros de compradores |
| `routes/especie_router.js` | Especies por lote para el personal |
| `routes/lote_router.js` | Gestión operativa de lotes |
| `routes/tipo_router.js` | Gestión de tipos |
| `routes/usuario_router.js` | Administración de usuarios |
| `routes/reporte_router.js` | Reportes web, CSV y PDF |
| `routes/busqueda_router.js` | Sugerencias internas de búsqueda |
| `routes/configuracion_router.js` | Preferencias, perfil, correo y seguridad |

Los routers de tipos, lotes, compradores, especies, compras y usuarios no se protegen por estar ocultos en el menú: `app.js` aplica middleware de servidor. Las consultas de cuenta filtran por `req.usuario.id`; una URL con el identificador de otra persona devuelve 404.

El detalle exhaustivo de métodos y rutas está en [doc/03-rutas-y-permisos.md](../doc/03-rutas-y-permisos.md).
