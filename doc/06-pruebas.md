# Pruebas

```bash
npm test
```

El proyecto usa `node:test`, SQLite en memoria y solicitudes HTTP contra la aplicación real. Las suites inicializan una base limpia mediante `test/ayuda.js`, por lo que no requieren MariaDB ni envían correo real.

## Resultado verificado

La suite completa tiene **124 pruebas aprobadas, 0 fallidas** en el último recorrido del plan de la tienda.

| Archivo | Alcance |
|---|---|
| `test/auditoria.test.js` | Correcciones de la auditoría de registro, comprador y cambios de correo |
| `test/busqueda.test.js`, `test/filtros.test.js`, `test/listados.test.js` | Búsqueda literal, filtros, orden y paginación |
| `test/catalogo.test.js`, `test/comprador.test.js`, `test/formularios.test.js` | Catálogo y cuentas de comprador |
| `test/cookies.test.js`, `test/cuentas.test.js`, `test/correo.test.js`, `test/sesion-ui.test.js` | Sesión, correo, verificación, recuperación y preferencias |
| `test/detalles.test.js`, `test/factura-modal.test.js`, `test/flujo.test.js`, `test/nuevas_funcionalidades.test.js` | Operación de mostrador, detalles, factura y regresiones anteriores |
| `test/tienda.test.js`, `test/pedidos.test.js`, `test/pedidos-admin.test.js` | Compra en línea, reservas, facturación y flujo de administración |
| `test/social.test.js` | Privacidad de listas, moderación, límites y opinión respaldada por compra |
| `test/demo.test.js` | Repetibilidad, datos coherentes y borrado por marcas de demo |
| `test/ayuda.js` | Cliente HTTP de pruebas, SQLite y servidor efímero compartidos |

## Límites de la verificación

- La suite no se ejecutó contra una instancia MariaDB real; revisar migración y tipos antes de desplegar.
- No se realizó recorrido visual manual en navegador, ni contraste/foco/lector de pantalla en cada tamaño y tema.
- La pasarela es una simulación; no valida cargos bancarios reales.
- No se hizo prueba de concurrencia con dos procesos ni prueba de carga.
- La expiración se ejercita por las rutas y reloj de prueba, no por una espera real de 15 minutos.
