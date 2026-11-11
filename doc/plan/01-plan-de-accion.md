# Plan de acción — Sistema Lonja de Veracruz

Fecha: 11 de noviembre de 2026
Destinatario: un agente sin contexto previo. Todo lo necesario está en este documento.

---

## 0. Antes de empezar (leer completo)

### 0.1 El proyecto

- Aplicación web Node.js (ESM) con **Express 5 + EJS + Sequelize 6**. Base de datos **MariaDB** en uso real; **SQLite en memoria** para pruebas.
- Raíz del repositorio: `M:\_Documentos\.Proyectos\_universidad\sistema-lonja` (en una shell Linux conectada suele montarse como `$HOME/mnt/sistema-lonja`).
- Servidor local: `http://localhost:2800` (`npm start` o `npm run dev`; puerto en `.env`, variable `PORT`).
- Estilos: Bootstrap 5 local (`/bootstrap`), hoja propia `public/css/lonja.css`. Iconos: `helpers/iconos.js` expone `icono(nombre, tam, clase)` en todas las vistas (SVG de Bootstrap Icons; si falta un icono, agrégalo a ese archivo).
- JS del cliente: `public/js/lonja-app.js` (sin framework, funciones `inicializar*` llamadas al final del archivo) y `public/js/lonja-graficas.js` (Chart.js).
- Sesión: JWT en cookie `_token`. Middleware `middleware/protegerRutas.js` (`rutaProteger`, `permitir(...roles)`). Roles: `admin` y otros; borrar registros es solo `admin`.
- Preferencias del usuario (tema, idioma, moneda, fuente): `middleware/preferencias.js` → `res.locals.pref`. El `<html>` lleva `data-theme="<%= pref.tema %>"` (ver `views/plantillas/header.ejs`, línea 2).

### 0.2 Modelos y relaciones (`models/`)

| Modelo | PK | Campos | Relaciones |
|---|---|---|---|
| Tipo | `id_tpo` | nombre | Tipo 1—N Especie (`especies`) |
| Lote | `id_lte` | kilos, numero_cajas, precio_kilo_salida, fecha | Lote 1—N Especie (`especies`) |
| Especie | `id_epe` | nombre, imagen, `id_tpo`, `id_lte` | pertenece a Tipo (`tipo`) y Lote (`lote`) |
| Comprador | `codigo_cpr` | nombre, apellido_paterno, apellido_materno, direccion, correo | Comprador 1—N Compra (`compras`) |
| Compra | `id_cmp` (= id del lote comprado) | codigo_cpr, precio_kilo_final, precio_total, fecha | pertenece a Lote (`lote`, FK `id_cmp`) y Comprador (`comprador`) |
| Usuario | `id` | usuario, nombre_completo, correo, email_verificado, telefono, puesto, foto, rol, activo… | — |

Un lote está "vendido" cuando existe una Compra con `id_cmp = id_lte`.

### 0.3 Rutas actuales (`routes/`, montadas en `app.js`)

`/tipos`, `/compradores`, `/lotes`, `/especies`, `/compras` (todas con `rutaProteger`), `/usuarios` (solo admin), `/reportes`, `/configuracion`. Cada CRUD tiene `GET /`, `GET /crear`, `POST /`, `GET /:id/editar`, `PUT /:id`, `DELETE /:id` (admin). Compras además: `GET /:id/factura`, `GET /:id/factura.pdf`, `POST /:id/enviar-correo`.
**No existen páginas de detalle** (`GET /:id`) para ninguna entidad; hay que crearlas (Fase 5).

### 0.4 Pruebas

- `npm test` (= `node --test test/*.test.js`). 32 pruebas, deben seguir pasando al final de cada fase.
- Utilidades: `test/ayuda.js` (`arrancar()` levanta la app sobre SQLite en memoria con admin `admin` / `AdminPrueba123`; `cliente(base)` conserva cookies).
- **Problema conocido:** `node_modules/sqlite3` en la carpeta del proyecto es un binario de **Windows**. Si ejecutas las pruebas desde Linux falla con `invalid ELF header`. Solución: copia el proyecto a una carpeta de trabajo **fuera** del repositorio, ejecuta ahí `npm install sqlite3@5.1.7 --no-save --no-package-lock` y corre `BD_DIALEC=sqlite npm test`. No reemplaces el `node_modules` del usuario.
- Agrega pruebas nuevas en `test/` para cada fase (ver criterios de aceptación).

### 0.5 Reglas de git

