# Plan 05 — Navegación (/dashboard), tienda con sliders y filtros reales, favoritos, pago con varios métodos y usuarios separados

Fecha: 13 de noviembre de 2026
Destinatario: un agente sin contexto previo. Continúa los planes 01–04 (ya ejecutados; 131 pruebas pasaban en esa fecha). Antes de empezar lee `doc/README.md`, `doc/03-rutas-y-permisos.md`, `doc/.reports/TODO.md` y la guía de código en `doc/guia-codigo/README.md`.

**Orden:** Fase 1 → 2 → 3 → 4 → 5 → 6. Un commit por fase. Cada fase termina con `npm test` en verde (hoy 131) y con pruebas nuevas.

---

## 0. Contexto mínimo

- Proyecto `sistema-lonja`: Node/Express 5 + EJS + Sequelize 6 (MariaDB real, SQLite en pruebas). Raíz Windows `M:\_Documentos\.Proyectos\_universidad\sistema-lonja`; en shell Linux `$HOME/mnt/sistema-lonja`. Servidor `node index.js` → `http://localhost:2800`.
- Roles: `admin`, `capturista` (**trabajadores**, usan el panel) y `comprador` (**clientes**, usan la tienda). `/` es la **tienda pública**; `/inicio` es hoy el panel del personal (`loginController.principal`, `routes/login_router.js`).
- Helpers a reutilizar: `helpers/navegacion.js` (`inicioSegun`, `rutaVolver`, `destinoTrasEntrar`, `volverA`, `errorDeSitio`), `helpers/utiles.js` (`aMensaje`, `aError`), `helpers/listado.js` + `views/plantillas/{barra-listado,paginacion,encabezado-orden}.ejs`, `helpers/filtros.js`, `helpers/pedidos.js`, `helpers/pasarela.js`, `helpers/seguridad.js` (`crearLimite`), `helpers/iconos.js` (`icono(nombre, tam, clase)`; agrega los que falten).
- Vistas de la tienda: `views/tienda/{index,lote,especie,_tarjeta-lote,_fila-temas}.ejs`; estilos `public/css/tienda.css`; JS `public/js/lonja-tienda.js` (funciones `iniciar*`). Cabecera común: `views/plantillas/header.ejs`.
- **Pruebas desde Linux:** `node_modules/sqlite3` del proyecto es binario de Windows. Copia el proyecto **sin** `node_modules` ni `.git` a una carpeta fuera del repo, `npm install --no-package-lock`, luego `npm install sqlite3@5.1.7 --no-save --no-package-lock`, y corre `BD_DIALEC=sqlite node --test test/*.test.js` (~75 s). No toques el `node_modules` del usuario.
- **Git:** un commit por fase, en español, prefijo convencional, con la atribución que indique el entorno. No cambies la identidad configurada; no hagas push; no reescribas historia; `git add` con rutas explícitas, nunca `-A`. `doc/plan`, `doc/reports` y `docs/` están ignorados por `.gitignore`. Si git deja `.lock` o `tmp_obj_*` con `Operation not permitted`, pide permiso de borrado y elimínalos.
- **Secretos:** `.env` es del usuario. **No escribas, leas ni imprimas credenciales** (`GMAIL_USER`, `GMAIL_PASS`, JWT, BD). Solo se documentan en `.env.example`.
- **Verificación visual:** el usuario inicia sesión en su navegador; tú no escribes contraseñas reales. Revisa claro/oscuro, escritorio y 375 px; contraste ≥ 4.5:1; consola sin errores.

---

## 1. Peticiones del usuario y estado actual

