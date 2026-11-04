# Base de datos

Diseño relacional entregado por el cliente (PDF *Sistema Lonja*, pág. 2), implementado con Sequelize. Los nombres de tablas, columnas y tipos son los del diagrama. Se agrega la tabla `usuario` (acceso al sistema).

## Diagrama

```
 tipo ──< especie >── lote ──── compra >── comprador
 (1)  (N)         (N)   (1)  (1)   (1)  (N)       (1)

 usuario   (independiente: personal autorizado)
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
| nombre | VARCHAR(25) | obligatorio |
| id_lte | INTEGER | FK → lote. **ON DELETE CASCADE** |
| id_tpo | SMALLINT | FK → tipo. ON DELETE RESTRICT |
| imagen | VARCHAR(100) | opcional; ruta o URL (texto) |

### `comprador`
| Columna | Tipo | Notas |
|---|---|---|
| codigo_cpr | SMALLINT | PK, autoincremental |
| nombre | VARCHAR(15) | obligatorio |
| apellido_paterno | VARCHAR(15) | obligatorio |
| apellido_materno | VARCHAR(15) | opcional |
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
| rol | VARCHAR(20) | `admin` o `capturista` |
| activo | BOOLEAN | una cuenta inactiva no puede entrar |

## Reglas de integridad en la aplicación

- Un lote **ya comprado** no se puede editar ni eliminar (cambiaría el importe cobrado).
- Un lote no puede comprarse dos veces (validación + índice único).
- No se elimina un comprador con compras, ni un tipo con especies.
- Al eliminar un lote sin compra se eliminan sus especies. Al eliminar una compra, el lote vuelve a quedar disponible.
