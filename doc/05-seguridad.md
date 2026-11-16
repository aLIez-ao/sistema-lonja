# Seguridad

## Implementado

| Riesgo | Medida |
|---|---|
| Contraseñas expuestas | bcrypt (10 rondas); la contraseña nunca se guarda ni se devuelve en texto plano |
| Acceso no autorizado | Todas las rutas privadas exigen JWT válido; cuenta inactiva o borrada = sin acceso inmediato |
| Escalada de privilegios | `permitir("admin")` en `/usuarios` y en todos los `DELETE`; el servidor decide por el rol guardado en BD, no por lo que diga el cliente |
| Robo de cookie por JavaScript | Cookie `httpOnly` |
| CSRF / origen cruzado | Cookie `SameSite=Strict`; las peticiones con efectos validan `Origin` o `Referer` contra el host de confianza (configurado con `APP_URL` detrás de proxy) |
| Cookie por HTTP | `secure` activada con `NODE_ENV=production` |
| Enumeración de usuarios | Mismo mensaje ("Revisa las credenciales") y tiempo de respuesta parecido para usuario inexistente, clave mala o cuenta inactiva |
| XSS | EJS escapa con `<%= %>`; hay prueba automática |
| Inyección SQL | Sequelize usa consultas parametrizadas; no hay SQL armado con texto del usuario |
| Datos inválidos / manipulados | Validación en servidor (express-validator) y restricciones en BD; el total de la compra se calcula en el servidor |
| Revelar tecnología | `x-powered-by` desactivado; errores internos no muestran el detalle al usuario |
| Secreto sin configurar | La app no arranca sin `SC_JWT` |
| Datos de compradores expuestos | Carrito, pedidos, listas, direcciones y preguntas personales se consultan con el ID de sesión; recurso ajeno responde 404 |
| Lote tomado por dos compradores | Reserva con vencimiento y revalidación al pagar; índice único de venta por lote |
| Datos de tarjeta persistidos | Pasarela de desarrollo simulada; solo referencia y últimos cuatro dígitos se guardan. SPEI es una simulación (la CLABE mostrada es ficticia); el efectivo solo se confirma desde el panel del personal |
| Reservas de pago en efectivo | Disponibles solo al recoger; vencen según `RESERVA_EFECTIVO_MINUTOS` (120 por defecto, máximo 24 h) y hay un máximo de tres pedidos pendientes por comprador |
| Favoritos entre compradores | Listas y rutas JSON siempre buscan la lista con `id_usuario` de la sesión; un identificador ajeno responde 404 |
| Opinión sin experiencia de compra | El servidor verifica la compra del catálogo por el comprador autenticado |
| Identidad del autor de opiniones públicas | Se muestra únicamente el nombre abreviado; el panel privado filtra opiniones por la sesión |
| Reintentos de pago rechazado | Al quinto rechazo de un mismo pedido, se cancela y se liberan sus reservas; un pago aprobado limpia el contador en memoria |
| Contenido público malicioso | Preguntas, respuestas y opiniones se imprimen escapadas mediante EJS `<%= %>` |
| Correo falso/indisponible | Nuevas direcciones requieren verificación; preguntas y cambios de estado usan el transporte de correo configurado |

## Límites conocidos

- Los límites de registro (5/h por IP), login (5/15 min por IP y 20/15 min por cuenta), recuperación (5/h por IP), verificación (5/h por cuenta), preguntas (5/h por cuenta) y sugerencias de tienda (30/min por IP) se guardan en memoria. Se reinician al reiniciar Node y no se comparten entre instancias; despliega una sola instancia de Node para que los límites sean efectivos.
- No se emite un token CSRF. Como mitigación, las peticiones con efectos validan `Origin`/`Referer` y la cookie usa `SameSite=Strict`; esta defensa depende de que el origen de confianza esté bien configurado.
- El JWT no se puede revocar antes de vencer, pero la consulta a BD en cada petición cubre desactivación y borrado de cuentas.
- No existe bitácora de auditoría para cambios administrativos.
- Se envían cabeceras de seguridad, incluida una CSP con `default-src 'self'`, `script-src 'self'` y `frame-ancestors 'none'`. `style-src` conserva `'unsafe-inline'` por los estilos dinámicos existentes.
- El límite por cuenta puede bloquear temporalmente al dueño después de 20 fallos en 15 minutos; recuperar la contraseña limpia ese bloqueo.
- Los ejemplos del curso muestran credenciales de prueba (`root/1234`, `FESAdministrador4`); **no usarlas** en un ambiente real.
