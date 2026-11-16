# Flujo de desarrollo

## 1. Entender el encargo
- Se leyó el PDF *Sistema Lonja*: 3 requerimientos, diagrama relacional (imagen en la pág. 2, revisada visualmente porque el texto del PDF no la incluye) y fecha de entrega.
- Se leyeron completos los 7 PDF de ejemplo para copiar sus convenciones (nombres en español, estructura de carpetas, ESM, EJS, `?_method=`, cookie `_token`).
- Se comparó *CRUD Persona* con *CRUD Persona 1*: son casi idénticos (la segunda es una copia con índice roto).

## 2. Interpretar el diagrama
- Se transcribieron las tablas, tipos y cardinalidades. Dudas detectadas (llave de `compra`, 1 a 1 con `lote`) se resolvieron con un supuesto; véase [referencia de base de datos](../02-base-de-datos.md).
- Se añadió `usuario` porque el requerimiento 2 exige autenticación y el diagrama no tiene personal del sistema.

## 3. Construcción por capas (de abajo hacia arriba)
1. **Proyecto y dependencias** (`npm i`), `.env.example`.
2. **Conexión** `config/db.js` (MariaDB; SQLite solo para pruebas).
3. **Modelos** y asociaciones (`models/`), con las acciones de borrado (`CASCADE`/`RESTRICT`) decididas por regla de negocio.
4. **Seguridad**: tokens JWT, `rutaProteger` (autenticación) y `permitir` (autorización), administrador inicial.
5. **Controladores y rutas** módulo por módulo: tipos → compradores → lotes → especies → compras → reporte → usuarios, cada uno con sus validaciones.
6. **Vistas EJS** con plantillas comunes y Bootstrap local.
7. **`app.js` / `index.js` separados** para poder probar la app sin abrir la base real.

## 4. Verificación
- **Pruebas de extremo a extremo** (`test/flujo.test.js`): se escribieron después del código y recorren el sistema por HTTP real con SQLite en memoria.
- **Arranque real** con SQLite en archivo + `npm run demo` + capturas con Chromium (login, lotes, reporte) para revisar el aspecto.
- **DDL de MariaDB:** se imprimió el `CREATE TABLE` que Sequelize genera para MariaDB y se comparó con el diagrama.
- Cálculo comprobado a mano: 120.50 kg × $60.25 = $7 260.125 → $7 260.13.

## 5. Problemas encontrados y cómo se resolvieron

| Problema | Solución |
|---|---|
| No hay MariaDB en el entorno (`apt` no la encuentra) | Soporte de SQLite solo para pruebas (`BD_DIALEC=sqlite`); se documenta que falta probar en MariaDB |
| `npm test` fallaba con `node --test test/` | Se cambió a `node --test test/*.test.js` |
| Una prueba ajena (`lonja.test.js`) fallaba | Descubrí la versión anterior del proyecto en la carpeta (ver incidente en `01-que-se-hizo.md`); se movieron sus archivos huérfanos a una carpeta de respaldo fuera del proyecto |
| Errores heredados de los ejemplos (`res.redirect(url, objeto)`, `id` repetidos en formularios, `host` dentro de `dialectOptions`, rehash de contraseña en cada update, `body-parse` inexistente) | Corregidos en el código nuevo; listados en `doc/arquitectura.md` |

## 6. Documentación
Se escribió al final, a partir del código ya probado: `doc/` (arquitectura, BD, rutas, instalación, seguridad, pruebas, TODO), este directorio `reports/` y el `README.md`.

## 7. Lección del proceso
Antes de escribir en una carpeta conviene **listar lo que ya hay**. Aquí no se hizo y se perdió trabajo previo; a partir de ese momento se revisó el contenido, se movió lo huérfano sin borrar y se avisó al usuario.