- **Un commit por fase** (o por sub-entrega lógica), mensaje en español con prefijo convencional (`feat(...)`, `fix(...)`, `style(...)`, `docs(...)`).
- Autor: usa la identidad del repositorio (`git log -1 --format='%an <%ae>'`). Si git no tiene identidad configurada, pásala con `git -c user.name=... -c user.email=...` tomando esos valores del último commit.
- **No hagas push.**
- **No toques ni hagas commit de `scripts/demo.js`**: tiene cambios sin commitear del usuario.
- `doc/reports/` está ignorado por `.gitignore` (patrón `reports/`). Actualiza `doc/reports/TODO.md` igualmente, pero sabiendo que no entra al commit. `doc/plan/` sí se versiona.
- En la carpeta del usuario borrar archivos puede requerir permiso; git también borra archivos de bloqueo. Si aparece `index.lock` o `Operation not permitted`, pide permiso de borrado antes de seguir.

### 0.6 Verificación visual

El usuario revisa en el navegador. Al final de cada fase abre las páginas afectadas en `http://localhost:2800` (con sesión iniciada por el usuario; no escribas contraseñas reales) y revisa en **tema claro y tema oscuro**, y en ancho de escritorio y móvil (375 px).

---

## 1. Auditoría de las 20 tareas originales

Revisión del código en el commit `1792f37`. "Hecho" significa que el código lo implementa y las pruebas pasan; **no** se verificó visualmente con sesión iniciada en esta auditoría (la sesión del navegador estaba cerrada).

| # | Tarea original | Estado | Evidencia / lo que falta |
|---|---|---|---|
| 1 | Logos rotos en `/`; campos del login vacíos | **Parcial** | Logo se ve (verificado en navegador). Los campos tienen `value=""`, pero la contraseña muestra el *placeholder* `••••••••`, que **parece** una contraseña ya escrita. Cambiar a placeholder de texto ("Tu contraseña"). |
| 2 | Banner de cookies solo después de iniciar sesión | Hecho | `views/plantillas/footer.ejs`: `if (usuario && !pref.cookiesRespondidas)`. Verificado: el login no muestra banner. |
| 3 | Imagen de inicio no se renderiza | **Revisar con el usuario** | Se interpretó como favicon (ahora `public/img/favicon.svg`, 200). Si se refería a otra imagen, no se identificó. Preguntar al usuario al cerrar el plan. |
| 4 | Quitar botón "Inicio" del header (el logo ya redirige) | Hecho | `header.ejs`: el logo enlaza a `/inicio`; no hay ítem Inicio en el nav. |
| 5 | Engrane de configuración sin icono en inicio | Hecho (eliminado) | El acceso se retiró de inicio (tarea 11); el engrane vive en el menú del avatar. |
| 6 | Quitar "Permisos de Cookies" | Hecho | No hay enlace en footer ni header. |
| 7 | Cookies integradas en `/configuracion` y quitar botón | Hecho | Pestaña "Cookies y privacidad" (`views/configuracion/index.ejs`), `POST /configuracion/cookies`. |
| 8 | Avatar unificado con iniciales/foto y menú rápido | Hecho | `views/plantillas/avatar.ejs`, menú en `header.ejs` con Mi cuenta, Configuración y Cerrar sesión. |
| 9 | Banderas en lugar de siglas de idioma | Hecho | `public/img/flags/mx.svg`, `us.svg`. |
| 10 | Quitar Configuración del header | Hecho | Solo queda en el menú del avatar (acceso único). |
| 11 | Quitar Configuración de `/inicio` | Hecho | `views/inicio.ejs` no tiene enlace a configuración. |
| 12 | Factura web igual al PDF; logo de la factura web | Hecho (no verificado visualmente en esta auditoría) | `helpers/factura.js` alimenta web y PDF; `views/compras/factura.ejs` usa `.hoja-carta`. Volver a comparar lado a lado en la Fase 8. |
| 13 | Tablas ordenables por campo | **Roto parcialmente** | Ordenamiento en el cliente (`inicializarTablasOrdenables` en `lonja-app.js`). **Desde que Compras se pagina en el servidor, ordenar solo reordena las filas de la página actual**, no todo el registro. Se corrige en la Fase 2 (orden en el servidor). |
| 14 | Iconos consistentes en todas las tablas | Hecho, con detalle | Todas usan `icono()`. Los enlaces "Editar" de lotes, especies, compradores y tipos no tienen `aria-label` (sí `title`). Añadirlo en la Fase 2. |
| 15 | Reporte por año con dashboard y compras enlazadas | Hecho | `views/reportes/anual.ejs`, `controllers/reporteController.js`. La URL sigue siendo `/reportes/diario`. |
| 16 | Descarga del reporte como documento formal | Hecho | `helpers/reportePdf.js`, `GET /reportes/anual.pdf`. |
| 17 | Usuarios: más campos, correo, cambio y recuperación de contraseña | Hecho | `controllers/usuarioController.js`, `helpers/cuentas.js`, pruebas en `test/cuentas.test.js`. |
| 18 | Cookies: explicar qué hacen y cambiar su comportamiento | Hecho | `helpers/cookies.js`, banner con categorías, pruebas en `test/cookies.test.js`. |
| 19 | Botón "atrás" tras cerrar sesión no debe mostrar la página | **Parcial** | Las rutas protegidas envían `Cache-Control: no-store` y el logout es POST. Falta un respaldo contra la caché de retroceso del navegador (bfcache): en `lonja-app.js`, escuchar `pageshow` y si `event.persisted` es verdadero en una página protegida, ejecutar `location.reload()`. Probar manualmente: iniciar sesión → abrir `/compras` → cerrar sesión → botón Atrás → debe terminar en el login. |
| 20 | Más métricas visuales en `/inicio` | Hecho | `helpers/estadisticas.js`, `views/inicio.ejs` (KPIs, 3 gráficas, lotes, últimas compras). |

