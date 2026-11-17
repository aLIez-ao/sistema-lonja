import { registro } from './compartido/ayudantes/registro.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import './compartido/config/entorno.js';
import { usuarioDesdeToken } from './middleware/protegerRutas.js';
import { middlewarePreferencias } from './middleware/preferencias.js';
import { montarModulos } from './modulos/index.js';
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

montarModulos(app);

app.use((req, res) => res.status(404).render('error', { codigo: 404, mensaje: 'Página no encontrada.' }));

// Manejador central de errores
app.use((err, req, res, next) => {
  registro.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render('error', { codigo: 500, mensaje: 'Error interno del servidor.' });
});

export default app;
