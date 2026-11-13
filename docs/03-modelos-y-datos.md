# 03 — Modelos y datos

Un modelo es la descripción de una tabla y sus reglas. Sequelize usa estas descripciones para leer y escribir filas en la BD.

## Archivos de `models/`

| Archivo | Explicación sencilla | Con quién se relaciona |
|---|---|---|
| `Tipo.js` | Categoría amplia, como pescado, marisco o molusco | Tiene muchas especies |
| `Lote.js` | Producto subastado junto, con kilos, cajas, precio y fecha | Tiene especies, puede tener una compra y aparece en carrito/pedido |
| `Especie.js` | Especie concreta registrada para un lote; copia el nombre para conservar historia | Pertenece a tipo, lote y opcionalmente al catálogo |
| `EspecieCatalogo.js` | Ficha reutilizable de especie para la tienda pública | Agrupa lotes, preguntas y opiniones |
| `Comprador.js` | Persona o negocio al que se registra una venta | Tiene compras y se vincula a una cuenta en línea |
| `Compra.js` | Venta de un lote completo; conserva precio final y total | Une lote con comprador; opcionalmente refiere a pedido |
| `Usuario.js` | Cuenta, contraseña cifrada, rol, correo y estado | Tiene direcciones, carritos, pedidos y recursos sociales |
| `DireccionEntrega.js` | Dirección que guarda el comprador | Pertenece a usuario; pedido copia sus datos al confirmar |
| `CarritoItem.js` | Relación entre comprador y lote guardado | Clave compuesta de usuario y lote |
| `Pedido.js` | Compra en línea con pago y estado | Pertenece a usuario/comprador; tiene artículos y compras |
| `PedidoItem.js` | Kilos, precio y subtotal congelados al confirmar | Relaciona un pedido con un lote |
| `Lista.js` | Lista privada con nombre, como Favoritos | Pertenece a usuario; agrupa elementos |
| `ListaItem.js` | Un lote o especie guardado dentro de una lista | Tipo + identificador permiten ambas clases de elemento |
| `Pregunta.js` | Texto enviado por un comprador y contestación del personal | Se dirige a un lote o a una especie del catálogo |
| `Opinion.js` | Reseña del comprador sobre una especie | Solo una opinión por comprador y especie |
| `models/index.js` | Cablea las relaciones y exporta todos los modelos | Es el punto de entrada de los controladores |

## Relaciones importantes

```text
Usuario → CarritoItem → Lote → Especie → EspecieCatalogo
Usuario → Pedido → PedidoItem → Lote
Pedido → Compra ← Comprador
Usuario → DireccionEntrega
Usuario → Lista → ListaItem
Usuario → Pregunta / Opinion
```

El pedido mantiene una **foto** de la dirección usada y `PedidoItem` congela el precio. Así editar después el perfil o catálogo no cambia una factura antigua.

## Cambiar el esquema

Las tablas nuevas se crean al sincronizar los modelos. Para añadir una columna a una tabla existente, agrega el modelo y la columna idempotente en `helpers/migraciones.js`; ejecuta primero con SQLite y planea un ensayo respaldado sobre MariaDB. `BD_SYNC=safe` no altera columnas existentes.
