# 09 — Pruebas y datos demo

## Pruebas

Ejecuta `npm test`. `test/ayuda.js` pone SQLite en memoria, crea la app real y ofrece un pequeño cliente que conserva la cookie. Cada prueba puede enviar GET y POST y revisar estado, redirección o HTML sin usar un navegador manual.

Los archivos `.test.js` siguen los temas descritos en [doc/06-pruebas.md](../doc/06-pruebas.md): cuentas, búsqueda, filtros, factura, tienda, pedido, comunidad y generador demo. Al crear una función nueva, añade una prueba con éxito y otra con rechazo/permisos.

## Generador

`scripts/demo.js` es a la vez:

- **Función importable** `cargarDemo(db)`, para pruebas.
- **Herramienta CLI** `npm run demo`, para crear datos de exploración.
- **Reemplazo controlado** `npm run demo -- --limpio --confirmar`, que borra solo filas guardadas en la tabla interna `demo_registro` y luego las crea de nuevo. El comando se bloquea si falta confirmación o si `NODE_ENV=production`.

La contraseña compartida `LonjaDemo2026` y las cuentas que imprime son **solo para desarrollo**. Cambia o elimina esas cuentas si llevas los datos a un ambiente compartido.