### 1.1 Problemas encontrados que no estaban en la lista

1. **Tema oscuro ilegible** (coincide con la tarea nueva 9). Causa: el `<html>` nunca recibe `data-bs-theme="dark"`, así que los componentes de Bootstrap (tablas, tarjetas, menús, `.text-dark`, `.bg-light`, `.table-light`) siguen usando texto negro de su tema claro, sobre los fondos oscuros de `lonja.css`.
2. **"Filas por página" se encima** (tarea nueva 2). Causa: `public/css/lonja.css` línea ~305 define `.form-control, .form-select { padding: 0.6rem 0.95rem; ... }`, que anula el `padding-right` de Bootstrap reservado para la flecha del `<select>` y el tamaño de `.form-select-sm`. Con `w-auto`, el número queda debajo de la flecha.
3. **Ordenamiento + paginación** incompatibles (ver tarea 13).
4. **Paginación de Lotes** no implementada (estaba en el TODO).

---

## 2. Tareas nuevas y decisiones tomadas

| # | Tarea nueva (palabras del usuario, resumidas) | Fase |
|---|---|---|
| N1 | En `/compras`, "ver captura" (botón Ver factura) debe abrir la factura encima de la página, sin recargar, con botón de cerrar y las opciones de la factura | 6 |
| N2 | "Filas por página" tiene caracteres encimados | 2 |
| N3 | Buscador de registros con sugerencias | 3 |
| N4 | Llevar a todas las tablas lo que tiene `/compras` (paginación, selector de filas) | 2 |
| N5 | Paginación con números (2 antes y 2 después), `‹ ›` para avanzar de uno y `« »` para ir al extremo | 2 |
| N6 | Filtros de búsqueda | 4 |
| N7 | Vincular registros entre páginas (clic en cliente, lote… lleva a su página) | 5 |
| N8 | Mantener solo un tema claro | 1 |
| N9 | En tema oscuro el texto queda negro y no se lee | 1 |

**Decisiones asumidas (confírmalas con el usuario solo si algo no encaja):**

- **N8:** hoy hay dos temas claros: `ocean` ("Océano Profundo", el predeterminado, identidad azul marino que coincide con el logo y el PDF) y `light` ("Google Clean"). **Se conserva `ocean`, renombrado en la interfaz como "Claro"**, y se elimina `light`. Las preferencias guardadas con `light` se migran a `ocean`.
- **N3/N6:** la búsqueda y los filtros se resuelven **en el servidor** (los datos están paginados). La caja de búsqueda de cada tabla sugiere registros mientras se escribe; elegir una sugerencia abre la página de detalle del registro; pulsar Enter filtra la tabla.
- **N7:** se crean **páginas de detalle de solo lectura** (`GET /<entidad>/:id`) para comprador, lote, especie y tipo. Para compra, el detalle es la factura (`/compras/:id/factura`).
- **N1:** "ver captura" es el botón con icono de recibo ("Ver factura") en la columna Acciones de `/compras`.

---

## 3. Fases

Orden recomendado: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Cada fase termina con pruebas pasando y un commit.

### Fase 1 — Un solo tema claro y tema oscuro legible (N8, N9)

**Archivos:** `middleware/preferencias.js`, `views/plantillas/header.ejs`, `views/configuracion/index.ejs`, `helpers/cookies.js`, `public/css/lonja.css`, `public/js/lonja-app.js`, `public/js/lonja-graficas.js`, modelo/migración de preferencias si aplica.

