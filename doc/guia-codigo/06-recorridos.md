# 06 — Recorridos completos

## Registrar y vender un lote en mostrador

El personal abre el formulario de lotes; el router comprueba su sesión y el controlador valida kilos, cajas y precio. Sequelize guarda el lote. Después se registran las especies asociadas. Al vender, el controlador verifica que el lote esté disponible y que exista el comprador, calcula el total en el servidor y registra la compra.

## Comprar en la tienda

El comprador agrega lotes al carrito. Al iniciar el checkout, el servidor vuelve a consultar su disponibilidad y crea un pedido con reserva temporal y precios guardados. El comprador selecciona entrega y método de pago; la pasarela local simulada responde. Cuando el pago se confirma, el sistema registra la compra, conserva la relación con el pedido y genera la información de factura. Una reserva vencida o cancelada libera los lotes.

## Iniciar sesión

El navegador envía credenciales al router de acceso. El controlador compara la contraseña con su hash, crea un token de sesión y lo entrega en una cookie protegida. En páginas privadas, `middleware/protegerRutas.js` valida el token y consulta si la cuenta sigue activa; los permisos de administrador se aplican en la ruta.

## Preguntar u opinar

La pregunta u opinión se guarda asociada a la cuenta autenticada. El servidor comprueba que la entidad exista y, para publicar una opinión, que haya una compra que la respalde. Las vistas escapan el texto al presentarlo.
