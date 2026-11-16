# Plan 10 — Documentación, ramas y entrega v1

## Estado de ejecución (16 de noviembre de 2026)

Ejecutado localmente sobre `main` (`2dd677c`). La rama `entrega/v1` y la etiqueta anotada `v1.0.0` apuntan a `092cbde`. La verificación de esa entrega pasó 149/149 pruebas con `npm install`; `npm ci` no era posible porque ese commit no contiene `package-lock.json`. `doc/entregas/v1/` es una junction local que muestra directamente `doc/` desde el worktree de esa rama; no duplica documentos ni planes. Los avances se registran en commits locales y no se hace push.

Se omitió DOC-13: depende de GIT-01 del plan 09, que el dueño pidió saltar. No se modificó `.gitignore`; `doc/entregas/v1/` y los diagramas se excluyen mediante `.git/info/exclude` local.

Fecha: 16 de noviembre de 2026 · Revisado contra `main` en `2dd677c` (74 commits sin push) y
`origin/main` en `092cbde` (12 nov 2026, 96 commits).

Este plan cubre seis encargos del dueño:

1. Actualizar los `TODO.md` y unificarlos en `doc/.reports/`.
2. Actualizar los documentos de `doc/` y `doc/resolver/`, sin duplicidad entre ellos.
3. Renombrar `resolver/` o fusionarlo con el resto, según convenga.
4. Eliminar las ramas que no son `main`.
5. Crear una rama de entrega v1 a partir de `origin/main`.
6. Guardar la documentación que corresponde a ese mismo commit.

No toca código de la aplicación. Convenciones: esfuerzo S/M/L; las decisiones que necesitan
respuesta del dueño van marcadas como **D-n** y se resuelven antes del paso que las usa.

## Situación de partida

| Tema | Estado actual |
|---|---|
| `TODO.md` | Dos archivos que no coinciden: `doc/TODO.md` (13 nov, «131 pruebas», 53 líneas) y `doc/.reports/TODO.md` (21 líneas). Varios puntos ya están resueltos en el código (p. ej. «Estado actualizado.», listado de usuarios con `helpers/listado.js`, cabeceras/CSP, origen en lugar de token CSRF). |
| `doc/` raíz | 6 documentos de referencia (`01`–`06`), 2 informes (`07-informe-plan-04`, `08-informe-plan-05`) mezclados con ellos, `README.md` y `TODO.md`. `06-pruebas.md` dice «145 pruebas»; hoy son 181. Ninguno menciona `servicios/`, `config/entorno.js`, `helpers/registro.js`, la tabla `migracion` con `up`/`down`, ESLint/Prettier ni los módulos ES de `public/js/`. |
| `doc/resolver/` | Guía del código, 12 capítulos + **dos índices** (`README.md` y `README-docs-raiz.md`). Los 10 capítulos duplicados ya se borraron localmente (aparecen como `D`, sin commit). |
| Duplicidad `doc/` ↔ `resolver/` | `01-arquitectura` ↔ `resolver/02-arranque-y-peticion`; `02-base-de-datos` ↔ `resolver/03-modelos-y-datos`; `03-rutas-y-permisos` ↔ `resolver/04-rutas-y-permisos`; `06-pruebas` ↔ `resolver/09-pruebas-y-demo`. |
| Ramas | `claude/code-audit-action-plan-ef5a0c` y `claude/cool-kilby-f1a603`, ambas en `092cbde` (ya contenidas en `main`, sin commits propios), cada una con un worktree limpio en `.claude/worktrees/`. En el remoto solo existe `main`. |
| Git y `doc/` | `origin/main` contiene 34 archivos de `doc/` (10 en la raíz y 24 en `resolver/`). `doc/.plan/` y `doc/.reports/` nunca se versionaron. El `.gitignore` local ignora `docs/` y `resolver/`, no `doc/`. |

---

## 1. Ramas sobrantes

- [x] **RAM-01 S — Quitar los dos worktrees y sus ramas.** Ninguna tiene commits fuera de `main` y
  los worktrees no tienen cambios, así que no se pierde nada.
  ```bash
  git worktree remove .claude/worktrees/code-audit-action-plan-ef5a0c
  git worktree remove .claude/worktrees/cool-kilby-f1a603
  git branch -d claude/code-audit-action-plan-ef5a0c claude/cool-kilby-f1a603
  git worktree prune
  ```
  Se usa `-d` (no `-D`): si git dijera que alguna no está fusionada, se para y se revisa.
  **Hecho cuando:** `git branch -a` muestra solo `main` y `remotes/origin/main` (más la rama de
  entrega del paso 2).

## 2. Rama de entrega v1

**Decisiones previas**