| # | Petición | Estado hallado |
|---|---|---|
| P1 | El logo del header redirige a `http://localhost:2800/` (no a `/inicio`) | `header.ejs:29`: el logo va a `/inicio` para el personal |
| P2 | Cambiar `/inicio` por `/dashboard`; agregar, solo para trabajadores, la opción "Dashboard" y la opción "Tienda" que redirige a `/` | La ruta es `/inicio`; no hay enlace a la tienda en el menú del personal |
| P3 | El slider del héroe (`.tienda-heroe__slide`) no funciona: cambia solo con el tiempo, sin botones en los extremos y con los puntos de la esquina inferior derecha inertes | `iniciarHeroe()` solo rota con `setInterval`; los puntos son `<span aria-hidden>` sin eventos |
| P4 | Las listas de productos (filas) usan scroll; cambiarlo por botones redondos `<` `>` centrados en los extremos que salten de 4 en 4, en **todas** las listas | `_fila-temas.ejs` + `iniciarFilas()`: botones pequeños arriba a la derecha y `scrollBy(80 %)` |
| P5 | Mover el buscador al header, a la derecha, antes de los botones de sesión, **del mismo tamaño** que el actual | Está en la barra de categorías de `tienda/index.ejs:73` (`.tienda-buscador`) |
| P6 | Filtros "Precio por kilo" y "Kilos mínimos": cambiar los campos de teclado por **sliders** (precio con dos extremos), con los límites de los **datos reales disponibles** | `<input type="number">` en `tienda/index.ejs:149-160` |
| P7 | Cliente: completar **favoritos** y **pagar** con tarjeta u otro método (simulado, pero la compra queda registrada de verdad) | El corazón (`data-favorito`) solo muestra "Las listas estarán disponibles muy pronto"; `POST /cuenta/favoritos` solo agrega; el pago solo admite tarjeta |
| P8 | Admin: en `/usuarios` separar la lista de trabajadores y la de clientes | Una sola tabla con filtro de rol |
| P9 | Llenar los apartados de correo del `.env` | **No lo hace el agente** (ver Fase 6): son credenciales del usuario |

---

## Fase 1 — Navegación: `/dashboard`, logo y menú del personal (P1, P2)

**Archivos:** `routes/login_router.js`, `controllers/loginController.js`, `helpers/navegacion.js`, `views/plantillas/header.ejs`, `views/inicio.ejs` (renombrar a `views/dashboard.ejs`), vistas con enlaces a `/inicio`, `app.js`, `public/js/*.js`, pruebas, `doc/03-rutas-y-permisos.md`, `README.md`.

1. Renombrar la ruta `GET /inicio` → `GET /dashboard` (`rutaProteger`, `permitir("admin","capturista")`). Dejar `GET /inicio` como **redirección 301 a `/dashboard`** (marcadores antiguos). Renombrar la vista `inicio.ejs` → `dashboard.ejs` y el `render`.
2. `inicioSegun(usuario)` devuelve `/dashboard` para personal y `/` para comprador. Buscar y actualizar **todas** las referencias: `grep -rn "/inicio" controllers helpers routes views public/js test doc README.md` (login, verificación de correo, `volver`, redirecciones tras errores 403, enlaces "Volver al inicio", `rutaActual`/`activo()` en el header, `data-protegida`, tests).
3. **Logo:** `href="/"` para **todos** los roles.
4. **Menú del personal** (`header.ejs`, rama `else`): primer elemento "Dashboard" (`/dashboard`, activo si `rutaActual` empieza por `/dashboard`) y segundo "Tienda" (`/`) con icono `basket` y una insignia o texto "ver como cliente". Solo se muestra a `admin` y `capturista`; el comprador conserva su menú actual (Tienda, Carrito, Mi cuenta, Favoritos, Mis opiniones).
5. Los textos `t('inicio')` o equivalentes en `helpers/i18n.js` pasan a "Dashboard".
6. **Pruebas:** `/dashboard` 200 para admin/capturista, 403 para comprador, redirección a `/acceso?volver=%2Fdashboard` sin sesión; `/inicio` → 301 `/dashboard`; el login de personal termina en `/dashboard` y el de comprador en `/`; el HTML del header del personal contiene enlaces a `/dashboard` y a `/`; el logo apunta a `/` en los tres roles; el comprador no ve "Dashboard".

**Commit:** `feat(nav): ruta /dashboard, logo a la tienda y acceso Dashboard/Tienda para el personal`

---

## Fase 2 — Slider del héroe, filas de 4 en 4 y buscador en el header (P3, P4, P5)

**Archivos:** `views/tienda/index.ejs`, `views/tienda/_fila-temas.ejs`, `views/plantillas/header.ejs`, `public/css/tienda.css`, `public/js/lonja-tienda.js`, `test/tienda-publica.test.js`.

