# Trabajo pendiente

Revisado el 16 de noviembre de 2026 contra `main` (`2dd677c`). Línea base: `npm test` pasó **181/181**. Este archivo reúne los puntos de los dos TODO anteriores; se omiten los que ya están resueltos y se anotan los límites que todavía requieren verificación externa.

## Verificaciones manuales del dueño

- [ ] **MariaDB real:** probar arranque limpio y actualización idempotente, reversión de migración y competencia por una reserva en una base desechable. La suite usa SQLite y no demuestra los bloqueos de MariaDB. Pasos en [instalación](../04-instalacion-y-despliegue.md#verificacion-en-mariadb).
- [ ] **Revisión visual:** recorrer como visitante, comprador y personal en claro/oscuro y a 375 px; comprobar foco de teclado, contraste, buscador, carrusel, favoritos, pago y `/usuarios`.
- [ ] **Correo real:** configurar `GMAIL_USER`, contraseña de aplicación y `APP_URL` en el `.env` local y enviar un correo de prueba desde Configuración. No pegar credenciales en el repositorio.
- [ ] **Pasarela real:** integrar un proveedor antes de aceptar dinero. Tarjeta y SPEI actuales son simulados; la CLABE mostrada no recibe transferencias.

## Errores conocidos

- [ ] `helpers/navegacion.js` (`volverA`) conserva `mensaje` o `error` que ya estaban en la URL de referencia y puede mostrar alertas dobles.
- [ ] `helpers/tienda.js` (`nombrePublico`) toma el último apellido. Con nombres guardados como nombre + paterno + materno, muestra la inicial del materno; definir regla de nombres y corregirlo.

## Mejoras y operación

- [ ] Los límites por IP/cuenta viven en memoria. Para varias instancias, moverlos a almacenamiento compartido; hoy reinician al reiniciar Node.
- [ ] Añadir una bitácora persistente para cambios de estado y acciones de moderación.
- [ ] Repetir una prueba de competencia con dos procesos contra MariaDB y revisar bloqueos y tiempos de espera.
- [ ] Evaluar listas `IN (...)` de la tienda si el catálogo crece a varios cientos de especies.
- [ ] Revisar la carga normal de `npm run demo` en producción; el borrado requiere confirmación y se bloquea en `NODE_ENV=production`, pero los registros demo siguen siendo solo de desarrollo.
- [ ] Mantener visible que editar una ficha del catálogo no modifica los datos históricos copiados en lotes.

## Cerrado recientemente

- [x] Formato de cuatro controladores pendiente: ejecutado `npm run format` — `303bbdb`.
- [x] Migraciones versionadas con transacción y reversión; prueba de regresión — `9c94594`.
- [x] Aviso de suscripción guardado en la cuenta — `2dd677c`.
- [x] Conteo de consultas de listas bajo prueba — `dbdd9c0`.
- [x] CSP aplicada a vistas y recursos; prueba específica de vistas — `e9c7be1`.
- [x] Listado de usuarios reutiliza el helper común — `4923c44`.
- [x] Corrección de las alertas de éxito al cambiar el estado del pedido — presente antes de `2dd677c`.

Los pendientes de modularización del plan 09 permanecen fuera del alcance de esta revisión; no se consideran ejecutados por este documento.
