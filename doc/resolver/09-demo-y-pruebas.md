# 09 — Datos demostrativos y pruebas

## `scripts/demo.js`

Carga un conjunto pequeño de muestra para explorar la aplicación: compradores ficticios, lotes, especies y algunas compras. Reutiliza los tipos iniciales, calcula los totales con `redondea` y cierra la conexión al final. Se ejecuta con `npm run demo` y espera que las tablas existan (arranca el servidor al menos una vez antes).

El script usa `findOrCreate` para los compradores, pero crea lotes en cada ejecución; por tanto, volverlo a correr puede duplicar lotes y operaciones de muestra. No ejecutarlo sobre una base productiva.

## `test/flujo.test.js`

Prueba el sistema completo a través de HTTP real, con Sequelize y SQLite en memoria. Define configuración de prueba, importa la app, crea servidor temporal, simula cookies por usuario y lo cierra al terminar.

Comprueba: acceso protegido, login bueno/malo, cookie segura, tokens falsos, roles, validación de formularios, creación de comprador/lote/especie/compra, total del lado servidor, restricción de lote vendido, edición, reporte HTML/CSV, escape de HTML, desactivación de usuario, auto protección del admin, 404 y pantallas principales.

Comando: `npm test`. Es una prueba de comportamiento en SQLite; no confirma por sí sola el funcionamiento de una instalación MariaDB real. La documentación de pruebas en `doc/06-pruebas.md` señala ese límite.

## Archivos que no son lógica de aplicación

- `package-lock.json`: versiones exactas instaladas por npm.
- `.env.example`: muestra las variables requeridas sin valores secretos reales.
- `public/img/*`: recursos visuales; no contienen reglas de negocio.
- `node_modules/`: dependencias de terceros; no editar ni incluir como código propio en esta guía.

## Flujo recomendado al colaborar

1. Identifica la pantalla o regla que se quiere cambiar.
2. Sigue el mapa en `01-mapa-y-flujos.md` hasta router, controlador, modelo y vista.
3. Cambia las capas que correspondan; respeta validaciones, permisos y escapes EJS.
4. Ejecuta `npm test` si el cambio afecta comportamiento y añade una prueba para una regla nueva.
5. Si cambió una tabla o regla de negocio, actualiza también `doc/` y este mapa si hace falta.
6. Para despliegue, revisa instalación, seguridad y variables en `doc/README.md`.
