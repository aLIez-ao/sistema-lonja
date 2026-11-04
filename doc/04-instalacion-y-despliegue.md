# Instalación y despliegue

## Requisitos
- Node.js **20 o superior** (probado con 22)
- MariaDB **10.6 o superior**

## Pasos

```bash
# 1. Crear la base de datos
mysql -u root -p -e "CREATE DATABASE lonja_veracruz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Dependencias
npm install

# 3. Configuración
cp .env.example .env     # edita BD_CLAVE, SC_JWT y ADMIN_PASSWORD

# 4. Arrancar
npm run server           # desarrollo (nodemon)   |   npm start  (producción)
```

Abre <http://localhost:2800> e ingresa con `ADMIN_USER` / `ADMIN_PASSWORD`.
Al primer arranque se crean las tablas, el administrador y los tipos Pescado, Marisco y Molusco.

Datos de ejemplo (opcional, después del primer arranque): `npm run demo`.

## Variables de entorno (`.env`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| BD_NOMBRE / BD_USUARIO / BD_CLAVE | `lonja_veracruz` / `root` / `1234` | Credenciales de MariaDB |
| BD_DIALEC | `mariadb` | Dialecto de Sequelize |
| BD_HOST / BD_PORT | `127.0.0.1` / `3306` | Servidor de BD |
| BD_TIMEZONE | `-06:00` | Desfase que usa Sequelize para las fechas |
| BD_SYNC | `safe` | `safe` crea tablas faltantes · `alter` ajusta columnas · `force` **borra todo** |
| PORT | `2800` | Puerto HTTP |
| APP_TZ | `America/Mexico_City` | Zona para calcular "hoy" y mostrar horas |
| SC_JWT | cadena larga aleatoria | Firma de los tokens. **Obligatoria**; sin ella la app no arranca |
| JWT_DURACION | `8h` | Duración de la sesión |
| ADMIN_USER / ADMIN_PASSWORD | | Administrador inicial (solo se crea si no existe) |
| NODE_ENV | `production` | Activa la cookie `secure` (solo HTTPS) |

Generar un `SC_JWT` aleatorio: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Producción
1. `NODE_ENV=production`, `SC_JWT` largo y propio, `ADMIN_PASSWORD` fuerte (cámbiala tras el primer ingreso).
2. Poner un proxy con **HTTPS** delante (nginx, Caddy…). La cookie `secure` solo viaja por HTTPS.
3. Usuario de MariaDB con permisos solo sobre su esquema (no `root`).
4. Respaldos periódicos de la base de datos.
5. Para cambios de esquema futuros conviene usar migraciones en lugar de `alter` (ver [TODO.md](TODO.md)).