### 2.1 Héroe (P3)
1. Añadir botones **anterior/siguiente** redondos, centrados verticalmente en los **extremos** del héroe (`<button class="tienda-heroe__flecha tienda-heroe__flecha--izq|der" aria-label="Lote anterior|siguiente">`), visibles siempre en escritorio y táctiles en móvil (≥ 44 px).
2. Convertir los puntos de la esquina inferior derecha en `<button type="button" aria-label="Ir al destacado N" aria-current>` clicables; deben tener área de clic ≥ 24 px (padding) aunque el punto visual sea pequeño.
3. `iniciarHeroe()`: función `ir(n)` única que cambia `activo` en slides y puntos y actualiza `aria-current`; flechas y puntos la usan; el autoavance (6 s) se **reinicia** tras una acción del usuario, se pausa con hover/foco y con `document.hidden`, y se **desactiva** con `prefers-reduced-motion`. Soporte de teclado (← → en el héroe enfocado) y deslizamiento táctil (umbral 40 px). Con un solo destacado no se muestran controles.
4. Comprobar en CSS que los controles no quedan tapados por `.tienda-heroe__velo`/`__contenido` (z-index) ni por el panel derecho (`.tienda-heroe__panel`) y que los enlaces del slide siguen funcionando.

### 2.2 Filas de productos (P4)
1. Reemplazar el desplazamiento libre por **paginación por saltos**: `_fila-temas.ejs` pierde los botones de la cabecera y gana dos botones **redondos** (`<` y `>`, 44 px, sombra, fondo de superficie) posicionados a los **extremos laterales, centrados verticalmente** sobre la pista (`position:absolute; top:50%; transform:translateY(-50%)`, medio botón fuera si el diseño lo permite).
2. `iniciarFilas()`: cada clic avanza **4 tarjetas** (`scrollTo` al `offsetLeft` de la tarjeta `índice ± 4`, con `behavior: "smooth"`; calcular el índice actual con la tarjeta más cercana al borde izquierdo). Deshabilitar `<` al inicio y `>` al final (`disabled` + `aria-disabled`); ocultar ambos si caben todas las tarjetas. Recalcular en `resize`.
3. Ocultar la barra de desplazamiento y evitar el scroll libre con rueda/touch **horizontal** solo en escritorio; en móvil se permite deslizar con el dedo (`scroll-snap-type: x mandatory`) además de los botones.
4. Aplicar el componente a **todas** las filas de la tienda (`Mejor precio por kilo`, `Más kilos`, `Pocos kilos`, destacados, filas por tema, relacionados en `lote.ejs` y `especie.ejs`, listas en `cuenta/lista.ejs` si usan `_fila-temas`). `grep -rn "data-fila\|_fila-temas" views`.

### 2.3 Buscador en el header (P5)
1. Mover el formulario de búsqueda (`.tienda-buscador`, `name="q"`, sugerencias `data-buscador-tienda`) al **header**, a la **derecha del menú y antes de los botones de moneda/idioma/tema/sesión**, con **exactamente el mismo ancho y alto** que tiene hoy (medir `getBoundingClientRect()` antes y después; anotar las dimensiones en el informe). Extraer la plantilla a `views/plantillas/buscador-tienda.ejs` e incluirla desde el header.
2. Visible para **visitantes y compradores** en todas las páginas públicas y de cuenta (envía a `/?q=`). Para el **personal** conserva su comportamiento actual (si el header ya tiene su búsqueda interna, no la dupliques; si no la tiene, no la muestres: el personal usa `/buscar`).
3. Quitar el buscador de la barra de categorías de `tienda/index.ejs` y reordenar para que las categorías ocupen el ancho. Conservar `Ctrl+K`/`/` si ya existía y el comportamiento de sugerencias (límite de peticiones, `/tienda/sugerencias`).
4. Responsive: a < 1200 px el header se colapsa; el buscador va dentro del menú colapsado, a ancho completo, **antes** de los botones; a ≥ 1200 px mantiene el tamaño original.
5. **Pruebas** (HTML): el header de `/` contiene `name="q"` una sola vez y antes del enlace de acceso; `tienda/index` ya no contiene `data-buscador-tienda` fuera del header; el comprador lo ve; el botón `data-heroe-prev|next` y los puntos `button` existen cuando hay ≥ 2 destacados; la fila contiene los botones `data-fila-prev|next`. La lógica de saltos de 4 se prueba con una función pura exportable (`indiceSiguiente(indice, total, paso, direccion)`) en un archivo de utilidades de cliente cargable en Node, o con prueba de navegador manual documentada.

