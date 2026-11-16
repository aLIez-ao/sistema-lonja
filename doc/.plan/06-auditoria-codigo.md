# Plan 06 — Auditoría de código y plan de acción

Fecha: 15 de noviembre de 2026 · Rama auditada: `claude/code-audit-action-plan-ef5a0c` (commit `092cbde`).
Línea base: `npm test` → **149 pruebas pasan** (SQLite en memoria).

Alcance: `index.js`, `app.js`, `config/`, `middleware/`, `models/`, `controllers/`, `helpers/`,
`routes/`, plantillas EJS (salidas sin escapar y manejadores en línea), `public/js/` (sumideros
`innerHTML`), configuración del repositorio y documentación de arranque. No se probó contra MariaDB
ni en navegador.

Los pendientes que ya estaban en [pendientes consolidados](../.reports/TODO.md) no se repiten aquí salvo que la
auditoría agregue algo; se citan como «ya en TODO».

## Cómo leer este plan

| Campo | Valores |
|---|---|
| **Severidad** | 🔴 Alta (error real o riesgo de seguridad/datos) · 🟠 Media (falla en casos concretos, deuda que estorba) · 🟢 Baja (estilo, limpieza) |
| **Esfuerzo** | S (< 1 h) · M (1–4 h) · L (> 4 h) |
| **ID** | `ERR` errores · `SEG` seguridad · `RND` rendimiento · `REF` refactorización · `BP` buenas prácticas · `REP` repositorio y documentación |

Cada hallazgo dice **dónde**, **qué pasa** y **qué hacer**. Al cerrar uno, marca la casilla y anota
el commit.

---

## 1. Errores (fallas de comportamiento)

- [ ] **ERR-01 🔴 S — Borrar un usuario con pedidos produce error 500.**
  `controllers/usuarioController.js:173-181` llama a `us.destroy()` sin capturar errores, pero
  `Usuario.hasMany(Pedido, { onDelete: "RESTRICT" })` (`models/index.js`) impide el borrado si el
  comprador tiene pedidos. El administrador ve «Error interno del servidor».
  **Hacer:** contar pedidos antes de borrar y responder con aviso («desactívalo en su lugar»), o
  capturar `SequelizeForeignKeyConstraintError` con `mensajeBD`. Borrar la foto **después** de que
  el `destroy` tenga éxito (hoy se borra antes y queda el usuario sin foto si falla). Agregar prueba.

- [ ] **ERR-02 🔴 S — Renombrar una lista con un nombre repetido produce error 500.**
  `controllers/socialController.js` (`renombrarLista`) hace `lista.update({ nombre })` sin `try`;
  el índice único `(id_usuario, nombre)` de `models/Lista.js:9` lanza `SequelizeUniqueConstraintError`.
  **Hacer:** capturarlo y responder con `volverA(..., { error: "Ya existe una lista con ese nombre." })`
  como ya hace `crearLista`. Agregar prueba.

- [ ] **ERR-03 🔴 S — La lista «Favoritos» se puede renombrar y se pierde.**
  Favoritos se identifica por nombre (`app.js:73`, `socialController.listas`, `listaFavoritos`).
  Si el comprador la renombra, el contador del header deja de verla y se crea otra «Favoritos»
  vacía; también puede renombrar otra lista a «Favoritos» y chocar.
  **Hacer:** prohibir renombrar/borrar la lista de Favoritos y reservar ese nombre; a mediano plazo,
  marcarla con una columna `es_favoritos` (o `tipo`) en vez de depender del texto.

- [ ] **ERR-04 🟠 S — El cambio de estado del pedido puede fallar después de guardar.**
  `controllers/pedidoAdminController.js:56-61`: tras `pedido.update`, `await enviarEmailPedido(...)`
  va sin `try/catch`. Si el envío lanza, el estado ya cambió pero el personal ve un 500. Además el
  `?mensaje=actualizado` muestra el texto crudo (ya en TODO).
  **Hacer:** envolver el correo como en `confirmarCobro` (líneas 85-88) y usar `aMensaje("Estado actualizado.")`.

- [ ] **ERR-05 🟠 M — La caja puede vender un lote reservado por un pedido en línea.**
  `controllers/compraController.js:118-164` (`registrar`) solo revisa que no exista `Compra`;
  `lotesDisponibles` (líneas 32-36) tampoco excluye reservas activas. El pedido pendiente del
  comprador en línea se expira al intentar pagar («ya no disponible») sin aviso previo.
  **Hacer:** decidir la regla de negocio (¿la caja gana o respeta la reserva?). Si respeta: usar
  `loteDisponible()` de `helpers/pedidos.js` dentro de una transacción y mostrar en el formulario
  qué lotes están reservados.

