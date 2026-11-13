import express from "express";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import rutaProteger, { permitir, usuarioDesdeToken } from "./middleware/protegerRutas.js";
import { middlewarePreferencias } from "./middleware/preferencias.js";
import router_login from "./routes/login_router.js";
import router_tipo from "./routes/tipo_router.js";
import router_comprador from "./routes/comprador_router.js";
import router_lote from "./routes/lote_router.js";
import router_especie from "./routes/especie_router.js";
import router_catalogo from "./routes/catalogo_router.js";
import router_compra from "./routes/compra_router.js";
import router_reporte from "./routes/reporte_router.js";
import router_usuario from "./routes/usuario_router.js";
import router_configuracion from "./routes/configuracion_router.js";
import router_busqueda from "./routes/busqueda_router.js";
import router_registro from "./routes/registro_router.js";
import router_cuenta from "./routes/cuenta_router.js";
import router_tienda from "./routes/tienda_router.js";
import router_carrito from "./routes/carrito_router.js";
import router_pedido from "./routes/pedido_router.js";
import router_pedido_admin from "./routes/pedido_admin_router.js";
import * as social from "./controllers/socialController.js";
import { dinero, formatoFechaHora } from "./helpers/fechas.js";
import { icono } from "./helpers/iconos.js";
import { CarritoItem } from "./models/index.js";

dotenv.config({ path: ".env" });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable("x-powered-by");

// 400 kb: los formularios de usuario pueden llevar la foto de perfil (ya reducida) como data URL
app.use(express.urlencoded({ extended: true, limit: "400kb" }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Bootstrap local
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));
// Chart.js local (gráficas de inicio y reportes)
app.use("/vendor/chartjs", express.static(path.join(__dirname, "node_modules/chart.js/dist")));
app.use(express.static(path.join(__dirname, "public")));
// Los navegadores piden /favicon.ico por su cuenta
app.get("/favicon.ico", (req, res) => res.redirect(301, "/img/favicon.svg"));

// Identificación pasiva de usuario para navbar si tiene sesión
app.use(async (req, res, next) => {
  res.locals.dinero = dinero;
  res.locals.fechaHora = formatoFechaHora;
  res.locals.icono = icono;
  res.locals.rutaActual = req.path;
  res.locals.qTienda = String(req.query.q ?? "").slice(0, 60);
  res.locals.usuario = null;
  res.locals.carritoCount = 0;
  req.usuario = null;

  const usuario = await usuarioDesdeToken(req.cookies._token);
  if (usuario) {
    req.usuario = usuario;
    res.locals.usuario = usuario;
    if (usuario.rol === "comprador") {
      res.locals.carritoCount = await CarritoItem.count({ where: { id_usuario: usuario.id } });
    }
  }
  next();
});

// Middleware de Preferencias y Cookies
app.use(middlewarePreferencias);

// Rutas públicas: tienda, acceso, recuperación y registro de compradores
app.use("/", router_login);
app.use("/registro", router_registro);
// La portada (GET /) y las páginas /tienda/* son públicas.
app.use("/", router_tienda);

// Solo personal de la lonja (admin y capturista): pantallas de administración
const soloPersonal = [rutaProteger, permitir("admin", "capturista")];
app.use("/tipos", soloPersonal, router_tipo);
app.use("/compradores", soloPersonal, router_comprador);
app.use("/lotes", soloPersonal, router_lote);
app.use("/especies", soloPersonal, router_especie);
app.use("/catalogo", soloPersonal, router_catalogo);
app.use("/compras", soloPersonal, router_compra);
app.use("/pedidos", soloPersonal, router_pedido_admin);
app.use("/reportes", soloPersonal, router_reporte);
app.use("/buscar", soloPersonal, router_busqueda);
app.get("/preguntas", ...soloPersonal, social.moderarPreguntas);
app.post("/preguntas/:id", ...soloPersonal, social.responderPregunta);
app.get("/opiniones", ...soloPersonal, social.moderarOpiniones);
app.post("/opiniones/:id", ...soloPersonal, social.cambiarVisibilidadOpinion);

// Cuenta de comprador: solo el rol comprador, siempre filtrado por su id
app.use("/cuenta", rutaProteger, permitir("comprador"), router_cuenta);

// Carrito y ciclo de compra: exclusivos para cuentas de comprador.
app.use("/carrito", rutaProteger, permitir("comprador"), router_carrito);
app.use("/pedido", rutaProteger, permitir("comprador"), router_pedido);

// Configuración: todos los roles (las pestañas de administración se ocultan)
app.use("/configuracion", rutaProteger, router_configuracion);

// Solo administrador
app.use("/usuarios", rutaProteger, permitir("admin"), router_usuario);

app.use((req, res) => res.status(404).render("error", { codigo: 404, mensaje: "Página no encontrada." }));

// Manejador central de errores
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render("error", { codigo: 500, mensaje: "Error interno del servidor." });
});

export default app;
