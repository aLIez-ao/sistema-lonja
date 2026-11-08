# 06 — Controladores de catálogos y operaciones

Los cinco controladores de catálogo siguen el patrón lista → formulario → validación → escritura → redirección. Ante un error conservan los datos introducidos y vuelven a mostrar el formulario. Las rutas y permisos están en `07-rutas.md`.

## Catálogos

### `controllers/tipoController.js`

Lista los tipos; muestra formulario; valida nombre obligatorio de hasta 30 caracteres; crea y edita. Al borrar captura una relación restringida y avisa si todavía existen especies relacionadas. Usa el modelo `Tipo` y vistas `views/tipos/`.

### `controllers/compradorController.js`

Lista compradores y los identificadores de sus compras; valida nombre, apellidos, dirección y correo; crea/edita y transforma campos opcionales vacíos en `null`. Un correo duplicado se traduce a mensaje claro. La base impide borrar a un comprador que ya tiene compras. Usa `Comprador`, `Compra` y vistas `views/compradores/`.

### `controllers/loteController.js`

Lista lotes incluyendo especies/tipos y, cuando existe, la compra y comprador. Valida kilos positivos, cajas enteras y precio de salida no negativo. Al crear un lote redirige a agregar especies. No deja modificar lotes comprados y la relación de base de datos evita borrarlos. Usa `Lote`, `Especie`, `Tipo`, `Compra`, `Comprador` y vistas `views/lotes/`.

### `controllers/especieController.js`

Presenta catálogos de lotes y tipos para elegir asociaciones; acepta el lote preseleccionado al llegar desde alta de lote; valida nombre, lote, tipo e imagen opcional; crea, edita o borra especies. Usa `Especie`, `Lote`, `Tipo` y vistas `views/especies/`.

## Compra

### `controllers/compraController.js`

Es el centro de la captura de venta.

- Prepara listas de compradores y lotes todavía no comprados.
- Muestra compras con comprador, lote, especies y tipo.
- Valida selección de lote, comprador y precio final por kilo.
- En el alta verifica nuevamente que existan lote y comprador y que el lote siga disponible.
- Calcula `precio_total` en servidor con los kilos almacenados del lote y redondea a centavos.
- Al editar conserva el lote y recalcula el total con el nuevo precio.
- El borrado de compra queda restringido al admin en su router.

Usa `Compra`, `Lote`, `Comprador`, `Especie`, `Tipo`, Sequelize `Op` y helpers de mensaje/redondeo. Las vistas son `views/compras/index.ejs` y `views/compras/formulario.ejs`.

## Validación y almacenamiento

Las reglas expresadas con `body(...)` viven junto a cada controlador y el router las ejecuta antes de las funciones que guardan. Luego `mensajesError(req)` trae sus resultados. Hay validaciones repetidas deliberadamente entre interfaz/servidor y restricciones de base: ninguna pantalla sustituye la validación del servidor.

## Guía de cambio seguro

Si una regla de captura cambia, revisa los tres niveles relevantes: campos del modelo, validación/controlador y campos de la vista. Para una asociación nueva revisa también `models/index.js`, los `include` de consulta y las reglas de borrado.