1. En `middleware/preferencias.js`, `VALORES_PREF.tema` queda `["ocean", "dark"]`. Al resolver la preferencia, si llega `light` (cookie o cuenta), convertirla a `ocean`. Al guardar la cuenta, persistir el valor ya convertido.
2. En `views/configuracion/index.ejs` deja dos opciones: "Claro" (`ocean`) y "Oscuro" (`dark`). Actualiza el texto de `helpers/cookies.js` (cookie `lonja_theme`: "Tema visual elegido (Claro u Oscuro)").
3. En `lonja.css` elimina el bloque `[data-theme="light"]`.
4. En `header.ejs`, línea 2, añade `data-bs-theme="<%= pref.tema === 'dark' ? 'dark' : 'light' %>"` al `<html>`. Esto hace que Bootstrap use su paleta oscura para tablas, tarjetas, menús y formularios.
5. En `[data-theme="dark"]` de `lonja.css` define también las variables de Bootstrap para que coincidan con la paleta propia: `--bs-body-bg`, `--bs-body-color`, `--bs-emphasis-color`, `--bs-secondary-color`, `--bs-tertiary-bg`, `--bs-border-color`, `--bs-table-color`, `--bs-table-bg`, `--bs-table-striped-color`, `--bs-table-hover-color`, `--bs-card-bg`, `--bs-dropdown-bg`, `--bs-dropdown-link-color`, `--bs-heading-color`, `--bs-link-color`.
6. Busca colores fijos que rompen el modo oscuro: `grep -n "#[0-9A-Fa-f]\{3,6\}" public/css/lonja.css` y en vistas `grep -rn "text-dark\|bg-light\|bg-white\|table-light\|color:#\|color: #" views`. Sustitúyelos por variables (`var(--lonja-text)`, `var(--lonja-surface)`…) o clases que respeten el tema (`text-body`, `bg-body-tertiary`). Los *badges* `bg-warning text-dark` pueden quedarse (texto oscuro sobre amarillo es legible en ambos temas).
7. **Excepción:** la hoja de factura (`.hoja-carta` y descendientes, ~línea 407 en adelante) se mantiene siempre blanca con texto oscuro, como el PDF. Asegúrate de que la regla fuerce `color` y `background` propios para que `data-bs-theme="dark"` no la afecte.
8. `lonja-graficas.js` ya redibuja al cambiar `data-theme`; verifica que ejes, cuadrícula y leyendas usen colores legibles en oscuro (léelos de las variables CSS con `getComputedStyle`).
9. Si `aplicarPreferencia('tema', …)` cambia el tema sin recargar, que actualice también `data-bs-theme`.

**Aceptación:**
- En Configuración solo aparecen "Claro" y "Oscuro".
- En oscuro, todo texto es legible en: inicio, las 6 tablas, formularios, menús desplegables del header, configuración (todas las pestañas), reportes (acordeón y tablas), banner de cookies, login. Contraste mínimo 4.5:1 en texto normal.
- La factura web se ve igual en ambos temas.
- Prueba nueva: guardar `tema=light` por `POST /configuracion/guardar-rapido` responde 400 o se normaliza a `ocean`; una cuenta con preferencia `light` renderiza `data-theme="ocean"`.

**Commit:** `style(temas): un solo tema claro y tema oscuro legible con la paleta de Bootstrap`

---

### Fase 2 — Listados uniformes: paginación numerada, orden en servidor y estilo del selector (N2, N4, N5, tarea 13)

Objetivo: un único mecanismo reutilizable para las seis tablas (compras, lotes, especies, compradores, tipos, usuarios).

**Archivos nuevos:**
- `helpers/listado.js` — lee y valida `req.query`, arma la consulta y devuelve el modelo de vista.
- `views/plantillas/paginacion.ejs` — barra inferior (filas por página, "Mostrando X–Y de Z", paginador).
- `views/plantillas/encabezado-orden.ejs` (o una función helper) — `<th>` con enlace que alterna asc/desc.

**Diseño de `helpers/listado.js`:**

```js
// Uso en un controlador:
const l = leerListado(req, {
  porPagina: [10, 25, 50, 100], tamDefecto: 25,
  orden: { fecha: ..., total: ..., comprador: ... }, // clave pública -> expresión de orden Sequelize
  ordenDefecto: { campo: "fecha", dir: "desc" },
});
// l = { pagina, tam, campo, dir, q, filtros, urlCon(cambios) }
```

