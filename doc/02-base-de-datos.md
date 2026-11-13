# Base de datos

Diseño relacional entregado por el cliente (PDF *Sistema Lonja*, pág. 2), implementado con Sequelize. Los nombres de tablas, columnas y tipos son los del diagrama. Se agrega la tabla `usuario` (acceso al sistema).

## Diagrama

```
 tipo ──< catálogo ──< especie >── lote ── compra >── comprador
                 ↑                    ↑        ↑
              opinión             carrito   pedido ──< artículo
              pregunta            usuario ───┘
```

## Tablas

### `tipo`
| Columna | Tipo | Notas |
|---|---|---|
| id_tpo | SMALLINT | PK, autoincremental |
| nombre | VARCHAR(30) | obligatorio |

### `lote`
| Columna | Tipo | Notas |
|---|---|---|
| id_lte | INTEGER | PK, autoincremental |
| kilos | DECIMAL(10,2) | > 0 |
| numero_cajas | SMALLINT | 0 – 32767 |
| precio_kilo_salida | DECIMAL(10,2) | ≥ 0 |
| fecha | DATETIME | por defecto, ahora |

### `especie`
| Columna | Tipo | Notas |
|---|---|---|
| id_epe | INTEGER | PK, autoincremental |
| nombre | VARCHAR(40) | obligatorio; nombre copiado para preservar registros históricos |
| id_lte | INTEGER | FK → lote. **ON DELETE CASCADE** |
| id_tpo | SMALLINT | FK → tipo. ON DELETE RESTRICT |
| imagen | VARCHAR(100) | opcional; ruta o URL (texto) |

### `comprador`
| Columna | Tipo | Notas |
|---|---|---|
| codigo_cpr | SMALLINT | PK, autoincremental |
| nombre | VARCHAR(40) | obligatorio |
| apellido_paterno | VARCHAR(40) | obligatorio |
| apellido_materno | VARCHAR(40) | opcional |
| direccion | VARCHAR(200) | opcional |
| correo | VARCHAR(80) | **único** (la "U" del diagrama), formato de correo |

### `compra`
| Columna | Tipo | Notas |
|---|---|---|
| id_cmp | INTEGER | PK (parte 1) y FK → lote.id_lte. ON DELETE RESTRICT |
| codigo_cpr | SMALLINT | PK (parte 2) y FK → comprador. ON DELETE RESTRICT |
| precio_kilo_final | DECIMAL(10,2) | > 0 |
| precio_total | DECIMAL(12,2) | calculado: kilos × precio_kilo_final, redondeado a 2 decimales |
| fecha | DATETIME | por defecto, ahora |

Índice único `uq_compra_lote` sobre `id_cmp`.

> **Interpretación del diagrama.** En el PDF, `id_cmp` y `codigo_cpr` aparecen ambos como FK en el compartimiento de llave, y la relación Lote–Compra se dibuja 1 a 1. Se modeló como llave primaria compuesta `(id_cmp, codigo_cpr)` más el índice único sobre `id_cmp`, de modo que **un lote se vende completo a un solo comprador**. Si el cliente quiere ventas parciales de un lote, basta quitar ese índice (ver [TODO.md](TODO.md)).

### `usuario` (agregada)
| Columna | Tipo | Notas |
|---|---|---|
| id | INTEGER | PK |
| usuario | VARCHAR(40) | único, nombre de acceso |
| nombre_completo | VARCHAR(80) | |
| password | VARCHAR(100) | hash bcrypt (10 rondas), nunca texto plano |
| rol | VARCHAR(20) | `admin`, `capturista` o `comprador` |
| activo | BOOLEAN | una cuenta inactiva no puede entrar |

## Tablas de tienda en línea

| Tabla | Para qué sirve | Claves y reglas relevantes |
|---|---|---|
| `catalogo_especie` | Ficha maestra pública, tipo, imagen, descripción y estado activo | `id_cat`; una especie histórica conserva además su propia copia de nombre/tipo/imagen |
| `direccion_entrega` | Direcciones guardadas por una cuenta compradora | `id_dir`, `id_usuario`; máximo 10 y una principal |
| `carrito_item` | Lotes que cada cuenta guarda antes de comprar | clave compuesta `(id_usuario,id_lte)` |
| `pedido` | Checkout, entrega, total, pago simulado y ciclo de vida | `id_ped`, `id_usuario`, `codigo_cpr`; copia de dirección y vencimiento de reserva |
| `pedido_item` | Artículos y precios congelados durante el pago | clave `(id_ped,id_lte)`; kilos y precio no dependen del formulario |
| `lista`, `lista_item` | Favoritos y otras listas de cada comprador | referencia polimórfica `tipo` + `id_ref`; elemento único por lista |
| `pregunta` | Preguntas sobre lote o catálogo y su respuesta | exactamente un destino (`id_lte` o `id_cat`); estados pendiente/respondida/oculta |
| `opinion` | Calificación de catálogo respaldada por compra | única por `(id_usuario,id_cat)`; de 1 a 5 estrellas |

`compra.id_ped` relaciona la venta tradicional existente con un pedido en línea; es `NULL` para mostrador.

## Reglas de integridad en la aplicación

- Un lote **ya comprado** no se puede editar ni eliminar (cambiaría el importe cobrado).
- Un lote no puede comprarse dos veces (validación + índice único).
- No se elimina un comprador con compras, ni un tipo con especies.
- Al eliminar un lote sin compra se eliminan sus especies. Al eliminar una compra, el lote vuelve a quedar disponible.
- El pedido conserva una copia de su dirección y del precio/kilos de cada lote para proteger el historial.
- Las tablas nuevas se crean con `db.sync()`; `asegurarEsquema()` agrega columnas faltantes sin alterar ni truncar registros existentes.
