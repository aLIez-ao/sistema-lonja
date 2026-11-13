# 12 — Inventario de pantallas EJS

Todas estas plantillas las presenta un controlador mediante `res.render()`. Las vistas parciales cuyo nombre empieza por `_` se insertan dentro de otra página, para que las acciones comunes no se repitan.

| Archivo | Para qué existe |
|---|---|
| `views/error.ejs` | Explica una respuesta 404/500 y permite regresar |
| `views/inicio.ejs` | Indicadores de operación, pedidos pendientes, gráficos y compras recientes |
| `views/login/login.ejs` | Formulario de acceso |
| `views/login/olvide-password.ejs` | Solicitud de recuperación de cuenta |
| `views/login/recuperar-password.ejs` | Formulario de nueva contraseña |
| `views/registro/formulario.ejs` | Alta de cuenta de comprador |
| `views/registro/revisa.ejs` | Aviso de que debe verificarse el correo |
| `views/tienda/index.ejs` | Inicio de tienda: filtros y filas de lotes |
| `views/tienda/lote.ejs` | Información, disponibilidad, carrito y preguntas de un lote |
| `views/tienda/especie.ejs` | Descripción, calificaciones, opiniones y lotes de un catálogo |
| `views/tienda/_tarjeta-lote.ejs` | Tarjeta reutilizada en cuadrículas de tienda |
| `views/tienda/_fila-temas.ejs` | Fila horizontal de lotes relacionados |
| `views/carrito/index.ejs` | Revisión del carrito del comprador |
| `views/pedido/nuevo.ejs` | Elegir entrega y dirección, revisar importes de checkout |
| `views/pedido/pago.ejs` | Datos del simulador y plazo de la reserva |
| `views/cuenta/resumen.ejs` | Inicio personal del comprador y accesos a sus datos |
| `views/cuenta/datos.ejs` | Datos personales y estado de verificación |
| `views/cuenta/direcciones.ejs` | Lista de direcciones guardadas |
| `views/cuenta/direccion-formulario.ejs` | Crear o editar una dirección propia |
| `views/cuenta/pedidos.ejs` | Historial de pedidos de la cuenta |
| `views/cuenta/pedido.ejs` | Detalle, estado, artículos y facturas de un pedido propio |
| `views/cuenta/listas.ejs` | Listas del comprador y formulario para crear otra |
| `views/cuenta/lista.ejs` | Contenido, cambio de nombre y eliminación de una lista |
| `views/cuenta/preguntas.ejs` | Preguntas propias y respuestas recibidas |
| `views/pedidos/index.ejs` | Búsqueda y seguimiento de pedidos para el personal |
| `views/pedidos/detalle.ejs` | Entrega, comprador, artículos, factura y avance de estado |
| `views/social/preguntas.ejs` | Responder u ocultar preguntas desde personal |
| `views/social/opiniones.ejs` | Ocultar o volver a publicar opiniones |
| `views/catalogo/index.ejs` | Lista del catálogo de especies |
| `views/catalogo/formulario.ejs` | Crear/editar una ficha del catálogo |
| `views/compradores/index.ejs` | Compradores y accesos a sus fichas |
| `views/compradores/formulario.ejs` | Alta/edición de comprador de mostrador |
| `views/compradores/detalle.ejs` | Datos de contacto, cuenta vinculada y compras |
| `views/compras/index.ejs` | Ventas de mostrador, facturas y origen en línea si aplica |
| `views/compras/formulario.ejs` | Registrar/editar la compra tradicional |
| `views/compras/factura.ejs` | Página completa de factura |
| `views/compras/factura-parcial.ejs` | Respuesta pequeña para la vista superpuesta |
| `views/compras/_hoja-factura.ejs` | Hoja que contiene los datos de factura |
| `views/compras/_acciones-factura.ejs` | Descargar, enviar, imprimir y abrir factura |
| `views/compras/_modal-factura.ejs` | Contenedor para mostrar la factura sobre el listado |
| `views/lotes/index.ejs` | Lotes del módulo de personal |
| `views/lotes/formulario.ejs` | Crear/editar lote |
| `views/lotes/detalle.ejs` | Resumen operativo de lote y enlaces a sus registros |
| `views/especies/index.ejs` | Especies registradas por lote |
| `views/especies/formulario.ejs` | Asociar especie a un lote |
| `views/especies/detalle.ejs` | Ficha operativa de especie |
| `views/tipos/index.ejs` | Lista de tipos de producto |
| `views/tipos/formulario.ejs` | Crear/editar tipo |
| `views/tipos/detalle.ejs` | Tipo y datos relacionados |
| `views/usuarios/index.ejs` | Cuentas y permisos para admin |
| `views/usuarios/formulario.ejs` | Crear/editar una cuenta autorizada |
| `views/configuracion/index.ejs` | Preferencias, cookie, correo y seguridad del perfil |
| `views/reportes/anual.ejs` | Gráficos, compras mensuales y descarga de reportes |
| `views/plantillas/header.ejs` | `<head>`, menú por rol, idiomas y temas |
| `views/plantillas/footer.ejs` | JavaScript compartido y cierre del HTML |
| `views/plantillas/mensajes.ejs` | Alertas y errores reusables |
| `views/plantillas/avatar.ejs` | Avatar de usuario con alternativa accesible |
| `views/plantillas/campo-foto.ejs` | Entrada y previsualización de foto |
| `views/plantillas/campo-password.ejs` | Entrada de contraseña, mostrar/ocultar y reglas |
| `views/plantillas/barra-listado.ejs` | Búsqueda y panel de filtros |
| `views/plantillas/encabezado-orden.ejs` | Orden de columna para listados |
| `views/plantillas/paginacion.ejs` | Navegación entre páginas |

Si agregas una nueva pantalla, registra aquí qué datos espera y cuál recorrido de usuario atiende. La validación real y el control de acceso deben vivir también en el servidor.
