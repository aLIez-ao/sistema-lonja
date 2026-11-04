# Pruebas

```bash
npm test
```

Usan `node:test` y **SQLite en memoria**: levantan la aplicación real en un puerto libre y recorren los flujos por HTTP (sin mocks). No necesitan MariaDB.

## Qué cubren (13 pruebas)

1. Sin sesión, las rutas privadas redirigen a `/`.
2. Login: credenciales vacías o malas → 401; correctas → cookie `HttpOnly` + `SameSite=Strict`.
3. Un token falso se rechaza.
4. El admin crea un capturista; este entra pero recibe 403 en `/usuarios` y al intentar borrar.
5. Flujo completo de captura: comprador (con correo duplicado), lote, especie y compra; validaciones; total calculado (120.50 × 60.25 = 7 260.13); un lote no se compra dos veces.
6. Un lote comprado no se edita; no se borra un comprador con compras.
7. Editar una compra recalcula el total.
8. Reporte diario: detalle, totales, día sin compras, CSV y fecha inválida.
9. Escape de HTML (XSS).
10. Un usuario desactivado pierde el acceso aunque tenga token vigente.
11. El admin no puede desactivarse ni borrarse; 404 amigable.
12. Todas las pantallas del administrador responden 200.
13. Cerrar sesión.

## Qué NO se probó

- **No se ejecutó contra MariaDB real** (el entorno de desarrollo no la tenía). Sí se comprobó que Sequelize genera las sentencias `CREATE TABLE` de MariaDB con los tipos, llaves y restricciones del diagrama (ver [base-de-datos.md](base-de-datos.md)). Antes de entregar, conviene correr la aplicación una vez contra MariaDB y `npm run demo`.
- Diferencias SQLite/MariaDB posibles: comparación de mayúsculas en `usuario` y `correo` (MariaDB no distingue por defecto) y la zona horaria de las fechas.
- No hay pruebas de carga, de navegadores ni de accesibilidad.
- La vista se revisó con capturas en Chromium (login, lotes, reporte) en pantalla de escritorio; no en móvil.
