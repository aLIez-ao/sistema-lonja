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

Datos de ejemplo (opcional, después del primer arranque): `npm run demo`. La carga es repetible. Para eliminar los registros que el script marcó como propios y regenerarlos, ejecuta `npm run demo -- --limpio --confirmar`; se niega en producción.

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
| GMAIL_USER / GMAIL_PASS | `cuenta@gmail.com` / contraseña de aplicación | Envío de verificación, recuperación y avisos. Sin ellas el correo entra en **modo simulador** |
| APP_URL | `http://localhost:2800` | URL pública para armar los enlaces de los correos (sin diagonal final) |
| ENVIO_COSTO | `150` | Cargo base de envío a domicilio |
| ENVIO_GRATIS_DESDE | `2500` | Total del carrito a partir del cual el envío cuesta cero |
| RESERVA_MINUTOS | `15` | Duración de la reserva mientras se confirma el pago |
| NODE_ENV | `production` | Activa la cookie `secure` (solo HTTPS) |

Generar un `SC_JWT` aleatorio: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Correo (Gmail)

1. En la cuenta de Google activa la **verificación en 2 pasos**.
2. Crea una **contraseña de aplicación** de 16 caracteres (Seguridad → Contraseñas de aplicaciones).
3. Colócala en `GMAIL_PASS` (puedes escribirla con o sin espacios) y tu dirección en `GMAIL_USER`.
4. Define `APP_URL` con la dirección desde la que abrirás la aplicación; si no, se usa la del navegador
   que hizo la solicitud. Con esto los enlaces de verificación y recuperación funcionan también desde el celular.
5. Reinicia el servidor. La consola y la pestaña **Configuración → Correo** indican si el envío está
   configurado; desde ahí puedes mandar un **correo de prueba** a tu propia cuenta.

Si Gmail rechaza las credenciales, el mensaje para el usuario es genérico ("No pudimos enviar el correo")
y el detalle técnico aparece solo en la pestaña Correo del administrador.

En **modo simulador** (sin `GMAIL_USER`/`GMAIL_PASS`), los correos se imprimen en la consola. En desarrollo,
el enlace de verificación también se muestra en pantalla para no bloquear las pruebas; en producción nunca
se muestra.

Los enlaces de verificación vencen en 24 horas y solo sirve el más reciente: al pedir uno nuevo se anulan los
anteriores. Hay un enfriamiento de 60 segundos entre envíos y un máximo de 5 por hora y cuenta.

El pago es **simulado** y no se conecta a un adquirente bancario. En desarrollo acepta la tarjeta de prueba `4242 4242 4242 4242`; nunca guarda tarjeta completa ni CVV. Configura `ENVIO_*` y `RESERVA_MINUTOS` en `.env` para personalizar la operación; las plantillas seguras están en `.env.example`.

## Verificación en MariaDB

Ejecuta esta revisión únicamente con una **copia desechable** de la base, nunca con la base activa. Usa un esquema aislado y un usuario con permisos limitados. Conserva las credenciales en `.env` local (no las pegues en comandos compartidos ni en el repositorio).

1. Crea el esquema de prueba y restaura una copia reciente sin datos sensibles. Configura en `.env` `BD_DIALEC=mariadb`, `BD_HOST`, `BD_PORT`, `BD_NOMBRE`, `BD_USUARIO`, `BD_CLAVE` y `BD_SYNC=safe` para ese esquema aislado.
2. Arranca la aplicación (`npm start`), confirma que `asegurarEsquema()` termina sin error, detén el servidor y vuelve a arrancarlo. El segundo inicio debe completar sin cambiar ni duplicar columnas/tablas.
3. Con dos sesiones de comprador de prueba, agrega el mismo lote disponible a ambos carritos. La primera sesión crea el pedido; la segunda debe recibir el aviso de que el lote ya está reservado. Cuando expire o se cancele la primera reserva, comprueba que el segundo comprador pueda reservarlo y completar un pago simulado.
4. Intenta completar el primer pedido después de la nueva compra y verifica que no se cree una segunda fila `Compra` para el lote (índice `uq_compra_lote`). No uses datos ni tarjetas reales.
5. Descarta el esquema desechable al terminar. Registra versión de MariaDB, resultado de ambos arranques y de los escenarios de reserva/pago en el informe de verificación.

La suite `npm test` cubre estas reglas con SQLite, pero la ejecución observada en este entorno no pudo validar MariaDB: el cliente está instalado, pero no hay servicio escuchando en `127.0.0.1:3306`.

## Producción
1. `NODE_ENV=production`, `SC_JWT` largo y propio, `ADMIN_PASSWORD` fuerte (cámbiala tras el primer ingreso).
2. Poner un proxy con **HTTPS** delante (nginx, Caddy…). La cookie `secure` solo viaja por HTTPS.
3. Usuario de MariaDB con permisos solo sobre su esquema (no `root`).
4. Respaldos periódicos de la base de datos.
5. Para cambios de esquema futuros conviene usar migraciones en lugar de `alter` (ver [TODO.md](TODO.md)).
