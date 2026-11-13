# Informe de ejecución — Plan 04

Fecha: 12 de noviembre de 2026

## Cambios realizados

- Se abreviaron los nombres de autores de opiniones en páginas públicas y se sustituyeron redirecciones inseguras por rutas internas validadas. Los errores de comunidad ahora usan la página del sitio y los errores de transición del pedido son legibles.
- Se agregó `/cuenta/opiniones` para ver, editar y eliminar opiniones propias, además de descubrir especies compradas pendientes de calificar.
- Se añadió el límite de cinco rechazos de pago por pedido; al llegar al límite se cancela el pedido y se liberan las reservas.
- Se añadieron pruebas de privacidad pública, expiración/liberación de lotes, competencia entre compradores, doble pago y pedidos de demo con totales agregados.
- Se reorganizó `scripts/demo.js` en funciones de limpieza y siembra para catálogo, lotes, cuentas, pedidos y comunidad. La prueba de idempotencia conserva los conteos anteriores.
- Se documentaron las rutas de opiniones, las medidas de seguridad, las pruebas y el procedimiento de verificación MariaDB.

## Verificación

- `npm test`: 131 aprobadas, 0 fallidas.
- `node --test test/demo.test.js`: aprobada; mantiene 18 compradores, 50 lotes históricos, 98 lotes totales, 6 pedidos y 3 opiniones.
- Cliente MariaDB instalado, pero no hay servicio en `127.0.0.1:3306`; migraciones y bloqueos `LOCK.UPDATE` no se pudieron validar con MariaDB real.
- No se hizo recorrido visual manual en navegador, contraste/tema ni prueba a 375 px. Tampoco se revisó `/cuenta/opiniones` con una sesión de usuario.

## Commits

- `5cce8dc` — privacidad pública y redirecciones seguras.
- `5fcc65a` — panel del comprador para opiniones.
- `8066340` — privacidad, reservas vencidas y rechazos de pago.
- `96d7403` — refactor del generador de demo.
- `12535d0` — documentación de seguridad, pruebas y verificación MariaDB.

## Pendiente

1. Ejecutar el procedimiento de [Verificación en MariaDB](04-instalacion-y-despliegue.md#verificacion-en-mariadb) en una copia desechable de la base.
2. Con el usuario autenticado, revisar en navegador ficha pública con opiniones, `/cuenta/opiniones` y error de transición del pedido en tema claro/oscuro y ancho de 375 px.

El usuario completa `GMAIL_USER`, `GMAIL_PASS` y `APP_URL` en su `.env` local si desea habilitar correo real y enlaces externos correctos.