- [ ] **ERR-06 🟠 S — «Factura enviada exitosamente» cuando el correo solo se simuló.**
  `controllers/compraController.js:274-275` trata `resultado.simulado` como éxito y dice
  «enviada a …». **Hacer:** mensaje distinto en modo simulador («Correo no configurado: se simuló el envío»).

- [ ] **ERR-07 🟠 S — Se verifica el correo de cuentas desactivadas.**
  `controllers/loginController.js:126-169` (`verificarEmailToken`) no revisa `us.activo` y además
  puede vincular el comprador de mostrador a una cuenta inactiva. **Hacer:** exigir `activo: true`
  en la búsqueda, igual que `usuarioDeEnlace`.

- [ ] **ERR-08 🟠 M — Actualizar la cuenta no es atómico.**
  `controllers/configuracionController.js:83-138`: `us.save()` y `comprador.update({ correo })`
  van por separado y la foto se escribe en disco antes del `save`. Si algo falla a la mitad, el
  correo del usuario y el del comprador quedan distintos y la imagen queda huérfana.
  **Hacer:** `db.transaction` para ambos `save`; borrar la imagen nueva si la transacción falla.

- [ ] **ERR-09 🟠 S — Registro: búsqueda de comprador fuera de la transacción.**
  `controllers/registroController.js:118` llama `compradorPorCorreo(correo)` sin pasar `t`, y
  `usuarioLibre` (líneas 26-40) consulta fuera de la transacción. Con dos altas simultáneas se
  pueden crear dos `Comprador` con el mismo correo o chocar el nombre de usuario (el choque
  termina en el `catch` y la persona recibe «revisa tu correo» sin cuenta creada).
  **Hacer:** pasar `transaction` a ambas consultas y reintentar `usuarioLibre` ante choque único.

- [ ] **ERR-10 🟠 M — Comparación de fechas con `CURRENT_TIMESTAMP` del servidor de BD.**
  `controllers/tiendaController.js:42` (`noReservado`) compara `reservado_hasta` con
  `CURRENT_TIMESTAMP`, mientras el resto del código compara con `new Date()` de Node y Sequelize
  escribe con `BD_TIMEZONE=-06:00`. Si la zona de la sesión de MariaDB no coincide, la tienda
  muestra u oculta lotes reservados con hasta 6 h de desfase. **Hacer:** pasar la hora como
  parámetro (`replacements`/`Op.gt: new Date()`) y verificarlo en la MariaDB desechable.

- [ ] **ERR-11 🟢 S — `lock` dentro de `include` no tiene efecto.**
  `controllers/pedidoController.js:173` pone `lock` en el `include` de `Lote`; Sequelize lo ignora.
  La protección real es el índice único de `compra` (ya documentado). **Hacer:** quitarlo o
  bloquear los lotes con una consulta explícita para no dar falsa seguridad.

- [ ] **ERR-12 🟢 S — Respuestas 404 inconsistentes en el panel de pedidos.**
  `controllers/pedidoAdminController.js:41,48` usa `res.sendStatus(404)` (texto plano) en lugar
  de la vista `error` como el resto. **Hacer:** `errorDeSitio(req, res, 404, ...)`.

## 2. Seguridad

- [ ] **SEG-01 🔴 S — Credencial real en el README.**
  `README.md` (Inicio rápido) incluye la contraseña del usuario `lonja` de MariaDB y repite
  `CREATE DATABASE`. Contradice la regla de la zona «no pegues credenciales en documentos».
  **Hacer:** reemplazar por `'<tu_clave>'`, quitar la línea duplicada y **cambiar esa contraseña**
  en la base local, porque ya quedó en el historial de git.

- [ ] **SEG-02 🔴 S — Se acepta el secreto JWT de ejemplo.**
  `index.js:15` solo verifica que exista `SC_JWT`; el valor de `.env.example`
  (`cambia_esta_clave_por_una_larga_y_aleatoria`) es público. Lo mismo para `ADMIN_PASSWORD`.
  **Hacer:** en arranque, rechazar (o advertir fuera de producción) si `SC_JWT` es el de ejemplo o
  mide menos de 32 caracteres; idem `ADMIN_PASSWORD` de ejemplo.

