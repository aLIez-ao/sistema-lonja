# Sistema Lonja

Sistema de información para la **Lonja de Veracruz**: el personal registra lotes, compradores y ventas; los compradores pueden explorar la tienda, reservar lotes, pagar en el simulador y consultar sus pedidos.

Proyecto de **Web 2** (FES Aragón, UNAM) · Entrega: **12 de noviembre de 2026**.

| Requerimiento | Cómo se cubre |
|---|---|
| 1. Registro y almacenamiento de compras diarias | Lotes, especies, tipos, compradores y compras, con validación en servidor. El total lo calcula el servidor (kilos × precio final por kilo). |
| 2. Control de acceso | Sesión JWT en cookie `httpOnly`. Roles **admin**, **capturista** y **comprador** con rutas aisladas. |
| 3. Operación en línea | Carrito, reserva temporal, checkout, pago simulado, facturas e historial; listas, preguntas respondidas y opiniones con compra verificada. |
| 4. Reportes | `/reportes/diario`: compras por periodo enlazadas a su factura, CSV y reporte oficial en PDF. |

Esquema relacional: `tipo`, `especie`, `catalogo_especie`, `lote`, `compra`, `comprador`, `usuario`, `direccion_entrega`, `carrito_item`, `pedido`, `pedido_item` y tablas de comunidad. Ver [base de datos](doc/02-base-de-datos.md).

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

Datos de ejemplo: `npm run demo` (idempotente) · para reemplazar solo registros marcados como demo: `npm run demo -- --limpio --confirmar`. Pruebas: `npm test` (SQLite en memoria).

## Uso básico
1. **Compradores** → registrar a quien compra. **Tipos** → catálogo (Pescado, Marisco…).
2. **Lotes → Nuevo lote** (kilos, cajas, precio de salida) → agregar sus **especies**.
3. En la lista de lotes, **Vender** → elegir comprador y precio final por kilo. El total se calcula solo.
4. **Reportes** → elegir año, revisar el tablero y las compras de cada mes, descargar CSV o el reporte oficial en PDF.
5. **Tienda** → visita `/`, crea y verifica una cuenta de comprador, guarda lotes en Favoritos, agrega al carrito y paga de forma simulada con tarjeta o SPEI. Para recoger en persona también puede reservarse el pago en efectivo/terminal.

El personal entra al panel operativo desde `/dashboard`; `/inicio` conserva una redirección permanente para enlaces antiguos. El logo lleva a la tienda pública en `/` y el menú del panel permite alternar entre ambos espacios.

En `/usuarios`, el administrador consulta por separado trabajadores y clientes. Para configurar Gmail en el archivo local `.env`, ejecuta `npm run correo:configurar` en una terminal; la contraseña de aplicación se solicita de forma oculta.

## Estructura
```
index.js · app.js · config/ · models/ · controllers/ · routes/ · middleware/ · helpers/
views/ · public/ · scripts/ · test/ · doc/ · reports/
```

## Documentación
- [Guía del código](docs/README.md): guía numerada por archivo, capas y recorridos para lectores técnicos y no técnicos.
- [Documentación operativa](doc/README.md): arquitectura, base de datos, rutas y permisos, instalación, seguridad y pruebas.
- [reports/](reports/README.md): qué se hizo y el flujo de desarrollo.

## Estado y advertencias
- 145 pruebas automáticas pasan sobre SQLite; **la migración y los flujos no se verificaron contra MariaDB real**.
- Los PDF de ejemplo usan credenciales de práctica (`root/1234`): cámbialas en cualquier uso real.

## Empaquetado zip
```bash
# Linux
zip -r sistema-lonja.zip . -x "node_modules/*" ".env"
# Win
Get-ChildItem -Path . -Exclude "node_modules", ".env" | Compress-Archive -DestinationPath "sistema-lonja.zip" -Force
```