- **D-1 — Qué commit es la v1.** La lectura literal del encargo es `origin/main` = `092cbde`
  (12 nov, antes de las auditorías 06–09). Alternativa: tomar el estado actual (`2dd677c`, con 181
  pruebas, CSP, servicios y migraciones), que es el que se presentaría hoy. **Recomendación:** v1 =
  `092cbde`, tal como se pidió; el estado actual será la base de una v2 cuando se suba.
- **D-2 — Nombre.** **Recomendación:** rama `entrega/v1` y además una etiqueta anotada `v1.0.0`
  en el mismo commit. La rama permite corregir algo puntual de la entrega; la etiqueta fija el
  punto exacto y no se mueve.
- **D-3 — ¿Se sube al remoto?** Por defecto **no**: todo queda local hasta que el dueño lo pida.
  Ojo: `092cbde` **incluye** `doc/` (34 archivos), así que subir la rama tal cual publicaría esa
  documentación. Si se quiere subir sin ella, hace falta un commit encima que la saque del
  seguimiento (`git rm -r --cached doc`), igual que GIT-01 del plan 09.

**Pasos**

- [x] **ENT-01 S — Crear la rama y la etiqueta.**
  ```bash
  git branch entrega/v1 092cbde
  git tag -a v1.0.0 092cbde -m "Entrega v1 del Sistema Lonja"
  ```
  No se cambia de rama: `main` y la copia de trabajo quedan como están.
- [x] **ENT-02 S — Comprobar la entrega.** En un worktree temporal **en `%TEMP%`** (no dentro del
  proyecto), `npm ci && npm test` sobre `entrega/v1`; anotar el número de pruebas y borrar el
  worktree al terminar.

## 3. Documentación de la v1

El encargo es «lo mismo con la documentación para ese commit». La documentación que estaba en git en
`092cbde` se recupera exacta; `doc/.plan/` y `doc/.reports/` no estaban versionadas, así que de ellas
solo hay la versión actual.

- **D-4 — Dónde consultarla.** `doc/entregas/v1/` apunta directamente a `doc/` de la rama local `entrega/v1`; el worktree está en `.claude/worktrees/entrega-v1-docs/`.

**Pasos**

- [x] **ENT-03 S — Mostrar la documentación de `092cbde`.** Crear un worktree local de `entrega/v1` y enlazar `doc/entregas/v1/` a su subcarpeta `doc/`; así la entrega no se duplica ni se modifica.
- [x] **ENT-04 S — No copiar planes ni informes locales a la entrega**, por instrucción posterior del dueño. `doc/entregas/v1/` contiene exclusivamente el `doc/` que existe en `entrega/v1`.
- [x] **ENT-05 S — Mantenerla sincronizada con la rama**, mediante junction al `doc/` del worktree `entrega/v1`; no se modifica el contenido de esa rama.

## 4. Nueva organización de `doc/`

**D-5 — Renombrar o fusionar `resolver/`.** Hay dos públicos distintos: quien **opera o evalúa** el
sistema (instalación, seguridad, rutas, base de datos) y quien **modifica el código** (qué hace cada
archivo). Fusionar todo en una sola carpeta mezclaría ambos; dejarlo como está mantiene los cuatro
temas duplicados. **Recomendación: fusión parcial + renombrar.** Los temas que se repiten se quedan
en un solo sitio (la referencia), y lo que es exclusivo de la guía pasa a `doc/guia-codigo/`.

### Estructura objetivo

```
doc/
  README.md               índice único de toda la documentación
  01-arquitectura.md      + recorrido de una petición (de resolver/02)
  02-base-de-datos.md     + descripción de modelos (de resolver/03)
  03-rutas-y-permisos.md  + mapa ruta → controlador (de resolver/04)
  04-instalacion-y-despliegue.md
  05-seguridad.md
  06-pruebas.md           + datos demo (de resolver/09)
  guia-codigo/            antes resolver/
    README.md             un solo índice (fusiona README.md y README-docs-raiz.md)
    01-que-hace-la-aplicacion.md
    02-controladores-y-servicios.md
    03-ayudantes.md
    04-plantillas.md
    05-interfaz-js-css.md
    06-recorridos.md
    07-inventario-archivos.md
    08-inventario-vistas.md
  plan/                   sin cambios (01–10)
  reports/                informes + TODO unificado (ver sección 5)
  entregas/v1/            congelada (sección 3)
  sistema-lonja.dbml, sistema-lonja.svg
```

### Pasos

- [x] **DOC-10 M — Fusionar los cuatro temas duplicados.** Para cada par, la versión de `doc/` es la
  base; se incorpora solo lo que la guía tenía de más y se borra el capítulo de la guía.
  Comprobar con una búsqueda de títulos y tablas repetidas que no queda contenido dos veces.
- [x] **DOC-11 S — Renombrar `resolver/` a `guia-codigo/`** (se dejó sin staging ni commit por la decisión de mantener documentación local).
  Se renumeraron los ocho capítulos, se unificaron los índices y se actualizaron los enlaces vigentes.
