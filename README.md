# Sistema Lonja

Sistema de información para la **Lonja de Veracruz**: registra lotes de pescado y marisco, las compras que hacen los compradores cada día, controla quién puede entrar y genera el **reporte diario de compras**.

Proyecto de **Web 2** (FES Aragón, UNAM) · Entrega: **12 de noviembre de 2026**.

| Requerimiento | Cómo se cubre |
|---|---|
| 1. Registro y almacenamiento de compras diarias | Lotes, especies, tipos, compradores y compras, con validación en servidor. El total lo calcula el servidor (kilos × precio final por kilo). |
| 2. Control de acceso | Login con contraseñas bcrypt y sesión JWT en cookie `httpOnly`. Roles **admin** y **capturista**; solo el admin gestiona usuarios y borra registros. |
| 3. Reporte diario | `/reportes/diario`: detalle, totales, resumen por comprador, CSV e impresión. |

Esquema relacional del cliente: `tipo`, `especie`, `lote`, `compra`, `comprador` (+ `usuario`). Ver [doc/base-de-datos.md](doc/base-de-datos.md).

## Stack
Node.js (ESM) · Express 5 · Sequelize + MariaDB · EJS · Bootstrap 5 (local) · JWT · bcryptjs · express-validator — el mismo de los PDF de ejemplo de la materia.

## Inicio rápido

Requisitos: **Node.js ≥ 20** y **MariaDB ≥ 10.6**.

```bash
mariadb -u root -p
CREATE DATABASE lonja_veracruz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lonja'@'localhost' IDENTIFIED BY 'Q^X3tB2';
CREATE DATABASE lonja_veracruz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON lonja_veracruz.* TO 'lonja'@'localhost';
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'lonja'@'localhost';

npm install
cp .env.example .env        # edita BD_CLAVE, SC_JWT y ADMIN_PASSWORD
npm run server              # desarrollo (nodemon)  ·  npm start para producción
```

Abre <http://localhost:2800> e ingresa con `ADMIN_USER` / `ADMIN_PASSWORD` de tu `.env`.
La primera vez se crean tablas, el administrador y los tipos Pescado/Marisco/Molusco.

Datos de ejemplo: `npm run demo` · Pruebas: `npm test` (usan SQLite en memoria).

## Uso básico
1. **Compradores** → registrar a quien compra. **Tipos** → catálogo (Pescado, Marisco…).
2. **Lotes → Nuevo lote** (kilos, cajas, precio de salida) → agregar sus **especies**.
3. En la lista de lotes, **Vender** → elegir comprador y precio final por kilo. El total se calcula solo.
4. **Reporte diario** → elegir fecha, ver totales, descargar CSV o imprimir.

## Estructura
```
index.js · app.js · config/ · models/ · controllers/ · routes/ · middleware/ · helpers/
views/ · public/ · scripts/ · test/ · doc/ · reports/
```

## Documentación
- [Guía del código](docs/README.md): explicación numerada de cada archivo, los recorridos principales y dónde empezar a hacer cambios.
- [doc/](doc/README.md): arquitectura, base de datos, rutas y permisos, instalación, seguridad, pruebas y **[TODO](doc/TODO.md)** (preguntas abiertas para el cliente).
- [reports/](reports/README.md): qué se hizo y el flujo de desarrollo.

## Estado y advertencias
- 13 pruebas automáticas pasan, pero **no se ha corrido contra MariaDB real**; hazlo una vez antes de entregar.
- Los PDF de ejemplo usan credenciales de práctica (`root/1234`): cámbialas en cualquier uso real.

## Empaquetado zip
```bash
# Linux
zip -r sistema-lonja.zip . -x "node_modules/*" ".env"
# Win
Get-ChildItem -Path . -Exclude "node_modules", ".env" | Compress-Archive -DestinationPath "sistema-lonja.zip" -Force
```
