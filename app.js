import { registro } from './compartido/ayudantes/registro.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import './compartido/config/entorno.js';
import rutaProteger, { permitir, usuarioDesdeToken } from './middleware/protegerRutas.js';
import { middlewarePreferencias } from './middleware/preferencias.js';
import {
  rutasLogin as router_login,
  rutasRegistro as router_registro,
  rutasUsuarios as router_usuario,
  rutasConfiguracion as router_configuracion,
  rutasAvisos as router_avisos,
} from './modulos/cuentas/index.js';
import {
  rutasTipos as router_tipo,
  rutasCatalogo as router_catalogo,
  rutasEspecies as router_especie,
  rutasLotes as router_lote,
} from './modulos/catalogo/index.js';
import {
  rutasCompradores as router_comprador,
  rutasCompras as router_compra,
  rutasReportes as router_reporte,
} from './modulos/ventas/index.js';
import router_busqueda from './routes/busqueda_router.js';
import router_cuenta from './routes/cuenta_router.js';
import router_tienda from './routes/tienda_router.js';
import router_carrito from './routes/carrito_router.js';
import { router as router_pedido, rutasAdmin as router_pedido_admin } from './modulos/pedidos/index.js';
import * as social from './controllers/socialController.js';
import { formatoFechaHora } from './compartido/ayudantes/fechas.js';
import { icono } from './compartido/ayudantes/iconos.js';
import { CarritoItem, Lista, ListaItem } from './models/index.js';
import { origenDePeticionValido } from './compartido/ayudantes/navegacion.js';
import db from './compartido/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  next();
});

// 400 kb: los formularios de usuario pueden llevar la foto de perfil (ya reducida) como data URL
app.use(express.urlencoded({ extended: true, limit: '400kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Bootstrap local
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
// Chart.js local (gráficas de inicio y reportes)
app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));
app.use('/uploads', express.static(process.env.UPLOADS_DIR || path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
// Los navegadores piden /favicon.ico por su cuenta
app.get('/favicon.ico', (req, res) => res.redirect(301, '/img/favicon.svg'));

// Identificación pasiva de usuario para navbar si tiene sesión
app.use(async (req, res, next) => {
  res.locals.fechaHora = formatoFechaHora;
  res.locals.icono = icono;
  res.locals.rutaActual = req.path;
  res.locals.qTienda = String(req.query.q ?? '').slice(0, 60);
  res.locals.usuario = null;
  res.locals.carritoCount = 0;
  res.locals.favoritosCount = 0;
  res.locals.favoritos = { lote: new Set(), especie: new Set() };
  req.usuario = null;
  if (req.path === '/tienda/sugerencias' || /\.(?:pdf|json)$/i.test(req.path)) return next();

  const usuario = await usuarioDesdeToken(req.cookies._token);
  if (usuario) {
    req.usuario = usuario;
    res.locals.usuario = usuario;
    if (usuario.rol === 'comprador') {
      const [carritoCount, lista] = await Promise.all([
        CarritoItem.count({ where: { id_usuario: usuario.id } }),
        Lista.findOne({
          where: { id_usuario: usuario.id, nombre: 'Favoritos' },
          include: [{ model: ListaItem, as: 'items', attributes: ['tipo', 'id_ref'] }],
        }),
      ]);
      res.locals.carritoCount = carritoCount;
      if (lista) {
        const items = lista.items || [];
        for (const item of items) res.locals.favoritos[item.tipo].add(String(item.id_ref));
        res.locals.favoritosCount = items.length;
      }
    }
  }
  next();
});

// Middleware de Preferencias y Cookies
app.use(middlewarePreferencias);

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || origenDePeticionValido(req)) return next();
  if (req.accepts(['html', 'json']) === 'json')
    return res.status(403).json({ ok: false, mensaje: 'Origen de la solicitud no permitido.' });
  return res.status(403).render('error', {
    codigo: 403,
    mensaje: 'No se pudo validar el origen de esta solicitud. Vuelve a cargar la página e inténtalo de nuevo.',
    accion: { texto: 'Volver', url: '/' },
  });
});

// Endpoint de disponibilidad para el gestor de procesos; no devuelve detalles de conexión.
app.get('/salud', async (_req, res) => {
  try {
    await db.authenticate();
    return res.status(200).json({ bd: 'ok' });
  } catch {
    return res.status(503).json({ bd: 'error' });
  }
});

// Rutas públicas: tienda, acceso, recuperación y registro de compradores
app.use('/', router_login);
app.use('/registro', router_registro);
// La portada (GET /) y las páginas /tienda/* son públicas.
app.use('/', router_tienda);
app.use('/avisos', router_avisos);

// Solo personal de la lonja (admin y capturista): pantallas de administración
const soloPersonal = [rutaProteger, permitir('admin', 'capturista')];
app.use('/tipos', soloPersonal, router_tipo);
app.use('/compradores', soloPersonal, router_comprador);
app.use('/lotes', soloPersonal, router_lote);
app.use('/especies', soloPersonal, router_especie);
app.use('/catalogo', soloPersonal, router_catalogo);
app.use('/compras', soloPersonal, router_compra);
app.use('/pedidos', soloPersonal, router_pedido_admin);
app.use('/reportes', soloPersonal, router_reporte);
app.use('/buscar', soloPersonal, router_busqueda);
app.get('/preguntas', ...soloPersonal, social.moderarPreguntas);
app.post('/preguntas/:id', ...soloPersonal, social.responderPregunta);
app.get('/opiniones', ...soloPersonal, social.moderarOpiniones);
app.post('/opiniones/:id', ...soloPersonal, social.cambiarVisibilidadOpinion);

// Cuenta de comprador: solo el rol comprador, siempre filtrado por su id
app.use('/cuenta', rutaProteger, permitir('comprador'), router_cuenta);

// Carrito y ciclo de compra: exclusivos para cuentas de comprador.
app.use('/carrito', rutaProteger, permitir('comprador'), router_carrito);
app.use('/pedido', rutaProteger, permitir('comprador'), router_pedido);

// Configuración: todos los roles (las pestañas de administración se ocultan)
app.use('/configuracion', rutaProteger, router_configuracion);

// Solo administrador
app.use('/usuarios', rutaProteger, permitir('admin'), router_usuario);

app.use((req, res) => res.status(404).render('error', { codigo: 404, mensaje: 'Página no encontrada.' }));

// Manejador central de errores
app.use((err, req, res, next) => {
  registro.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render('error', { codigo: 500, mensaje: 'Error interno del servidor.' });
});

export default app;
