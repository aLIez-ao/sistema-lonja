# 01 — Qué hace la aplicación

Sistema Lonja administra las operaciones de una lonja y ofrece una tienda en línea. El personal registra lotes, especies, compradores y ventas; los compradores pueden explorar lotes, reservarlos durante el pago y consultar pedidos.

## Quién la usa

- **Visitante:** explora la tienda pública.
- **Comprador:** crea una cuenta, verifica su correo, guarda direcciones y favoritos, compra mediante un pago simulado y consulta sus pedidos.
- **Capturista:** registra operaciones y atiende pedidos desde el panel del personal.
- **Administrador:** además administra cuentas y acciones restringidas.

Un comprador es el cliente de la lonja; un usuario es una cuenta de acceso. La cuenta de comprador puede vincularse con su ficha comercial.

## Qué hace una venta

Una compra de mostrador registra un lote, un comprador, el precio final por kilo, el total calculado por el servidor y la fecha. Una compra originada en la tienda conserva además el pedido relacionado. Los artículos del pedido congelan kilos y precios para conservar el historial.

El pago de v1 es una simulación: no procesa cargos bancarios ni debe usarse con tarjetas reales. Los correos sí pueden enviarse por Gmail cuando se configura el transporte; sin credenciales, la aplicación usa un simulador local.

## Dónde empezar

- Reglas de una acción: controlador y router del módulo.
- Datos o asociaciones: `models/` y `models/index.js`.
- Pantallas: vistas EJS y `public/`.
- Configuración y arranque: `index.js`, `app.js`, `config/db.js` y `.env.example`.
- Descripción funcional y tablas: [arquitectura](../01-arquitectura.md) y [base de datos](../02-base-de-datos.md).
