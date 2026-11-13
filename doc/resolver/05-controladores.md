# 05 — Controladores

El controlador recibe una petición ya encaminada por un router. Aquí se validan reglas de negocio, se consultan modelos, se llama a los ayudantes y se elige una vista o respuesta JSON. No debería contener marcado HTML.

## Controladores de personal y acceso

| Archivo | Qué hace |
|---|---|
| `controllers/loginController.js` | Login, tablero, cerrar sesión y flujos de verificación/recuperación |
| `controllers/registroController.js` | Validar y crear una cuenta de comprador |
| `controllers/configuracionController.js` | Preferencias, datos de cuenta, cambio de correo, correo de prueba y avisos |
| `controllers/usuarioController.js` | Crear, editar, activar/desactivar y listar cuentas de personal |
| `controllers/tipoController.js` | CRUD de tipos de producto |
| `controllers/compradorController.js` | CRUD, ficha y enlace con cuenta de cliente |
| `controllers/loteController.js` | CRUD de lotes, disponibilidad y validación de ventas |
| `controllers/especieController.js` | Especies asociadas a lote |
| `controllers/catalogoController.js` | Fichas del catálogo maestro |
| `controllers/compraController.js` | Ventas de mostrador, cambios permitidos y facturas |
| `controllers/reporteController.js` | Datos y descargas de reportes |
| `controllers/busquedaController.js` | Sugerencias JSON dentro del área operativa |

## Controladores de tienda y cuenta

| Archivo | Qué hace |
|---|---|
| `controllers/tiendaController.js` | Lista lotes públicos y prepara vistas públicas; nunca incluye datos de compradores |
| `controllers/carritoController.js` | Mantiene el carrito del comprador autenticado |
| `controllers/pedidoController.js` | Calcula checkout, crea reserva, simula pago, factura y muestra historial propio |
| `controllers/pedidoAdminController.js` | Busca pedidos, filtra, pagina y avanza estados del personal |
| `controllers/socialController.js` | Listas privadas, favoritos, preguntas, opiniones y moderación |
| `controllers/cuentaController.js` | Resumen y cambios de datos personales del comprador |
| `controllers/direccionController.js` | CRUD de direcciones propias, límite y dirección principal |

## Una regla práctica para modificar

Si la regla necesita leer o cambiar datos, usa modelos; si se comparte entre varios controladores, considera un ayudante. Si depende del rol, colócala también en router/middleware. Acompaña el cambio con una prueba de solicitud HTTP.