- [x] **DOC-12 S — Mover los informes.** `07-informe-plan-04.md` y `08-informe-plan-05.md` pasan a
  `doc/.reports/07-…` y `08-…`; la raíz de `doc/` queda solo con referencia (01–06).
- [—] **DOC-13 S — `.gitignore`.** Omitido: GIT-01 del plan 09 no se ejecutó y el dueño pidió saltar el plan 09.

## 5. `TODO.md` unificado en `doc/.reports/`

- [x] **TODO-01 M — Revisar los puntos contra el código.** Se conservaron los fallos reproducibles y
  verificaciones que requieren al dueño o una MariaDB real; las correcciones confirmadas se anotaron
  con commit en el TODO consolidado. El trabajo del plan 09 no se marcó como ejecutado.
- [x] **TODO-02 S — Escribir `doc/.reports/TODO.md` único** con esta forma:
  - **Abierto**, agrupado por: verificaciones manuales del dueño (MariaDB, revisión visual, correo
    real), errores conocidos, mejoras. Cada punto enlaza a su plan si lo tiene.
  - **Cerrado recientemente**, una línea por punto con el commit.
  - Fecha y línea base (`npm test` → 181) arriba.
- [x] **TODO-03 S — Borrar `doc/TODO.md`** y apuntar los enlaces vigentes al archivo unificado.

## 6. Actualizar el contenido al estado de `2dd677c`

- [x] **DOC-14 M — Referencia (`doc/01`–`06`).**
  - `01-arquitectura`: capa `servicios/`, `config/entorno.js`, `helpers/registro.js`, cola de trabajos,
    CSP y validación de origen.
  - `02-base-de-datos`: tabla `migracion`, columnas `aviso_suscripcion_descartado` y `recibir_avisos`,
    correo normalizado en minúsculas.
  - `03-rutas-y-permisos`: `POST /avisos/descartar-suscripcion` y cualquier ruta añadida desde el 12 nov.
  - `06-pruebas`: 181 pruebas, `csp-vistas.test.js`, conteo de consultas, reversión de migraciones,
    y los scripts `lint` y `format`.
- [x] **DOC-15 M — Guía del código.** Inventario con `servicios/pedidos.js`, `helpers/registro.js`,
  `config/entorno.js`, los módulos ES de `public/js/lonja-*.js`, `pedido-nuevo.js`, `pedido-pago.js`,
  `eslint.config.js` y `.prettierrc.json`; capítulo de interfaz con el reparto por módulos.
- [x] **DOC-16 S — `doc/README.md` como índice único** de referencia, guía, planes, informes, TODO
  y entregas, en ese orden.
- [x] **DOC-17 S — Revisión final de duplicidad y enlaces.** Se consolidaron arquitectura, datos,
  rutas y pruebas en sus documentos de referencia; se validaron destinos Markdown internos en la
  documentación activa.

---

## Orden y dependencias

1. **RAM-01:** no depende de nada.
2. **D-1…D-4 → ENT-01…ENT-05:** van antes de reorganizar `doc/`, para que la copia de la v1 salga
   de `092cbde` y de los archivos sin tocar.
3. **D-5 → DOC-10…DOC-13:** reorganización.
4. **TODO-01…TODO-03:** sobre la estructura nueva.
5. **DOC-14…DOC-17:** contenido actualizado y revisión final.

Esfuerzo estimado (trabajo manual de una persona, no tiempo entre commits):
- Ramas y entrega v1 (RAM-01, ENT-01…ENT-05): ≈ 1 h; son comandos de git y una copia de archivos.
- Reorganización de `doc/` (DOC-10…DOC-13): ≈ 3 h; la fusión de los cuatro temas es lo que lleva tiempo.
- TODO unificado (TODO-01…TODO-03): ≈ 2 h; hay que comprobar ~35 puntos contra el código.
- Contenido actualizado (DOC-14…DOC-17): ≈ 3–4 h.
- **Total ≈ 9–10 h.** Hecho por un agente, buena parte se reduce a minutos, pero la revisión del
  dueño de cada decisión y del resultado sigue llevando su tiempo.

## Relación con el plan 09

- **GIT-01** (sacar `doc/` de git) conviene hacerlo **antes** de DOC-11. Así el renombrado y los
  borrados no se convierten en commits de documentación que luego habría que subir.
- Nada de este plan se sube al remoto sin que el dueño lo pida (D-3, GIT-02).

## Resumen

| Bloque | Pasos | Decisiones |
|---|---:|---|
| Ramas | 1 | — |
| Entrega v1 (código) | 2 | D-1, D-2, D-3 |
| Entrega v1 (documentación) | 3 | D-4 |
| Organización de `doc/` | 4 | D-5 |
| TODO unificado | 3 | — |
| Contenido actualizado | 4 | — |
| **Total** | **17** | **5** |
