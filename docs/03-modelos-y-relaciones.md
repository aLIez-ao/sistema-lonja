# 03 — Modelos y relaciones

Los modelos son el contrato entre el programa y las tablas de la base de datos. Definen campos, tipos de dato y restricciones. Las asociaciones permiten pedir, por ejemplo, un lote junto con sus especies. La definición relacional ampliada está en `doc/02-base-de-datos.md`.

## `models/index.js`

Importa los seis modelos y declara cómo se relacionan. Un tipo tiene muchas especies; un lote tiene muchas especies; un lote tiene una compra como máximo; un comprador puede tener muchas compras. También decide reglas al borrar: especies dependen del lote (`CASCADE`), mientras compras asociadas impiden borrar lote o comprador (`RESTRICT`). Exporta los modelos para que controladores y scripts puedan usarlos.

Si añades o cambias una relación, revisa aquí y en ambos modelos involucrados. Los nombres `as` (por ejemplo `especies`, `comprador`) deben coincidir con los `include` de controladores.

## Archivos de modelo

| Archivo | En palabras simples | Detalles que importan al modificar |
|---|---|---|
| `models/Tipo.js` | Categoría general de una especie (Pescado, Marisco, Molusco). | Tabla `tipo`; clave `id_tpo`; nombre de hasta 30 caracteres. |
| `models/Especie.js` | Producto concreto asociado a un lote y a un tipo. | Tabla `especie`; clave `id_epe`; nombre e imagen opcional; `id_lte` e `id_tpo` nacen de asociaciones en `models/index.js`. |
| `models/Lote.js` | Registro de kilos, cajas, precio de salida y fecha de recepción. | Tabla `lote`; kilos y precio usan DECIMAL; la validación del mínimo también aparece en el controlador. |
| `models/Comprador.js` | Datos de contacto del cliente que compra. | Tabla `comprador`; correo obligatorio, válido y único; `codigo_cpr` es la clave. |
| `models/Compra.js` | Une un lote con un comprador y registra precio final, total y fecha. | Tabla `compra`; clave compuesta `id_cmp` + `codigo_cpr`; índice único sobre `id_cmp` implementa un solo comprador por lote. |
| `models/Usuario.js` | Cuenta del personal que puede entrar a la aplicación. | Tabla `usuario`, distinta de comprador; roles `admin` y `capturista`; hook cifra contraseña con bcrypt; scope `sinClave` evita devolverla. |

## Reglas de datos a recordar

- El total de compra se valida y calcula en el controlador, no en el modelo ni en el formulario: kilos × precio final por kilo, redondeado a centavos.
- `Compra.id_cmp` también tiene unicidad propia. Cambiar esta restricción permitiría una semántica distinta (por ejemplo ventas parciales) y requiere decisión de negocio, cambios en asociaciones, controladores, reportes y pruebas.
- Los modelos desactivan timestamps automáticos; solo se guardan las fechas definidas explícitamente.
- Una restricción en la base complementa la validación del formulario: protege los datos aunque la petición no venga de la pantalla web.

## Cuando se añade un nuevo dato

Identifica el tipo y si admite nulos; define la columna en el modelo; añade validación en controlador; adapta formulario/lista; revisa asociaciones o documentación de BD; y prueba lectura, creación y edición. Si la base ya tiene datos, documenta cómo se actualizará sin perderlos; hoy no hay sistema de migraciones.
