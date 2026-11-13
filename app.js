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
import { dinero, formatoFechaHora } from "./helpers/fechas.js";
import { icono } from "./helpers/iconos.js";

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
  res.locals.usuario = null;
  req.usuario = null;

  const usuario = await usuarioDesdeToken(req.cookies._token);
  if (usuario) {
    req.usuario = usuario;
    res.locals.usuario = usuario;
  }
  next();
});

// Middleware de Preferencias y Cookies
app.use(middlewarePreferencias);

// Rutas públicas: login y recuperación
app.use("/", router_login);

// Rutas protegidas: requieren sesión (JWT)
app.use("/tipos", rutaProteger, router_tipo);
app.use("/compradores", rutaProteger, router_comprador);
app.use("/lotes", rutaProteger, router_lote);
app.use("/especies", rutaProteger, router_especie);
app.use("/catalogo", rutaProteger, router_catalogo);
app.use("/compras", rutaProteger, router_compra);
app.use("/reportes", rutaProteger, router_reporte);
app.use("/configuracion", rutaProteger, router_configuracion);
app.use("/buscar", rutaProteger, router_busqueda);

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