- [ ] **SEG-03 🟠 M — Sin cabeceras de seguridad.**
  No hay `helmet` ni cabeceras manuales (CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `frame-ancestors`). **Hacer:** agregar `helmet` en `app.js`. Para una CSP estricta primero hay
  que retirar los manejadores en línea (ver REF-06).

- [ ] **SEG-04 🟠 M — Protección CSRF solo por `SameSite`.**
  Todas las acciones con estado (pagos, borrados, cambio de contraseña) dependen de que `_token`
  sea `SameSite=Strict` (`helpers/tokens.js`). Es una defensa razonable, pero única: un subdominio
  comprometido o un navegador antiguo la anulan. **Hacer:** token CSRF por sesión (patrón
  *double submit* o sincronizador) en formularios y `fetch`, o como mínimo validar `Origin`/`Referer`
  en métodos no GET mediante un middleware.

- [ ] **SEG-05 🟠 S — `rutaVolver` depende de un parche específico.**
  `helpers/navegacion.js:10` filtra `/\s*\/\s*evil/` (ajustado a una prueba). Hoy lo salva que
  Express codifica la URL, pero la regla no cubre `/\t/otro-sitio` ni barras invertidas en medio.
  **Hacer:** rechazar cualquier carácter de control/espacio y `\` en toda la ruta y validar con
  `new URL(ruta, "http://x").origin === "http://x"`; borrar la regex «evil».

- [ ] **SEG-06 🟠 M — Límites de intentos solo en memoria.**
  `helpers/seguridad.js:26-46` (`crearLimite`) sirve para login, registro, recuperación,
  sugerencias y pagos; se reinicia con cada despliegue y no se comparte entre procesos (pagos ya
  en TODO). **Hacer:** documentarlo como restricción de despliegue (una sola instancia) o moverlo a
  tabla/Redis. Agregar límite por cuenta (no solo IP+usuario) para login.

- [ ] **SEG-07 🟠 S — Avisos masivos sin validación ni consentimiento.**
  `controllers/configuracionController.js:203-214` (`enviarAvisoClientes`) envía a **todos** los
  compradores sin límite de longitud, sin opción de baja y dentro de la petición HTTP.
  **Hacer:** validar longitudes, enviar solo a quien aceptó avisos (campo de consentimiento), incluir
  enlace de baja y mandar en segundo plano (ver RND-05).

- [ ] **SEG-08 🟢 S — Inyección de HTML con datos del servidor en JS.**
  `public/js/lonja-clics.js:391-394` interpola `e.imagen` y `e.id_cat` en `innerHTML`. Hoy son
  valores controlados (URL generada por el servidor y entero), pero el patrón es frágil.
  **Hacer:** construir el `<img>`/`<input>` con `createElement` y `setAttribute`, como ya hace el resto.

## 3. Rendimiento y optimización

- [ ] **RND-01 🔴 M — Escrituras en BD en cada página pública.**
  `liberarPedidosVencidos()` (un `UPDATE`) se ejecuta en `portada`, `detalleLote`, `fichaEspecie`,
  `sugerencias` (antes incluso del límite de tasa, `tiendaController.js:370-374`), carrito, pedidos,
  y además dentro de **cada** `reservasActivas()` (`helpers/pedidos.js:23`). Ya existe el barrido
  cada 60 s en `index.js:34-37`. **Hacer:** dejar el barrido periódico como única fuente y que las
  lecturas filtren por `reservado_hasta > ahora` (ya lo hacen); mantener la expiración explícita solo
  dentro de las transacciones de crear/pagar.

- [ ] **RND-02 🔴 M — Consultas N+1 en carrito, pedidos y listas.**
  - `controllers/carritoController.js:38`: `Compra.findByPk` por cada fila del carrito.
  - `controllers/pedidoController.js:89-99`: `loteDisponible` por lote, y cada uno vuelve a
    ejecutar `reservasActivas` + `UPDATE` (`helpers/pedidos.js:46-56`).
  - `controllers/pedidoController.js:178-184`: `Compra.findOne` por item.
  - `controllers/socialController.js` `listas` y `detalleLista`: `findByPk` + `loteDisponible` por
    elemento (con su `UPDATE`).
  **Hacer:** una función `disponibilidadDeLotes(ids, { usuarioId, transaction })` que resuelva
  ventas y reservas en 2 consultas con `IN (...)` y devuelva un `Map`; usarla en los cuatro sitios.

- [ ] **RND-03 🟠 M — Middleware global con 3–4 consultas por petición.**
  `app.js:55-82` busca el usuario, cuenta el carrito, busca la lista Favoritos y sus items en
  **todas** las rutas (incluidas las JSON y las de PDF). **Hacer:** paralelizar con `Promise.all`,
  saltarlo para rutas que no renderizan header (`/tienda/sugerencias`, `*.pdf`, `*.json`) y
  obtener los favoritos con un solo `include`.

- [ ] **RND-04 🟠 M — Subconsultas correlacionadas en la tienda.**
  `controllers/tiendaController.js:30-46` usa `(SELECT COUNT(*) ...) = 0` por lote, y la portada
  (líneas 171-264) lanza ~10 consultas, incluidas dos que traen todos los ids disponibles para
  contar por categoría (219-228). **Hacer:** `NOT EXISTS (...)` en vez de `COUNT(*)`; contar por
  categoría con un `GROUP BY id_tpo` + `COUNT(DISTINCT id_lte)`; revisar índices en
  `especie(id_lte)`, `pedido_item(id_lte)` y `pedido(estado, reservado_hasta)`. Relacionado con la
  observación de listas `IN (...)` ya en TODO.

- [ ] **RND-05 🟠 M — Correo y PDF dentro del ciclo de la petición.**
  `compraController.registrar` (141-156), `pedidoController.pagar` (252-279) y
  `pedidoAdminController.cambiarEstado` esperan a generar PDF y a SMTP antes de redirigir; un
  Gmail lento bloquea al usuario. **Hacer:** encolar en memoria (`setImmediate` + registro de
  fallos) o tabla `correo_pendiente` procesada por el barrido periódico.

- [ ] **RND-06 🟢 S — `lotesDisponibles` trae todos los ids vendidos.**
  `controllers/compraController.js:32-36` carga **todas** las compras y arma un `NOT IN` gigante.
  **Hacer:** `include: [{ model: Compra, as: "compra", required: false, attributes: [] }]` con
  `where: { "$compra.id_cmp$": null }`.

## 4. Refactorización

- [ ] **REF-01 🟠 M — Validación duplicada y con dos estilos.**
  La regex de correo está en `registroController.js:13`, `models/Usuario.js` y
  `configuracionController.js:91`; la de teléfono en tres sitios. Unos controladores usan
  `express-validator` y otros validan a mano. **Hacer:** `helpers/validacion.js` con reglas
  compartidas (`reglaCorreo`, `reglaTelefono`, `reglaPassword`) y usarlas en todos los formularios.

- [ ] **REF-02 🟠 M — Controladores con lógica de dominio.**
  `pedidoController.pagar` (130 líneas) mezcla transacción, pasarela, límites, facturas y correo;
  `tiendaController.portada` arma consultas y vista. **Hacer:** extraer servicios
  (`servicios/pedidos.js`: `crearPedido`, `pagarPedido`, `confirmarCobro`) que devuelvan un
  resultado tipado, y dejar a los controladores solo la traducción a HTTP. Facilita probar sin Express.

- [ ] **REF-03 🟠 S — Estados de pedido como cadenas sueltas.**
  `"pendiente_pago"`, `"Efectivo en lonja"`, etc. se repiten en `pedidoController`,
  `pedidoAdminController`, `helpers/pedidos.js` y `tiendaController` (SQL literal).
  **Hacer:** constantes exportadas desde `models/Pedido.js` (`ESTADOS`, `METODOS_PAGO`) y validar
  con `isIn` en el modelo.

- [ ] **REF-04 🟠 S — Errores identificados por texto.**
  `configuracionController.js:135` detecta errores de imagen comparando el mensaje con una regex;
  `pedidoController` usa `Object.assign(new Error(), { status })`. **Hacer:** clase
  `ErrorDeUsuario(mensaje, estado)` en `helpers/utiles.js` y usar `instanceof`.

- [ ] **REF-05 🟠 M — Listado de usuarios fuera del helper común** (ya en TODO). Además
  `paginaUrl`/`ordenUrl` (`usuarioController.js:66-79`) copian `req.query` completo y fallan si un
  parámetro llega como arreglo. Unificar con `helpers/listado.js`.

- [ ] **REF-06 🟠 M — Manejadores y scripts en línea en las vistas.**
  16 plantillas usan `onclick`/`onchange`/`onsubmit` (p. ej. `configuracion/index.ejs:81-109`,
  confirmaciones de borrado) y `pedido/nuevo.ejs`, `pedido/pago.ejs` tienen `<script>` en línea.
  **Hacer:** atributos `data-confirmar` / `data-preferencia` con delegación en `lonja-clics.js`;
  requisito para la CSP de SEG-03.

- [ ] **REF-07 🟢 M — `public/js/lonja-app.js` monolítico (655 líneas).**
  Mezcla preferencias, factura modal, gráficas y formularios con funciones globales. **Hacer:**
  dividir en módulos ES (`type="module"`) por pantalla, como ya hace `lonja-tienda.js`.

- [ ] **REF-08 🟢 S — Restos y duplicados menores.**
  - `export { dinero }` sin uso en `pedidoController.js:337`.
  - Variable `estado` sin uso en `pedidoController.js:130`.
  - `res.locals.dinero` se asigna en `app.js:56` y se sobrescribe en `middleware/preferencias.js`.
  - `dotenv.config()` repetido en `index.js`, `app.js`, `config/db.js`, `helpers/tokens.js`,
    `helpers/email.js`: cargarlo una vez en un `config/entorno.js` que valide y exporte las variables.
  - Búsqueda de login con tres variantes de correo (`loginController.js:45-47`): normalizar el
    correo al guardarlo y buscar una sola vez.

- [ ] **REF-09 🟢 M — Relación polimórfica `ListaItem (tipo, id_ref)` sin llave foránea.**
  Al borrar un lote o especie quedan elementos huérfanos que se filtran en cada lectura.
  **Hacer:** dos columnas nullable `id_lte` / `id_cat` con FK `ON DELETE CASCADE`, o limpieza en los
  hooks `afterDestroy`.

## 5. Buenas prácticas y mantenimiento

- [ ] **BP-01 🟠 M — Migraciones hechas a mano que silencian errores.**
  `helpers/migraciones.js` (`asegurarColumna`, `asegurarAncho`) atrapa cualquier error y solo
  avisa; el servidor arranca con un esquema incompleto. `BD_SYNC=alter` en `index.js:20-21` puede
  alterar tablas en producción. **Hacer:** migraciones versionadas (Umzug o `sequelize-cli`) con
  tabla de control; fallar el arranque si una migración falla; prohibir `alter`/`force` cuando
  `NODE_ENV=production`.

- [ ] **BP-02 🟠 S — Sin linter ni formateador.**
  No hay ESLint/Prettier; hay líneas de más de 250 caracteres y varias sentencias por línea
  (`socialController.js`, `pedidoAdminController.js`). **Hacer:** `eslint` (config plana +
  `eslint-plugin-n`) y `prettier` con `printWidth: 120`; scripts `lint` y `format`.

- [ ] **BP-03 🟠 S — Registro de eventos con `console.*`.**
  Mezcla de `console.log/warn/error` con colores ANSI; `mensajeBD` registra el error como efecto
  secundario. **Hacer:** un `helpers/registro.js` mínimo con niveles y contexto (ruta, usuario) —
  o `pino` — y desacoplar el registro de la traducción del mensaje.

- [ ] **BP-04 🟢 S — Metadatos del paquete.**
  `package.json` no declara `"engines": { "node": ">=20" }` aunque el README lo exige; no hay
  script de cobertura. **Hacer:** agregar `engines` y `"test:cov": "node --test --experimental-test-coverage test/*.test.js"`.

- [ ] **BP-05 🟢 M — Pruebas que faltan para lo hallado.**
  Agregar casos para ERR-01, ERR-02, ERR-03, ERR-04, ERR-07, SEG-05 (rutas con tabuladores y `\`)
  y un conteo de consultas en carrito/pedido para fijar RND-02. Las de TODO («Mejoras de pruebas»)
  siguen vigentes.

- [ ] **BP-06 🟢 S — Apagado ordenado.**
  `index.js` no atiende `SIGTERM`/`SIGINT`: no cierra el servidor HTTP ni el pool de Sequelize.
  **Hacer:** `server.close()` + `db.close()` en ambos eventos.

- [ ] **BP-07 🟢 S — Las pruebas escriben archivos reales en `public/uploads/`.**
  Al correr `npm test` en esta auditoría quedó `public/uploads/avatares/u2-….png`. Con el
  `.gitignore` ausente (REP-01) aparece como archivo nuevo para commitear. **Hacer:** que
  `helpers/avatar.js` e `imagenes.js` tomen la carpeta de una variable (`UPLOADS_DIR`) y que
  `test/ayuda.js` la apunte a un directorio temporal (`os.tmpdir()`) que se borre al terminar.

## 6. Repositorio y documentación

- [ ] **REP-01 🔴 S — `.gitignore` se ignora a sí mismo y no está versionado.**
  El `.gitignore` de la copia principal contiene `.gitignore` y `.gitattributes`. Por eso esta
  rama (y cualquier clon o worktree) **no lo tiene**: un `git add .` aquí subiría `.env`,
  `node_modules/` y fotos subidas. **Hacer:** quitar esas dos líneas y versionar `.gitignore`.

- [ ] **REP-02 🟠 S — `.gitignore` ignora `plan/`, `resolver/`, `docs/` en cualquier nivel.**
  Sin barra inicial, `plan/` también ignora **esta carpeta `doc/plan/`** en la copia principal,
  y `resolver/` ignora `doc/resolver/` (contradice lo anotado en TODO). **Hacer:** usar `/plan/`,
  `/resolver/`, `/docs/` si la intención es solo la raíz.

- [ ] **REP-03 🟠 S — `package-lock.json` ignorado.**
  Las instalaciones no son reproducibles (los rangos `^` pueden traer versiones distintas al
  corregir). **Hacer:** versionar el lockfile y usar `npm ci`.

- [x] **REP-04 🟢 M — Guías duplicadas:** resuelto en el plan 10; la guía se reorganizó en
  `doc/guia-codigo/` y los temas de referencia quedaron consolidados en `doc/01`–`06`.

---

## Plan de acción por fases

Cada fase termina con `npm test` en verde y un commit por hallazgo (`fix(...)`, `refactor(...)`,
`perf(...)`, `chore(...)`), como en los planes 04 y 05.

### Fase 1 — Higiene urgente (≈ ½ día)
Riesgo de fuga de secretos y errores 500 visibles.
1. REP-01, REP-02, REP-03 (repositorio).
2. SEG-01 (README y rotar la clave), SEG-02 (secretos de ejemplo).
3. ERR-01, ERR-02, ERR-03, ERR-04 con sus pruebas (BP-05 parcial).

### Fase 2 — Correctitud de datos (≈ 1 día)
4. ERR-05 (decidir regla caja vs. reserva), ERR-07, ERR-08, ERR-09.
5. ERR-10 + verificación en MariaDB desechable (junto con la verificación pendiente de TODO).
6. ERR-06, ERR-11, ERR-12.

### Fase 3 — Rendimiento (≈ 1 día)
7. RND-01 (una sola fuente de expiración) → RND-02 (helper `disponibilidadDeLotes`).
8. RND-03, RND-04, RND-06.
9. RND-05 (cola de correo) junto con SEG-07.

### Fase 4 — Seguridad en profundidad (≈ 1 día)
10. REF-06 (quitar manejadores en línea) → SEG-03 (helmet + CSP).
11. SEG-04 (CSRF), SEG-05 (`rutaVolver`), SEG-06, SEG-08.

### Fase 5 — Refactorización y mantenimiento (≈ 2 días, opcional antes de entregar)
12. BP-02 (lint/format) primero, para que los demás diffs salgan limpios.
13. REF-01, REF-03, REF-04, REF-08 → REF-02 (servicios de pedido).
14. BP-01 (migraciones versionadas), BP-03, BP-04, BP-06, BP-07.
15. REF-05, REF-07, REF-09, REP-04.

## Resumen

| Categoría | 🔴 Alta | 🟠 Media | 🟢 Baja | Total |
|---|---:|---:|---:|---:|
| Errores | 3 | 7 | 2 | 12 |
| Seguridad | 2 | 5 | 1 | 8 |
| Rendimiento | 2 | 3 | 1 | 6 |
| Refactorización | 0 | 6 | 3 | 9 |
| Buenas prácticas | 0 | 3 | 4 | 7 |
| Repositorio/doc | 1 | 2 | 1 | 4 |
| **Total** | **8** | **26** | **12** | **46** |

Lo que está bien y conviene conservar: contraseñas con bcrypt y `sesion_version` para invalidar
sesiones; tokens de correo guardados solo como hash; respuestas uniformes que no revelan si una
cuenta existe; validación de la firma real de las imágenes; `jsonSeguro` para incrustar JSON;
consultas de cuenta siempre filtradas por `id_usuario`; transacciones con bloqueo en crear/pagar
y el índice único de `compra` como garantía final contra doble venta.
