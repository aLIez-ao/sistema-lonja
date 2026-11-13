# 01 — Qué hace la aplicación

## En palabras sencillas

La Lonja registra los lotes de producto que llegan. El personal puede consultar quién compró cada lote y cuánto se cobró; un comprador con cuenta también puede revisar lotes publicados, reservarlos durante el pago y dar seguimiento a su pedido. Una “especie” pertenece al lote, mientras que el “catálogo” ofrece una ficha estable para agrupar la misma especie en distintos lotes.

## Quién la usa

- **Visitante:** explora la tienda, busca producto y ve qué está disponible.
- **Comprador:** se registra, verifica el correo, conserva direcciones, favoritos y carrito; paga con el simulador y consulta sus pedidos, facturas, preguntas y opiniones.
- **Capturista:** registra las operaciones cotidianas de la lonja y sigue pedidos; no administra cuentas ni elimina registros restringidos.
- **Administrador:** además de la operación, administra usuarios y tiene permisos de mantenimiento.

## Qué logra

Una venta en línea termina generando filas `pedido`, `pedido_item` y `compra`. Esa última fila es la misma que entienden las facturas y reportes históricos; `id_ped` permite regresar al contexto en línea. Los registros de mostrador mantienen `id_ped` vacío.

## Qué no es

El pago actual es una **simulación local**. Sirve para demostrar el flujo completo, pero no cobra una tarjeta. La app guarda la referencia del simulador y los últimos cuatro dígitos; no guarda el número completo ni el código de seguridad.

## Por dónde empezar a trabajar

- Cambiar una regla del negocio: revisa un controlador y el ayudante asociado.
- Agregar datos: modelo, asociación en `models/index.js` y migración si se añade columna a tabla existente.
- Agregar una URL: controlador, router, montaje en `app.js`, permiso y prueba HTTP.
- Cambiar una pantalla: plantilla EJS; los estilos comunes viven en `public/css/`.
