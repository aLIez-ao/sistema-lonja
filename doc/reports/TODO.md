# TODO

## Preguntas abiertas para el cliente / profesor
Decisiones que se tomaron con un supuesto razonable; confirmar o corregir:

1. **Llave de `compra`.** El diagrama muestra `id_cmp` y `codigo_cpr` como FK en la llave y la relación con `lote` como 1 a 1. Se implementó llave compuesta + índice único en `id_cmp` (un lote → un comprador). ¿Se permiten **ventas parciales** de un lote a varios compradores?
2. **"Ventas" vs "compras".** El requerimiento 1 dice "ventas" y el resto "compras". Se trató como lo mismo: la compra que hace un comprador de un lote.
3. **Precio final vs. precio de salida.** No se exige que `precio_kilo_final` sea ≥ `precio_kilo_salida` (en una subasta normalmente lo es). ¿Debe validarse?
4. **Roles.** Se supuso `admin` y `capturista`. ¿Los compradores también deben entrar al sistema (ver solo sus compras)?
5. **Imágenes de especie.** `imagen` (VARCHAR 100) guarda una ruta o URL como texto; **no hay subida de archivos**. ¿Se requiere subir fotos?
6. **Reporte diario.** ¿Debe filtrarse por comprador o rango de fechas? ¿Formato PDF? Hoy: pantalla, impresión del navegador y CSV.
7. **Confirmación por correo.** Los PDF de ejemplo registran usuarios con correo de confirmación (nodemailer + Gmail). Aquí solo el admin crea cuentas, para "limitar el acceso al personal autorizado". ¿Se exige el flujo del ejemplo?
8. **Zona horaria.** Se asumió Ciudad de México (UTC-6, sin horario de verano).

## Preguntas del proyecto
1. genera una cookis de secion?
2. tiene verificacion de correo?

## Pendiente técnico
- [ ] Revisar visualmente los flujos principales en escritorio y móvil después del rediseño (login, compras, lotes y reporte diario).
- [ ] Comprobar contraste, foco de teclado y navegación móvil con datos reales.
- [ ] Verificar que la impresión del reporte diario conserve una jerarquía clara.
- [ ] Probar contra MariaDB real y ajustar si hay diferencias.
- [ ] Límite de intentos de login (`express-rate-limit`).
- [ ] Token CSRF propio y cabeceras con `helmet`.
- [ ] Recuperación de contraseña y cambio de contraseña por el propio usuario.
- [ ] Paginación en listas (compras, lotes) cuando crezcan.
- [ ] Migraciones (Sequelize CLI / umzug) en lugar de `sync`.
- [ ] Bitácora de auditoría (quién registró/modificó/eliminó cada compra).
- [ ] Subida de imágenes de especies (multer) si se confirma el punto 5.
- [ ] Reporte en PDF y por rango de fechas.
- [ ] Dockerfile / docker-compose con MariaDB.
- [ ] Prueba en dispositivos móviles.
