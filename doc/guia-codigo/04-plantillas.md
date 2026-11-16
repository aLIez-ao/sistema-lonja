# 04 — Plantillas

Las vistas de `views/` son plantillas EJS que el servidor convierte en HTML. Reciben información del controlador; no consultan la base por su cuenta.

Las vistas de cada área (tienda, pedidos, usuarios, lotes, reportes y comunidad) presentan listas, formularios y detalles. `views/plantillas/` contiene piezas compartidas como estructura, navegación y mensajes; así una corrección común puede reflejarse en muchas páginas.

EJS escapa texto con `<%= valor %>`. Mantén ese escape para datos que ingresan personas, como preguntas, nombres y opiniones. `<%- ... %>` imprime HTML sin escapar y debe reservarse para contenido confiable, como una plantilla parcial.

Para localizar una pantalla usa [el inventario de vistas](08-inventario-vistas.md); para entender qué datos le entrega el controlador revisa [el recorrido](06-recorridos.md).