**Commit:** `feat(tienda): slider del heroe funcional, filas con saltos de cuatro y buscador en el header`

---

## Fase 3 — Filtros con slider y límites reales (P6)

**Archivos:** `controllers/tiendaController.js` (`portada`, `condicionesCuadricula`), `helpers/tienda.js`, `views/tienda/index.ejs`, `public/css/tienda.css`, `public/js/lonja-tienda.js`, `test/tienda-publica.test.js`.

1. **Límites reales:** nueva función `limitesDisponibles()` que, sobre los lotes **disponibles** (sin `Compra`, sin reserva vigente, mismas reglas que `lotesDisponibles`), devuelve `{ precioMin, precioMax, kilosMin, kilosMax }` con `MIN/MAX(precio_kilo_salida)` y `MIN/MAX(kilos)`. Redondea a la baja el mínimo y al alza el máximo (precio al peso entero o a 0.5; kilos al entero) para que los extremos incluyan lotes reales. Si no hay lotes, desactiva los sliders con un aviso. **No dependen** de los demás filtros (son el universo completo), pero las etiquetas muestran "N lotes" tras aplicar.
2. **Slider de precio doble:** dos `<input type="range">` superpuestos (mínimo y máximo) con una barra de rango coloreada entre ambos; los pulgares no se cruzan (`min ≤ max`); etiquetas en vivo "Desde $X · Hasta $Y /kg" con `dinero()`; paso 1 (o 0.5 si el rango es < 50). Debe poder moverse **desde ambos extremos**. Accesible: cada pulgar con `aria-label`, `aria-valuemin/max/now`, teclado (flechas, Re Pág/Av Pág).
3. **Slider de kilos mínimos:** un `<input type="range">` de `kilosMin` a `kilosMax` con etiqueta "Al menos N kg".
4. **Envío al servidor:** los `name` actuales (`precioMin`, `precioMax`, `kilosMin`) se conservan; solo se **envían** cuando difieren de los extremos (si el pulgar está en el límite, se deshabilita su `name` para no ensuciar la URL ni la paginación). Al soltar el pulgar (`change`) se envía el formulario tras 400 ms de pausa (o con el botón "Aplicar filtros"). Sin JavaScript, el formulario sigue funcionando con los `range` nativos.
5. **Valores guardados:** al recargar con `?precioMin=…&precioMax=…` los pulgares recuperan su posición; valores fuera de rango o invertidos se normalizan en el servidor (`clamp` a los límites, intercambiar si min > max).
6. Mantener el resto de filtros (tipo, especie, orden) y los "filtros activos" (chips) mostrando el rango en formato legible.
7. **Pruebas:** `limitesDisponibles` ignora lotes vendidos y reservados; con lotes de precio 50–180 y kilos 5–120 el HTML contiene `min="50" max="180"` y `min="5" max="120"`; `?precioMin=100&precioMax=60` se normaliza; `?precioMax=9999` se recorta; el filtrado devuelve solo lotes en el rango; sin lotes los sliders se muestran deshabilitados.

**Commit:** `feat(tienda): filtros de precio y kilos con sliders y limites reales de los lotes disponibles`

---

## Fase 4 — Cliente: favoritos completos (P7, parte 1)

**Archivos:** `controllers/socialController.js`, `routes/cuenta_router.js`, `app.js` (middleware que expone `favoritosIds`), `views/tienda/{_tarjeta-lote,lote,especie}.ejs`, `views/cuenta/{listas,lista}.ejs`, `public/js/lonja-tienda.js`, `public/css/tienda.css`, `views/plantillas/header.ejs`, `test/social.test.js`.

