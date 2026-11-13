# Pruebas

```bash
npm test
```

El proyecto usa `node:test`, SQLite en memoria y solicitudes HTTP contra la aplicación real. Las suites inicializan una base limpia mediante `test/ayuda.js`, por lo que no requieren MariaDB ni envían correo real.

## Resultado verificado

La suite completa tiene **145 pruebas aprobadas, 0 fallidas** (12 de noviembre de 2026).

| Archivo | Alcance |
|---|---|
| `test/auditoria.test.js` | Correcciones de la auditoría de registro, comprador y cambios de correo |
| `test/busqueda.test.js`, `test/filtros.test.js`, `test/listados.test.js` | Búsqueda literal, filtros, orden y paginación |
| `test/catalogo.test.js`, `test/comprador.test.js`, `test/formularios.test.js` | Catálogo y cuentas de comprador |
| `test/cookies.test.js`, `test/cuentas.test.js`, `test/correo.test.js`, `test/sesion-ui.test.js` | Sesión, correo, verificación, recuperación y preferencias |
| `test/detalles.test.js`, `test/factura-modal.test.js`, `test/flujo.test.js`, `test/nuevas_funcionalidades.test.js` | Operación de mostrador, detalles, factura y regresiones anteriores |
| `test/tienda.test.js`, `test/pedidos.test.js`, `test/pedidos-admin.test.js` | Compra en línea, reservas, facturación y flujo de administración |
| `test/social.test.js` | Privacidad de listas, moderación, límites y opinión respaldada por compra |
| `test/usuarios.test.js` | Separación de trabajadores y clientes, búsquedas/páginas independientes y permisos |
| `test/correo-configurar.test.js` | Validación y actualización segura de `.env` en directorios temporales; contraseña ausente de la salida |
| `test/tienda-publica.test.js` | Comprueba que tienda, fichas y sugerencias no revelen datos personales ni montos de compradores |
| `test/demo.test.js` | Repetibilidad, datos coherentes y borrado por marcas de demo |
| `test/pedidos.test.js` | Incluye expiración y liberación de lotes, competencia entre compradores, doble pago y cinco rechazos de tarjeta |
| `test/ayuda.js` | Cliente HTTP de pruebas, SQLite y servidor efímero compartidos |

## Límites de la verificación

- La suite usa SQLite en memoria; no sustituye la verificación de migraciones y bloqueo de filas con MariaDB real. En este entorno no hay servicio escuchando en `127.0.0.1:3306`.
- No se realizó recorrido visual manual en navegador, ni contraste/foco/lector de pantalla en cada tamaño y tema.
- La pasarela es una simulación; no valida cargos bancarios reales.
- La suite verifica la confirmación de efectivo y SPEI con SQLite; la CLABE de la pantalla es ficticia y no debe recibir una transferencia.
- Las carreras se prueban en un proceso SQLite; la doble transacción simultánea puede producir errores internos de SQLite, aunque se comprueba que solo quede una compra. La carrera entre sesiones y reserva se valida por el resultado final.
- La expiración se ejercita por las rutas y reloj de prueba, no por una espera real de 15 minutos.
