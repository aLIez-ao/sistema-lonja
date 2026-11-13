# Errores y pendientes

Actualizado el 13 de noviembre de 2026, tras la auditoría del plan 04 (131 pruebas pasan).

## Errores conocidos

- [ ] **Aviso de éxito del pedido.** `pedidoAdminController.cambiarEstado` redirige con `?mensaje=actualizado` y `views/pedidos/detalle.ejs` imprime el texto crudo, así que se vería "actualizado" en vez de "Estado actualizado.". Usar `aMensaje("Estado actualizado.")`.
- [ ] **Alertas dobles.** `helpers/navegacion.js` (`volverA`) añade el aviso nuevo pero no borra `mensaje` o `error` que ya traía la URL de referencia; pueden verse dos alertas a la vez.
- [ ] **Inicial del apellido público.** `helpers/tienda.js` (`nombrePublico`) toma el último apellido; como el nombre se guarda "nombre paterno materno", muestra la inicial del materno ("Ana López Ruiz" → "Ana R.").
- [ ] **Contador de pagos fallidos en memoria.** `pedidoController` (`limitePagosFallidos`) se reinicia al reiniciar el servidor, no se comparte entre procesos y cuenta aunque la transacción falle después. Basta para un solo proceso; revisar si se despliega con varios.

## Verificaciones pendientes (las hace el usuario)

- [ ] **MariaDB.** Verificar migración idempotente (`asegurarEsquema`, `changeColumn`) y el flujo de reserva/pago con `LOCK.UPDATE` en una **copia desechable**, siguiendo [la guía](04-instalacion-y-despliegue.md#verificacion-en-mariadb). Las pruebas de carrera corren en SQLite y no lo demuestran; lo que garantiza una sola compra es el índice único `uq_compra_lote`.
- [ ] **Revisión visual autenticada** en claro/oscuro y a 375 px: ficha pública con opiniones, `/cuenta/opiniones` y transición de estado en `/pedidos/:id`.
- [ ] **Correo real.** Llenar `GMAIL_USER`, `GMAIL_PASS` y `APP_URL` en el `.env` local (sin ellos funciona el modo simulador).

## Pendientes de la auditoría del plan 05

- [ ] `usuarioController.lista` reescribió la paginación y el orden a mano (en vez de `helpers/listado.js`) y quitó el filtro activo/inactivo; volver a reutilizar el helper.
- [ ] Un pedido de efectivo conserva su reserva de 120 min aunque el comprador cambie de método; acotado por el tope de 3 pendientes.
- [ ] Sin verificar en navegador: tamaño del buscador del header frente al original, héroe a 375 px, tema claro, arrastre real de los sliders, corazón, los tres métodos de pago y `/usuarios`.

## Mejoras de pruebas

- [ ] Prueba de la alerta doble (`volverA` con `mensaje` previo) y del aviso de éxito del cambio de estado.
- [ ] Prueba de "pendientes por calificar" con una compra de mostrador (sin pedido).

## Observaciones de diseño

- [ ] `/cuenta/opiniones` no edita en la misma pantalla: la edición se hace desde la ficha de la especie.
- [ ] Sin tope de intentos de pago por cuenta o IP (solo por pedido); con una pasarela real convendría agregarlo.
- [ ] Las consultas de la tienda usan listas `IN (...)` que crecen con el catálogo; revisar si pasa de unos cientos de especies.
- [ ] Credenciales de `scripts/demo.js` fijas (`LonjaDemo2026`): solo desarrollo. `--limpio` exige `--confirmar` y se niega en producción, pero la carga normal no revisa `NODE_ENV`.
- [ ] Editar el catálogo no cambia lotes ya creados (copia a propósito); mantener la nota visible en el formulario.

## Documentación

- [ ] **Unificar las dos guías del código** que quedaron en [`resolver/`](resolver/README.md) en una sola (se solapan en gran parte).
- [x] La guía del código quedó en `doc/resolver/` y se versiona junto con la documentación operativa; `.gitignore` limita la regla `resolver/` a la carpeta raíz.

## Plan 05 — navegación, tienda, compra y usuarios

- [x] `/dashboard` para trabajadores y `/inicio` como redirección permanente.
- [x] Controles del héroe y las filas, buscador en el header y filtros deslizables con límites disponibles.
- [x] Favoritos persistentes, listas privadas y opción para agregar al carrito solo lotes disponibles.
- [x] Pago simulado por tarjeta/SPEI y reserva para efectivo en lonja con confirmación del personal.
- [x] `/usuarios` separa trabajadores y clientes, cada sección con búsqueda, orden y páginas propias.
- [x] Asistente `npm run correo:configurar` para actualizar las claves de correo; no ejecutar hasta tener la contraseña de aplicación del usuario.
- [ ] Revisar manualmente claro/oscuro, 375 px, header/carrusel/filtros/favoritos/pago y `/usuarios`; medir el buscador en navegador autenticado.
- [ ] Verificar migraciones y reservas de pago en una MariaDB desechable; la suite automatizada usa SQLite.
- [ ] Cuando se desee activar correo real, ejecutar `npm run correo:configurar` y probar el mensaje desde **Configuración → Correo**.
- [ ] Repetir `npm test` en un entorno con transporte simulado y sin credenciales reales de correo; la repetición final se omitió porque la suite puede tener acceso a Gmail.
