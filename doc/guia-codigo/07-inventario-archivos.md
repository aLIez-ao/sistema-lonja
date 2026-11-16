# 07 — Inventario de archivos

Este mapa ayuda a encontrar el área del código antes de modificarla.

| Ruta | Responsabilidad |
|---|---|
| `index.js`, `app.js` | Arranque del proceso y configuración Express. |
| `config/` | Conexión y configuración de la base de datos. |
| `models/` | Tablas Sequelize y asociaciones en `models/index.js`. |
| `controllers/` | Reglas y respuestas de cada función web. |
| `routes/` | URLs, métodos HTTP, validaciones y permisos. |
| `middleware/` | Autenticación, autorización y procesamiento compartido. |
| `helpers/` | Reglas reutilizables, correo, pedidos, facturas y formatos. |
| `views/` | Plantillas EJS que generan las páginas. |
| `public/` | CSS, JavaScript e imágenes del navegador. |
| `scripts/` | Tareas locales y datos de demostración. |
| `test/` | Pruebas automatizadas de rutas y reglas. |
| `doc/` | Referencia operativa y diagramas de esta versión. |

Para entender dependencias, sigue el recorrido: `routes/` → `controllers/` → `helpers/` y `models/` → respuesta EJS o JSON.
