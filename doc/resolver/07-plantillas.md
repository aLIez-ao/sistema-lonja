# 07 — Plantillas EJS

EJS combina datos con HTML. `<%= valor %>` imprime texto escapado; conserva esa forma para comentarios, nombres, preguntas y opiniones que ingresaron usuarios. `<%- ... %>` se reserva para incluir plantillas o iconos confiables.

## Estructura

- `views/plantillas/header.ejs` y `footer.ejs`: armazón compartido, navegación, recursos y cierre de página.
- `views/plantillas/mensajes.ejs`: mensajes temporales para formularios.
- `views/plantillas/barra-listado.ejs`, `encabezado-orden.ejs`, `paginacion.ejs`: controles reusables en listados.
- `views/plantillas/avatar.ejs`, `campo-foto.ejs`, `campo-password.ejs`: componentes comunes de formulario.
- `views/error.ejs`: página de error legible.

## Pantallas

| Carpeta | Pantallas y finalidad |
|---|---|
| `views/login/` | Acceso, olvido y nueva contraseña |
| `views/registro/` | Registro y aviso de verificación |
| `views/tienda/` | Portada, ficha de lote, ficha de catálogo, tarjetas y filas de productos |
| `views/carrito/`, `views/pedido/` | Carrito, datos de checkout y simulación de pago |
| `views/cuenta/` | Resumen, perfil, direcciones, pedidos, favoritos, listas y preguntas |
| `views/pedidos/`, `views/social/` | Seguimiento del personal y moderación de contenido |
| `views/catalogo/`, `views/compradores/`, `views/compras/`, `views/especies/`, `views/lotes/`, `views/tipos/`, `views/usuarios/` | Formularios, listados, detalles y facturas del área administrativa |
| `views/configuracion/` | Preferencias, cuenta, correo y seguridad |
| `views/reportes/`, `views/inicio.ejs` | Reporte anual en pantalla y tablero |

Una plantilla no debe calcular precios confiables ni decidir permisos: eso pertenece al servidor. El HTML de EJS debe recibir datos que ya filtró el controlador.
