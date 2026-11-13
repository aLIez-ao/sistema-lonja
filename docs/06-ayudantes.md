# 06 — Ayudantes

Los archivos de `helpers/` reúnen lógica reutilizable que los controladores necesitan. No son rutas web; son herramientas para armar una fecha, revisar un token, calcular un envío o generar una factura.

| Archivo | Para qué sirve |
|---|---|
| `helpers/fechas.js` | Fechas locales, zona operativa, moneda y redondeo |
| `helpers/mexico.js` | Reglas de día y calendario para México |
| `helpers/migraciones.js` | Añade columnas compatibles y rellena relaciones de catálogo idempotentemente |
| `helpers/semillas.js` | Crea el administrador y tipos iniciales si faltan |
| `helpers/seguridad.js` | Tokens aleatorios con hash, política de contraseñas y límites por ventana |
| `helpers/tokens.js` | Creación y validación de tokens para sesión/correo |
| `helpers/cuentas.js` | Operaciones compartidas de asociación y ciclo de cuenta |
| `helpers/comprador.js` | Busca o vincula con seguridad una ficha Comprador |
| `helpers/avatar.js` | Guarda imágenes de avatar tras validar tipo y contenido |
| `helpers/imagenes.js` | Valida la firma de imágenes del catálogo y escribe archivos con nombre seguro |
| `helpers/email.js` | Transporte Gmail o simulador y plantillas de correo |
| `helpers/cookies.js` | Consentimiento de cookies y valores de preferencias |
| `helpers/i18n.js` | Textos traducidos para vistas |
| `helpers/navegacion.js` | Destino seguro por rol y URL interna de retorno |
| `helpers/utiles.js` | Mensajes y errores de validación/BD para formularios |
| `helpers/iconos.js` | Catálogo de iconos SVG permitidos |
| `helpers/busqueda.js` | Condiciones de búsqueda parametrizadas por entidad |
| `helpers/filtros.js` | Normaliza filtros permitidos para consultas |
| `helpers/listado.js` | Paginación, orden y construcción de enlaces de lista |
| `helpers/lotes.js` | Reglas reutilizadas para disponibilidad y operaciones de lote |
| `helpers/tienda.js` | Transformaciones y disponibilidad para la tienda pública |
| `helpers/pedidos.js` | Reservas activas, expiración, precio/envío y fotografía de dirección |
| `helpers/pasarela.js` | Simulación de aprobación/rechazo de tarjeta; no hace llamadas al banco |
| `helpers/factura.js` | Prepara los datos de factura a partir de Compra y Lote |
| `helpers/facturaPdf.js` | Renderiza una factura PDF |
| `helpers/pdfComun.js` | Componentes y formato PDF compartido |
| `helpers/reportePdf.js` | Informe anual en PDF |
| `helpers/estadisticas.js` | Agrega importes, lotes, pendientes y origen de ventas para el tablero |

Los ayudantes importantes se invocan desde los controladores. Por ejemplo: `pedidoController` usa `pedidos.js` para calcular y reservar y `pasarela.js` para simular un resultado; después `factura.js` prepara la venta.
