# 08 — Inventario de vistas

Las plantillas EJS viven en `views/`; cada controlador selecciona una mediante `res.render()`. Las partes que comienzan con `_` suelen ser componentes compartidos.

| Carpeta | Qué buscar |
|---|---|
| `views/plantillas/` | Estructura común, encabezado, pie, menús y mensajes. |
| `views/tienda/` | Página pública, catálogo y detalle de producto. |
| `views/comprador/` | Registro, perfil, direcciones, carrito y pedidos del comprador. |
| `views/pedidos/` | Checkout, confirmación, facturas y gestión operativa de pedidos. |
| `views/lotes/`, `views/especies/` | Captura, edición y consulta de inventario. |
| `views/compradores/`, `views/tipos/` | Catálogos del panel de operación. |
| `views/usuarios/`, `views/login/` | Administración de cuentas y acceso. |
| `views/listas/`, `views/preguntas/`, `views/opiniones/` | Favoritos y participación en la comunidad. |
| `views/reportes/` | Consultas y exportaciones de ventas. |

Los nombres pueden variar por módulo. Para confirmar qué plantilla usa una URL, busca `res.render(` en el controlador citado por su router.