1. **Estado real del corazón:** para un comprador con sesión, un middleware ligero carga los `id_ref` de su lista "Favoritos" (`ListaItem` tipo `lote`/`especie`) y los expone en `res.locals.favoritos` (`{ lote: Set, especie: Set }`); las tarjetas, el detalle de lote y la ficha de especie pintan el corazón relleno con `aria-pressed="true"`.
2. **Alternar sin recargar:** `POST /cuenta/favoritos/alternar` (JSON: `{ tipo, id_ref }`) agrega o quita de "Favoritos" y devuelve `{ ok, favorito, total }`; el JS actualiza el corazón, el contador del menú Favoritos y un aviso breve. Reutiliza la validación de `guardarFavorito` (el lote/especie debe existir). Conserva `POST /cuenta/favoritos` (sin JS).
3. **Visitante sin sesión:** el corazón redirige a `/acceso?volver=<página>`; el personal ve el corazón deshabilitado con el aviso "Solo cuentas de cliente".
4. **Elegir lista:** menú del corazón (clic largo o botón "⋯ Guardar en…") con las listas del comprador (casillas) y "Nueva lista" (nombre → crear y agregar). Rutas JSON: `GET /cuenta/listas.json`, `POST /cuenta/listas/:id/items` (ya existe) y `DELETE /cuenta/listas/:id/items`, todas filtradas por `id_usuario`.
5. **Pantallas:** `/cuenta/listas` muestra tarjetas con foto, cantidad y vista previa; `/cuenta/listas/:id` muestra los elementos con foto y precio, lotes vendidos o reservados atenuados con "No disponible", y botones **"Agregar al carrito"** por lote y **"Agregar disponibles al carrito"** (usa `POST /carrito/agregar/:id` y muestra cuántos se agregaron y cuáles no). Quitar elemento, renombrar y borrar lista funcionan con avisos legibles.
6. Corregir en `lonja-tienda.js` el aviso "estarán disponibles muy pronto" (stub): eliminar `data-favorito` huérfano.
7. **Pruebas:** alternar agrega y quita; el corazón se pinta tras recargar; lote inexistente → 404 JSON; lista ajena → 404; personal → 403; anónimo → redirección con `volver`; "Agregar disponibles" omite vendidos/reservados y reporta el conteo; ningún comprador ve favoritos de otro.

**Commit:** `feat(cuenta): favoritos funcionales con corazon persistente, listas elegibles y paso de listas al carrito`

---

## Fase 5 — Cliente: pago con varios métodos simulados (P7, parte 2)

**Archivos:** `helpers/pasarela.js`, `controllers/pedidoController.js`, `views/pedido/pago.ejs`, `views/cuenta/pedido.ejs`, `models/Pedido.js` (solo si hace falta un campo; usar `pago_metodo` existente), `helpers/email.js`, `test/pedidos.test.js`.

El pago sigue siendo **simulado** (sin cargos reales), pero al aprobarse **crea las `Compra` reales** con la misma transacción de siempre (`pagar`): factura, correo de confirmación, estado `pagado`, reportes del personal.

1. **Selector de método** en `pedido/pago.ejs` (pestañas o tarjetas):
   - **Tarjeta** (ya existe: validación Luhn, vencimiento, CVV, tarjetas de prueba con un clic).
   - **Transferencia SPEI simulada:** muestra una CLABE ficticia (`0000…` claramente falsa), concepto con el número de pedido y monto exacto; botón **"Simular que ya transferí"** aprueba el pago.
   - **Pago en la lonja (efectivo/terminal)** solo si `entrega === "recoger"`: el pedido queda `pendiente_pago` con la reserva extendida (parametrizable con `RESERVA_EFECTIVO_MINUTOS`, por defecto 120) y el **personal** lo marca como cobrado desde `/pedidos/:id` (botón "Confirmar cobro", solo `pendiente_pago` con método efectivo → crea las `Compra`).
   - Cada método lleva el aviso permanente **"PAGO SIMULADO: no se realiza ningún cargo"**.
