# Informe de ejecución — Plan 05

Fecha: 12 de noviembre de 2026
Proyecto: Sistema Lonja de Veracruz

## Resultado

Se completaron las seis fases del plan: navegación del personal, controles y filtros de tienda, favoritos y listas, pago por métodos simulados, separación de usuarios y asistente interactivo para configurar el correo.

## Cambios destacados

- El panel del personal está en `/dashboard`; `/inicio` redirige con HTTP 301. El logo lleva a la tienda pública.
- El héroe, las filas de productos y los filtros tienen controles funcionales. El buscador se comparte desde el header para visitantes y compradores.
- Los corazones muestran el estado persistido. Las listas se filtran por cuenta, permiten elegir listas y agregan al carrito solo lotes disponibles.
- El checkout admite tarjeta de prueba y SPEI simulado. Para recoger, se puede seleccionar efectivo/terminal: el pedido queda pendiente con una reserva ampliada y el personal confirma el cobro para registrar las compras.
- `/usuarios` tiene secciones independientes de trabajadores y clientes, con búsqueda, orden y paginación. La sección de clientes incluye vínculo al registro de lonja y conteo de pedidos.
- `npm run correo:configurar` solicita el usuario, la contraseña de aplicación con entrada oculta y `APP_URL`; actualiza solo esas tres claves, conserva el resto del archivo y permite omitir la prueba de conexión con `--sin-prueba`.

## Commits de implementación

- `ad57d57` — ruta `/dashboard` y acceso a la tienda para el personal.
- `58e4967` — controles del carrusel, filas de cuatro y buscador en el header.
- `995dce5` — sliders de filtros con límites reales.
- `8038728` — favoritos persistentes y listas disponibles para el carrito.
- `c56c2fa` — pagos simulados SPEI y efectivo en la lonja.
- `c9fe5b9` — listados separados de trabajadores y clientes.
- Se preparó un commit adicional para el asistente de correo y documentación del cierre.

## Verificación automatizada

`npm test`: **145 aprobadas, 0 fallidas** en la ejecución completa realizada antes de extraer el enmascarado de correo a una utilidad pura. La suite usa SQLite en memoria. Las pruebas nuevas cubren el aislamiento de favoritos, listas, pagos SPEI/efectivo, separación de cuentas y el asistente de correo con `.env` temporales. La primera prueba de integración se bloqueó en el sandbox al abrir loopback; se autorizó el acceso local y las suites finalizaron correctamente. Tras el pequeño refactor del helper, la prueba aislada del asistente dio 4/4 y pasaron los chequeos de sintaxis. El revisor automático bloqueó la repetición final de `npm test` porque esa suite puede cargar `.env` y contactar Gmail; no se intentó eludir ese bloqueo.

## Verificación manual pendiente

- No se midió el tamaño del buscador antes y después con `getBoundingClientRect()` ni se realizó recorrido visual con sesión en claro/oscuro y anchos 375, 768, 1200 y 1440 px. El ancho reportado queda **sin medición**, no se infiere desde CSS.
- No se probaron foco, lectores de pantalla ni consola en navegador.
- No se ejecutó MariaDB real. Hay que probar migraciones y bloqueo de reservas en una base desechable, según [la guía de instalación](04-instalacion-y-despliegue.md#verificacion-en-mariadb).
- No se configuraron credenciales ni se conectó a Gmail. Cuando quieras activar el correo, ejecuta `npm run correo:configurar` en tu terminal y verifica el envío en **Configuración → Correo**.
- Repetir `npm test` cuando esté disponible un entorno de pruebas con transporte simulado y sin credenciales reales de correo.
- SPEI/CLABE es solo una simulación educativa. No se debe enviar dinero a la CLABE ficticia mostrada en la página de pago.

Los seguimientos quedan anotados en [TODO](TODO.md#plan-05--navegación-tienda-compra-y-usuarios).
