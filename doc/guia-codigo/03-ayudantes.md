# 03 — Ayudantes

Los módulos de `helpers/` agrupan operaciones reutilizadas. Así, los controladores pueden centrarse en la solicitud y compartir reglas entre páginas, rutas y tareas automáticas.

| Grupo de archivos | Función |
|---|---|
| `fechas.js`, `mexico.js` | Zona horaria, fechas de operación y formato de moneda. |
| `tokens.js`, `seguridad.js`, `cookies.js` | Sesión, verificación de cuenta, recuperación y protección de credenciales. |
| `email.js` | Envío de mensajes con Gmail o simulador local. |
| `semillas.js`, `migraciones.js` | Datos iniciales y ajustes compatibles del esquema existente. |
| `cuentas.js`, `comprador.js`, `navegacion.js` | Asociación de cuenta comercial, destino seguro y reglas de cuenta. |
| `pedidos.js`, `tienda.js`, `lotes.js`, `pasarela.js` | Disponibilidad, reservas, importes y resultado del pago simulado. |
| `factura.js`, `facturaPdf.js`, `reportePdf.js`, `estadisticas.js`, `pdfComun.js` | Datos e informes de ventas en pantalla o PDF. |
| `busqueda.js`, `filtros.js`, `listado.js` | Búsqueda, filtros y paginación de catálogos. |
| `avatar.js`, `imagenes.js`, `iconos.js`, `i18n.js`, `utiles.js` | Archivos visuales, traducciones y utilidades comunes. |

Los nombres exactos disponibles se encuentran en `helpers/`. Antes de agregar una regla, busca si ya existe un ayudante que la resuelva. Para correo, revisa también la configuración de [instalación](../04-instalacion-y-despliegue.md).
