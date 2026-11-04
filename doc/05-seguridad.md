# Seguridad

## Implementado

| Riesgo | Medida |
|---|---|
| Contraseñas expuestas | bcrypt (10 rondas); la contraseña nunca se guarda ni se devuelve en texto plano |
| Acceso no autorizado | Todas las rutas privadas exigen JWT válido; cuenta inactiva o borrada = sin acceso inmediato |
| Escalada de privilegios | `permitir("admin")` en `/usuarios` y en todos los `DELETE`; el servidor decide por el rol guardado en BD, no por lo que diga el cliente |
| Robo de cookie por JavaScript | Cookie `httpOnly` |
| CSRF | Cookie `SameSite=Strict`; las acciones de cambio son POST/PUT/DELETE |
| Cookie por HTTP | `secure` activada con `NODE_ENV=production` |
| Enumeración de usuarios | Mismo mensaje ("Revisa las credenciales") y tiempo de respuesta parecido para usuario inexistente, clave mala o cuenta inactiva |
| XSS | EJS escapa con `<%= %>`; hay prueba automática |
| Inyección SQL | Sequelize usa consultas parametrizadas; no hay SQL armado con texto del usuario |
| Datos inválidos / manipulados | Validación en servidor (express-validator) y restricciones en BD; el total de la compra se calcula en el servidor |
| Revelar tecnología | `x-powered-by` desactivado; errores internos no muestran el detalle al usuario |
| Secreto sin configurar | La app no arranca sin `SC_JWT` |

## Límites conocidos (ver también [TODO.md](TODO.md))

- **Sin límite de intentos de login** (fuerza bruta). Pendiente: `express-rate-limit` o bloqueo temporal.
- **Sin token CSRF** además de `SameSite`; `csurf` está obsoleto. Para navegadores muy antiguos conviene añadir un token propio.
- El JWT no se puede revocar antes de vencer, pero la consulta a BD en cada petición cubre desactivación y borrado de cuentas.
- No hay recuperación de contraseña ni bitácora de auditoría.
- Sin cabeceras de seguridad adicionales (p. ej. `helmet`/CSP).
- Los ejemplos del curso muestran credenciales de prueba (`root/1234`, `FESAdministrador4`); **no usarlas** en un ambiente real.
