import express from "express";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import rutaProteger, { permitir } from "./middleware/protegerRutas.js";
import { middlewarePreferencias } from "./middleware/preferencias.js";
import router_login from "./routes/login_router.js";
import router_tipo from "./routes/tipo_router.js";
import router_comprador from "./routes/comprador_router.js";
import router_lote from "./routes/lote_router.js";
import router_especie from "./routes/especie_router.js";
import router_compra from "./routes/compra_router.js";
import router_reporte from "./routes/reporte_router.js";
import router_usuario from "./routes/usuario_router.js";
import router_configuracion from "./routes/configuracion_router.js";
import { dinero, formatoFechaHora } from "./helpers/fechas.js";
import { Usuario } from "./models/index.js";
import { JWTVerifica } from "./helpers/tokens.js";

dotenv.config({ path: ".env" });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Bootstrap local
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));
app.use(express.static(path.join(__dirname, "public")));

// Identificación pasiva de usuario para navbar si tiene sesión
app.use(async (req, res, next) => {
  res.locals.dinero = dinero;
  res.locals.fechaHora = formatoFechaHora;
  res.locals.usuario = null;
  req.usuario = null;

  const { _token } = req.cookies;
  if (_token) {
    try {
      const decoded = JWTVerifica(_token);
      const us = await Usuario.scope("sinClave").findByPk(decoded.id);
      if (us && us.activo) {
        req.usuario = us;
        res.locals.usuario = us;
      }
    } catch {
      // Token inválido o expirado
    }
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
app.use("/compras", rutaProteger, router_compra);
app.use("/reportes", rutaProteger, router_reporte);
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
