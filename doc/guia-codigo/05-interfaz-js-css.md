# 05 — Interfaz JavaScript y CSS

El servidor genera las páginas, pero algunos controles responden en el navegador sin volver a cargar todo el contenido. Esos scripts y estilos viven en `public/`.

- `public/css/` define presentación y componentes visuales.
- `public/js/` contiene interacción de formularios, menús, filtros, carrito y módulos de tienda.
- `public/img/` y otros recursos estáticos aportan imágenes e iconos.
- Bootstrap se sirve localmente desde las dependencias del proyecto.

Una interacción suele comenzar en un botón o formulario de una vista EJS, ejecutar JavaScript del navegador y llamar una ruta HTTP. El router vuelve a validar permisos y el controlador actualiza datos; el navegador muestra la respuesta. No confíes en una validación hecha solo en JavaScript: las reglas importantes también deben existir en el servidor.

Para ubicar la plantilla correspondiente consulta [inventario de vistas](08-inventario-vistas.md); las rutas HTTP se describen en [rutas y permisos](../03-rutas-y-permisos.md).