- `campo` debe estar en la lista blanca `orden`; si no, usar el predeterminado. `dir` solo `asc|desc`.
- `urlCon(cambios)` devuelve la URL actual con los parámetros cambiados, conservando búsqueda, filtros, orden y tamaño. Cambiar orden, filtros o tamaño reinicia `pagina=1`.
- **Consulta en dos pasos** (necesario porque `Lote → Especie` es 1—N y `limit` con `include` de 1—N rompe el conteo y el orden en Sequelize):
  1. Obtener `count` y la lista de ids de la página con solo los `include` 1—1 necesarios para ordenar o filtrar (`findAndCountAll({ attributes: [pk], include, where, order, limit, offset, distinct: true, col: pk })`).
  2. Cargar los registros completos con `where: { pk: ids }` y todos los `include`, y reordenarlos en JS según el orden de `ids`.
- Siempre añadir la PK como desempate del orden (como ya hace Compras: `["fecha","DESC"],["id_cmp","DESC"]`).

**Paginador (N5)** — `paginacion.ejs`:
- Botones: `«` (primera), `‹` (anterior), números desde `pagina-2` hasta `pagina+2` (limitados a 1…paginas), `›` (siguiente), `»` (última). La página actual con `active` y `aria-current="page"`. Botones deshabilitados en los extremos. Si hay huecos con los extremos, mostrar `…` (opcional).
- Cada botón con `aria-label` ("Primera página", "Página anterior", "Página 7", …).
- Selector "Filas por página": que cambie al seleccionar (`onchange` → `form.submit()`), sin botón "Aplicar"; mantener un `<noscript>` con botón.
- En móvil la barra se apila (flex-wrap) sin encimarse.

**Corrección del selector (N2):** en `lonja.css` limita el estilo genérico para no pisar a Bootstrap:
```css
.form-select { padding-right: 2.25rem; }            /* espacio para la flecha */
.form-select-sm { padding: .25rem 2rem .25rem .6rem; font-size: .85rem; border-radius: 8px; }
.form-control-sm { padding: .25rem .6rem; font-size: .85rem; }
```
(colócalas **después** del bloque `.form-control, .form-select`).

**Orden en el servidor (tarea 13):**
- Los `<th>` ordenables pasan a ser enlaces (`urlCon({ orden: clave, dir })`) con `aria-sort` e indicador ▲/▼.
- Marca estas tablas con `data-orden-servidor` y en `lonja-app.js` haz que `inicializarTablasOrdenables` **ignore** las tablas con ese atributo. El ordenamiento en el cliente se conserva para tablas pequeñas no paginadas (acordeón de reportes).

**Columnas ordenables por tabla:**

| Tabla | Columnas (clave → campo) | Orden por defecto |
|---|---|---|
| Compras | fecha, lote (`id_cmp`), comprador (`comprador.apellido_paterno`, `nombre`), kilos (`lote.kilos`), precio (`precio_kilo_final`), total (`precio_total`) | fecha desc |
| Lotes | id, fecha, kilos, cajas, precio salida, estado (vendido/disponible) | id desc |
| Especies | id, nombre, tipo (`tipo.nombre`), lote (`id_lte`) | id desc |
| Compradores | código, nombre (apellidos+nombre), correo, número de compras | código desc |
| Tipos | id, nombre, número de especies | nombre asc |
| Usuarios | id, usuario, nombre, rol, estado | id asc |

Para "número de compras", "número de especies" y "estado" usa subconsultas con `sequelize.literal` (envuelve el alias con `db.getQueryInterface().quoteIdentifier` o escribe SQL compatible con MariaDB y SQLite).

**Otros detalles de esta fase:**
- Añadir `aria-label` a los enlaces de editar de lotes, especies, compradores y tipos (auditoría, tarea 14).
- Fila vacía uniforme: "No hay registros que coincidan" cuando hay búsqueda/filtros; mensaje actual cuando la tabla está vacía.

**Aceptación:**
- Las seis tablas muestran la misma barra inferior y el mismo paginador.
- Con 120 compras y 25 por página: en la página 1 se ven `« ‹ 1 2 3 › »`; en la página 3, `« ‹ 1 2 3 4 5 › »`; en la 5, `« ‹ 3 4 5 › »` (`«` y `‹` habilitados, `›` y `»` deshabilitados).
- Ordenar por Total en Compras ordena **todo** el registro (la página 1 descendente tiene los mayores totales globales).
- Cambiar filas por página conserva el orden y vuelve a la página 1.
- `?pagina=999`, `?tam=7`, `?orden=DROP` no rompen nada (se normalizan).
- El selector no se encima en escritorio ni en 375 px.
- Pruebas nuevas en `test/listados.test.js`: crea 30 compras con totales conocidos y comprueba página, orden y normalización de parámetros para compras y al menos otra entidad.