2. **Pasarela:** `cobrar({ metodo, monto, referencia, tarjeta })` devuelve `{ aprobado, referencia, marca/metodo, ultimos4? }`; `metodo` ∈ `tarjeta | transferencia | efectivo`. Las tarjetas y su lógica no cambian. Transferencia: referencia `SPEI-…`; efectivo: referencia `LONJA-…` generada al confirmar el cobro.
3. **Controlador:** `POST /pedido/:id/pagar` recibe `metodo` (lista blanca; cualquier otro → 400). Reutiliza toda la lógica transaccional, idempotencia, tope de 5 rechazos (solo aplica a tarjeta) y correo. `pago_metodo` guarda `Simulado Visa`, `Simulado SPEI` o `Efectivo en lonja`; `pago_ultimos4` solo para tarjeta.
4. **Experiencia:** tras pagar, la pantalla del pedido muestra el resumen, las facturas web/PDF y un botón "Volver a la tienda"; el carrito queda vacío y el contador del menú se actualiza. Si el método es efectivo, muestra "Tu pedido está reservado hasta HH:MM; págalo en la lonja".
5. **Seguridad:** el total siempre lo calcula el servidor; nunca se registra el número de tarjeta ni el CVV; el método no cambia el precio; el personal (rol) no puede pagar por un comprador desde estas rutas.
6. **Pruebas:** transferencia aprobada crea la `Compra` con `id_ped` y total correcto y envía correo con PDF; efectivo no crea `Compra` hasta que el personal confirma; efectivo con `entrega=domicilio` → 400; método desconocido → 400; doble envío no duplica; el personal confirma y se crea una sola `Compra`; la reserva de efectivo se extiende y luego libera; los totales con envío coinciden.

**Commit:** `feat(pedidos): pago simulado con tarjeta, transferencia y efectivo en la lonja con compra real`

---

## Fase 6 — Admin: usuarios separados y correo en `.env` (P8, P9) + cierre

### 6.1 Usuarios separados (P8)
**Archivos:** `controllers/usuarioController.js`, `views/usuarios/index.ejs`, `routes/usuario_router.js`, `helpers/filtros.js`, `test/usuarios.test.js` (o el existente).

1. `/usuarios` muestra **dos secciones** (pestañas Bootstrap accesibles o dos tarjetas): **"Trabajadores"** (roles `admin` y `capturista`) y **"Clientes"** (rol `comprador`), cada una con su propia tabla, **búsqueda, orden, paginación y contador** independientes (parámetros con prefijo: `qT`, `paginaT`, `ordenT` / `qC`, `paginaC`, `ordenC`; o rutas `/usuarios?seccion=trabajadores|clientes`).
2. La pestaña activa se conserva en la URL y al paginar. El botón "Nuevo usuario" solo aparece en Trabajadores (los clientes se crean desde `/registro`).
3. **Clientes:** columnas útiles: usuario, nombre, correo, **verificado** (insignia), teléfono, **cliente de la lonja vinculado** (`codigo_cpr` con enlace a `/compradores/:id`), pedidos (conteo), estado; acciones: ver/editar datos básicos, activar/desactivar (sin cambiar rol, regla ya existente). Trabajadores: columnas actuales (puesto, rol).
4. Los filtros por rol dentro de Trabajadores se limitan a `admin/capturista`; el filtro de rol global desaparece. Mantener la regla de no desactivarse a uno mismo.
5. **Pruebas:** la pestaña Trabajadores no contiene compradores y la de Clientes no contiene personal; cada sección pagina y busca por separado; un capturista recibe 403 en `/usuarios`; "Nuevo usuario" no aparece en Clientes; el conteo de pedidos y el enlace al cliente son correctos.

