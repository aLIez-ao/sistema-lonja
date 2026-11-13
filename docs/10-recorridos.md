# 10 — Cómo colaboran las partes

## Comprar un lote

1. `tienda_router.js` recibe la solicitud pública y llama a `tiendaController`.
2. El comprador inicia sesión; `middleware/protegerRutas.js` valida la cookie y el rol.
3. `lonja-tienda.js` envía la acción del botón al router de carrito; `carritoController` guarda la selección de esa cuenta.
4. `pedidoController` vuelve a leer lotes y precios, calcula el envío, copia la dirección y congela artículos.
5. `helpers/pedidos.js` asegura que el lote no esté vendido ni reservado por otro.
6. `helpers/pasarela.js` simula la autorización. Si aprueba, se crea `Compra` por lote y cambia el estado del pedido.
7. La factura se prepara con `helpers/factura.js`; el comprador recibe enlace/página y puede descargar PDF desde `/cuenta/pedidos`.

El navegador solo solicita una intención. Los totales que envíe se ignoran.

## Atender pedido

`pedido_admin_router.js` exige rol de personal en `app.js`. `pedidoAdminController` solo permite avanzar de pagado a preparando, luego enviado y entregado. Al enviar y entregar solicita el envío de correo usando `helpers/email.js`. Las compras enlazadas siguen siendo consultables por el módulo existente de compras y reportes.

## Preguntar y opinar

El comprador manda texto a `socialController`. La pregunta se almacena pendiente y solo se publica después de respuesta del personal. EJS imprime el texto escapado. Las opiniones consultan la compra propia y se asocian a la especie del catálogo; el promedio se calcula antes de mostrar la ficha pública.

## Regla de seguridad transversal

La identidad del dueño sale de la cookie, nunca del identificador que el formulario envía. Por eso las funciones de cuenta buscan por `id_usuario` y el recurso pedido en la misma consulta.