**Commit(s):** `feat(listados): paginacion numerada y orden en servidor en todas las tablas` y `fix(estilos): selector de filas sin encimarse`.

---

### Fase 3 — Buscador con sugerencias (N3)

**Archivos:** `routes/busqueda_router.js` (nuevo), `controllers/busquedaController.js` (nuevo), `app.js` (montaje con `rutaProteger`), `views/plantillas/barra-listado.ejs` (nuevo), `public/js/lonja-app.js`, `public/css/lonja.css`.

1. **Endpoint** `GET /buscar/sugerencias?entidad=<compras|lotes|especies|compradores|tipos|usuarios>&q=<texto>` → JSON `[{ id, titulo, subtitulo, url }]`, máximo 8.
   - `q` de 2 a 60 caracteres; si no, `[]`.
   - Escapa `%`, `_` y `\` antes de armar el `LIKE` (`Op.like` con `escape`); nunca concatenes texto del usuario en SQL.
   - `usuarios` solo para admin (devuelve 403 a otros roles).
   - Campos de búsqueda:
     - compras: id, nombre/apellidos del comprador, nombres de especies del lote. Título "Compra #id · comprador", subtítulo "fecha · total".
     - lotes: id, nombres de especies. Subtítulo "kilos · disponible/vendido".
     - especies: nombre, tipo. Subtítulo "Tipo · Lote #".
     - compradores: nombre completo, correo. Subtítulo correo.
     - tipos: nombre.
     - usuarios: usuario, nombre_completo, correo.
   - `url` apunta a la página de detalle (Fase 5). Mientras la Fase 5 no exista, usa la página de edición y cámbiala en la Fase 5.
2. **Barra de listado** `barra-listado.ejs` (arriba de cada tabla): `<form method="GET">` con `<input type="search" name="q">`, conserva `orden`, `dir`, `tam` como campos ocultos. Enter = filtrar la tabla (el controlador aplica el mismo `where` que el endpoint, vía una función compartida `condicionBusqueda(entidad, q)` en `helpers/busqueda.js`).
3. **Sugerencias en el cliente** (`inicializarBuscadores` en `lonja-app.js`):
   - Debounce de 250 ms; cancelar la petición anterior con `AbortController`.
   - Lista desplegable bajo el campo con patrón ARIA *combobox*: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; lista con `role="listbox"` y opciones `role="option"`.
   - Teclado: ↑/↓ mueve, Enter abre la sugerencia activa (o envía el formulario si no hay activa), Esc cierra. Clic fuera cierra.
   - Resaltar con `<mark>` la parte que coincide (construye el DOM con `textContent`, nunca `innerHTML` con datos).
   - Estados: "Buscando…", "Sin coincidencias".
4. Un botón "×" limpia la búsqueda y recarga sin `q`.

**Aceptación:**
- Escribir "huach" en Especies sugiere "Huachinango"; Enter filtra la tabla; elegir la sugerencia abre su página.
- `q=%` o `q=_` no devuelve todo el registro (se buscan literalmente).
- Un usuario no admin recibe 403 en `entidad=usuarios`.
- Pruebas en `test/busqueda.test.js`: sugerencias por entidad, escape de comodines, permiso de usuarios, filtrado del listado con `q`.

**Commit:** `feat(busqueda): buscador con sugerencias en todas las tablas`

---

### Fase 4 — Filtros de búsqueda (N6)

**Archivos:** `helpers/listado.js` (filtros validados), controladores de cada entidad, `views/plantillas/barra-listado.ejs`, vistas `index.ejs`.

1. Junto al buscador, un botón "Filtros" (icono `funnel`) que despliega un panel (`collapse` de Bootstrap) con los filtros de la entidad. Botones "Aplicar" y "Limpiar".
2. Mostrar los filtros activos como *chips* bajo la barra, cada uno con "×" para quitarlo (enlace con `urlCon({ filtro: null })`). Un contador en el botón ("Filtros · 2").
3. Todos los valores se validan en el servidor (fechas `AAAA-MM-DD`, números ≥ 0, ids enteros existentes, valores de lista blanca). Valores inválidos se ignoran.
4. Filtros por entidad:

| Entidad | Filtros |
|---|---|
| Compras | fecha desde / hasta; comprador (select); tipo de especie (select); total mínimo / máximo |
| Lotes | estado (todos / disponibles / vendidos); fecha desde / hasta; tipo de especie; kilos mínimo / máximo |
| Especies | tipo; estado del lote (disponible / vendido) |
| Compradores | con compras / sin compras; con correo / sin correo |
| Tipos | (solo búsqueda) |
| Usuarios | rol; activo / inactivo; correo verificado / sin verificar |

5. Las fechas se interpretan en la zona horaria de la app (`APP_TZ`); reutiliza `helpers/fechas.js` (`rangoDelAnio` sirve de modelo para armar rangos de día completos).

**Aceptación:**
- Filtros + búsqueda + orden + paginación se combinan y se conservan al navegar entre páginas.
- Compras con "desde 2026-11-01" no incluye compras del 31 de octubre a las 23:30 hora de México.
- Pruebas: al menos un filtro por entidad y la combinación búsqueda + filtro + orden.

**Commit:** `feat(filtros): filtros de busqueda por entidad con chips de filtros activos`

---

### Fase 5 — Páginas de detalle y registros vinculados (N7)

**Archivos:** routers y controladores de comprador, lote, especie, tipo; vistas nuevas `views/<entidad>/detalle.ejs`; vistas `index.ejs` de todas las tablas; `views/compras/factura.ejs`; `views/reportes/anual.ejs`; `views/inicio.ejs`.

1. Rutas `GET /compradores/:id`, `/lotes/:id`, `/especies/:id`, `/tipos/:id` (protegidas por `rutaProteger`, mismos permisos que la lista). Declara `/:id` **después** de `/crear` en cada router para que "crear" no se tome como id. Si el id no existe → redirigir a la lista con `?error=No se encontró el registro`.
2. Contenido de cada detalle (solo lectura, con botones Editar y Eliminar según rol, y enlace "Volver a la lista"):
   - **Comprador:** datos de contacto; indicadores (número de compras, kilos comprados, total gastado, última compra); tabla de sus compras (fecha, lote, especies, total) con enlaces.
   - **Lote:** datos del lote; estado (disponible con botón "Vender" / vendido con enlace a la factura y al comprador); tabla de especies del lote.
   - **Especie:** datos, imagen si existe, tipo (enlace), lote (enlace), estado del lote.
   - **Tipo:** nombre; tabla de especies de ese tipo (enlaces a especie y lote).
3. Enlaces cruzados (clase CSS común `enlace-registro`, subrayado al pasar el mouse, foco visible):
   - Compras: lote → `/lotes/:id`; cada especie → `/especies/:id`; comprador → `/compradores/:id`.
   - Lotes: especies → especie; si vendido, "Vendido a <comprador>" → comprador y "#compra" → factura.
   - Especies: tipo → tipo; lote → lote.
   - Compradores: número de compras → detalle del comprador.
   - Tipos: número de especies → detalle del tipo.
   - Factura web: nombre del comprador → comprador; lote → lote.
   - Reporte anual y "últimas compras" de inicio: comprador y lote enlazados.
4. Actualizar las `url` del endpoint de sugerencias (Fase 3) para que apunten a estos detalles.

**Aceptación:**
- Desde cualquier tabla se llega con un clic al comprador, lote, especie o tipo relacionado, y desde ahí de vuelta.
- `/compradores/crear` sigue mostrando el formulario.
- Pruebas: cada detalle responde 200 con datos esperados; id inexistente redirige; enlaces presentes en el HTML de la lista de compras.

**Commit:** `feat(detalle): paginas de detalle y enlaces entre registros relacionados`

---

### Fase 6 — Factura en ventana superpuesta (N1)

**Archivos:** `controllers/compraController.js` (`verFactura`), `views/compras/factura.ejs` → extraer la hoja a `views/compras/_hoja-factura.ejs`, `views/compras/index.ejs`, `views/plantillas/footer.ejs` o una plantilla de modal, `public/js/lonja-app.js`, `public/css/lonja.css`.

1. Extraer el `<div class="hoja-visor">…</div>` y la barra de acciones a parciales reutilizables. `factura.ejs` sigue funcionando igual como página completa (enlaces directos y "abrir en pestaña nueva" deben seguir sirviendo).
2. `GET /compras/:id/factura?parcial=1` (o cabecera `Accept: text/html` + `X-Requested-With: fetch`) renderiza **solo** el parcial, sin header ni footer.
3. En `/compras`, el botón "Ver factura" mantiene su `href` (funciona sin JS y con clic central/Ctrl+clic), pero con JS hace `preventDefault`, pide el parcial con `fetch` y lo muestra en un **modal de Bootstrap** (`modal-xl`, `modal-dialog-scrollable`, en móvil `modal-fullscreen-sm-down`). Sin recargar la página.
4. Encabezado del modal: título "Factura <folio>", acciones **Descargar PDF**, **Compartir**, **Enviar por correo** (solo si el comprador tiene correo; confirma con `data-confirmar`), **Imprimir**, **Abrir en página** y **Cerrar** (×, tecla Esc, clic en el fondo).
5. Tras insertar el HTML, reinicializa lo que dependa del DOM: `ajustarHojas()` (escala la hoja al ancho del modal) y la delegación de `data-compartir`/`data-confirmar` (si ya es por delegación en `document`, no hace falta).
6. **Imprimir desde el modal:** al imprimir solo debe salir la hoja. Añade una clase al `<body>` mientras el modal está abierto (p. ej. `imprimiendo-modal`) y en `@media print` oculta todo excepto `.modal .hoja-carta`; reutiliza las reglas de impresión existentes (`@page letter`).
7. Accesibilidad: el foco entra al modal al abrir y vuelve al botón que lo abrió al cerrar (Bootstrap lo maneja si usas su API). Estado de carga ("Cargando factura…") y de error con botón "Abrir en página".
8. Cachear en memoria el HTML ya cargado por id durante la visita para reabrir al instante.

**Aceptación:**
- Clic en "Ver factura" muestra la factura encima de la tabla; la URL y la posición de desplazamiento no cambian; cerrar regresa a la tabla tal cual (página, orden, filtros).
- Imprimir desde el modal produce una sola hoja carta igual a la de la página de factura.
- La hoja se ve blanca también en tema oscuro.
- Pruebas: `GET /compras/:id/factura?parcial=1` responde 200 sin `<nav` ni `<footer`; la página completa sigue respondiendo 200.

**Commit:** `feat(compras): factura en ventana superpuesta sin recargar la pagina`

---

### Fase 7 — Pendientes de la auditoría

1. **Login** (`views/login/login.ejs`): placeholder de contraseña "Tu contraseña" en lugar de `••••••••`.
2. **Atrás tras cerrar sesión** (`public/js/lonja-app.js`):
   ```js
   window.addEventListener("pageshow", (e) => {
     if (e.persisted && document.body.dataset.protegida === "1") location.reload();
   });
   ```
   y en el `<body>` de `header.ejs` añade `data-protegida="<%= usuario ? 1 : 0 %>"`. Probar manualmente el flujo descrito en la tarea 19.
3. **Paginación de Lotes**: queda cubierta en la Fase 2; marcar el TODO.
4. **Imagen de inicio (tarea 3):** preguntar al usuario qué imagen era si sigue sin verse.

**Commit:** `fix(sesion): recargar paginas protegidas restauradas desde la cache de retroceso; placeholder del login`

---

### Fase 8 — Verificación final y documentación

1. `npm test` completo pasando (ver 0.4).
2. Recorrido manual con el usuario logueado, en tema claro y oscuro, escritorio y 375 px:
   - `/`, `/inicio`, las seis tablas (búsqueda, sugerencias, filtros, orden, paginación, enlaces), cuatro páginas de detalle, `/compras` → modal de factura (descargar, imprimir, cerrar), `/compras/:id/factura` lado a lado con el PDF, `/reportes/diario`, `/configuracion` (todas las pestañas).
   - Consola del navegador sin errores.
3. Documentar en `doc/reports/05-listados-busqueda-detalle-temas.md` (qué cambió, rutas nuevas, parámetros de listado `pagina`, `tam`, `orden`, `dir`, `q`, filtros) y actualizar `doc/03-rutas-y-permisos.md` (versionado) y `doc/reports/TODO.md`.
4. Informe final al usuario: commits, pruebas, lo verificado visualmente y lo que no.

**Commit:** `docs: listados, busqueda, filtros, detalle y temas`

---

## 4. Riesgos y cómo evitarlos

| Riesgo | Mitigación |
|---|---|
| `limit` + `include` 1—N en Sequelize devuelve menos filas o falla al ordenar por columnas incluidas | Consulta en dos pasos (Fase 2) |
| SQL distinto entre MariaDB (producción) y SQLite (pruebas) | Usa operadores de Sequelize; en `literal` usa SQL estándar y pruébalo en ambos si puedes |
| Inyección vía `orden`/`dir`/filtros | Listas blancas; nunca interpolar `req.query` en SQL |
| XSS en sugerencias o modal | `textContent` en el cliente; el parcial de factura pasa por EJS con `<%= %>` (escapado) |
| `data-bs-theme="dark"` vuelve oscura la hoja de factura | Regla explícita de colores en `.hoja-carta` (Fase 1, paso 7) |
| Romper enlaces existentes (`/compras/:id/factura`, `/reportes/diario`) | No cambiar esas URLs; el modal es una mejora progresiva |
| Commit accidental de `scripts/demo.js` | `git add` siempre con rutas explícitas, nunca `git add -A` |