### 6.2 Correo en `.env` (P9) — el agente **no** llena credenciales
Las credenciales (`GMAIL_USER`, `GMAIL_PASS` = contraseña de aplicación de 16 dígitos, `APP_URL`) son del usuario y **no deben ser escritas ni leídas por el agente**. Para facilitárselo:
1. Crear `scripts/configurar-correo.js` (`npm run correo:configurar`): asistente **interactivo en la terminal del usuario** que pide `GMAIL_USER`, `GMAIL_PASS` (entrada oculta) y `APP_URL`, valida formato (correo, 16 caracteres sin espacios, URL http/https), actualiza **solo esas tres claves** de `.env` conservando el resto y sus comentarios, crea `.env` desde `.env.example` si no existe, **no imprime** la contraseña y termina probando `verificarTransporte()` con un resumen enmascarado (usa `enmascararCorreo`). Con `--sin-prueba` omite la prueba de conexión.
2. `doc/04-instalacion-y-despliegue.md`: pasos para crear la contraseña de aplicación de Google, ejecutar el asistente, reiniciar el servidor y comprobar en `/configuracion` → pestaña Correo ("Enviar correo de prueba").
3. **Pruebas** del asistente con `.env` temporal: conserva claves y comentarios, reemplaza solo las tres, rechaza valores inválidos, no escribe la contraseña en la salida estándar.

### 6.3 Cierre
1. `npm test` completo; recorrido manual (claro/oscuro, 375 px) con sesión del usuario: header con buscador y logo a `/`; menú del personal con Dashboard y Tienda; héroe con flechas y puntos; filas de 4 en 4; filtros con sliders; corazón persistente; pago por tarjeta, transferencia y efectivo; `/usuarios` con pestañas; consola sin errores.
2. Actualizar `doc/03-rutas-y-permisos.md` (`/dashboard`, `/inicio` 301, `/cuenta/favoritos/alternar`, métodos de pago, `/usuarios` por secciones), `doc/05-seguridad.md`, `doc/06-pruebas.md`, `README.md` y `doc/.reports/TODO.md` (cerrar los puntos resueltos y dejar los de verificación manual que no se pudieron hacer, entre ellos la prueba en MariaDB).
3. **Informe final** (`doc/.reports/08-informe-plan-05.md`): commits, pruebas, medidas del buscador antes/después, qué se verificó en pantalla y qué no, y el recordatorio de ejecutar `npm run correo:configurar`.

**Commit:** `feat(usuarios): trabajadores y clientes separados; feat(correo): asistente para configurar .env; docs: plan 05`  *(dos commits: uno por 6.1 y otro por 6.2 + 6.3)*

---

## 2. Riesgos

| Riesgo | Mitigación |
|---|---|
| Renombrar `/inicio` rompe enlaces, pruebas o redirecciones | 301 de compatibilidad, `grep` exhaustivo, prueba de que ninguna vista conserva `/inicio` salvo la redirección |
| El buscador del header cambia de tamaño o se desborda en móvil | Medir antes/después; probar 375, 768, 1200, 1440 px; versión colapsada dentro del menú |
| Controles del héroe tapados por capas (z-index) | Revisar `__velo`, `__contenido`, `__panel`; prueba visual y de clic real con el navegador |
| Las filas con saltos de 4 se descuadran con tarjetas de distinto ancho | Calcular por `offsetLeft` de tarjetas reales, no por píxeles fijos; recalcular en `resize` |
| Sliders no accesibles o con pulgares cruzados | `aria-*`, teclado, tope `min ≤ max`, prueba con valores extremos y rango de un solo valor |
| Límites que no cuadran con los datos reales | Calcularlos en servidor sobre lotes realmente disponibles (sin vendidos/reservados) y probar con datos conocidos |
| Favoritos de un comprador visibles a otro | Todo filtrado por `req.usuario.id`; pruebas de aislamiento |
| El método efectivo permite apartar lotes indefinidamente | Reserva con tope (`RESERVA_EFECTIVO_MINUTOS`), solo para `recoger`, límite de pedidos pendientes por comprador (3) |
| Un método de pago nuevo duplica compras o cobra distinto | Misma transacción, índice único `uq_compra_lote`, prueba por método de que existe una sola `Compra` |
| Credenciales de correo filtradas | El agente no las toca; el asistente corre en la terminal del usuario, oculta la clave y no la imprime; `.env` sigue ignorado por git |
| Separar `/usuarios` rompe filtros y paginación existentes | Parámetros con prefijo por sección, pruebas por pestaña y reutilizar `helpers/listado.js` |
| Commit accidental de ignorados | `git add` con rutas explícitas |
