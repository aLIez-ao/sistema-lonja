import { body } from "express-validator";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { Usuario } from "../models/index.js";
import { estadisticasInicio } from "../helpers/estadisticas.js";
import { JWTGenera, opcionesCookieSesion } from "../helpers/tokens.js";
import { mensajesError, aMensaje } from "../helpers/utiles.js";
import { enviarEmailPasswordCambiada } from "../helpers/email.js";
import { crearLimite, hashToken, problemasPassword } from "../helpers/seguridad.js";
import { enviarEnlacePassword } from "../helpers/cuentas.js";
import { vincularComprador } from "../helpers/comprador.js";
import { destinoTrasEntrar, inicioSegun, rutaVolver } from "../helpers/navegacion.js";

const reglasLogin = [
  body("usuario").trim().notEmpty().withMessage("El usuario no debe estar vacío"),
  body("password").notEmpty().withMessage("La contraseña no debe estar vacía"),
];

const HASH_FALSO = bcrypt.hashSync("no-existe", 10);

// 5 intentos fallidos por usuario+IP bloquean 15 minutos; 5 solicitudes de recuperación por IP cada hora
export const limiteLogin = crearLimite({ max: 5, ventanaMs: 15 * 60 * 1000 });
export const limiteRecuperacion = crearLimite({ max: 5, ventanaMs: 60 * 60 * 1000 });

const vistaLogin = (res, errores = [], usuario = "", mensaje = null, estado, volver = "") =>
  res.status(estado ?? (errores.length ? 401 : 200)).render("login/login", { errores, usuario, mensaje, volver });

const login = (req, res) => {
  // Con sesión vigente no tiene sentido mostrar el formulario
  if (req.usuario) return res.redirect(destinoTrasEntrar(req.usuario, req.query.volver));
  vistaLogin(res, [], "", req.query.mensaje, undefined, rutaVolver(req.query.volver) || "");
};

const credenciales = async (req, res) => {
  const errs = mensajesError(req);
  if (errs.length) return vistaLogin(res, errs, req.body.usuario, null, undefined, req.body.volver);

  const { usuario, password } = req.body;
  const clave = `${req.ip}|${String(usuario).toLowerCase()}`;
  if (limiteLogin.bloqueado(clave)) {
    return vistaLogin(res, [`Demasiados intentos fallidos. Intenta de nuevo en ${limiteLogin.minutosRestantes(clave)} min o recupera tu contraseña.`], usuario, null, 429, req.body.volver);
  }

  // Se acepta el nombre de usuario o el correo electrónico
  const us = await Usuario.findOne({
    where: { [Op.or]: [{ usuario }, { correo: String(usuario).trim().toLowerCase() }, { correo: String(usuario).trim() }] },
  });
  const coincide = await bcrypt.compare(password, us ? us.password : HASH_FALSO);

  if (!us || !coincide || !us.activo) {
    limiteLogin.fallo(clave);
    return vistaLogin(res, ["Revisa las credenciales"], usuario, null, undefined, req.body.volver);
  }

  limiteLogin.limpiar(clave);
  return res.cookie("_token", JWTGenera(us), opcionesCookieSesion()).redirect(destinoTrasEntrar(us, req.body.volver));
};

const principal = async (req, res) => {
  res.render("inicio", await estadisticasInicio());
};

const cerrarsesion = (req, res) => {
  res.clearCookie("_token", opcionesCookieSesion());
  res.set({ "Cache-Control": "no-store, no-cache, must-revalidate, private", Pragma: "no-cache", Expires: "0" });
  res.redirect("/");
};

// --- Recuperación de contraseña ---
const AVISO_RECUPERACION = "Si los datos coinciden con una cuenta activa con correo registrado, en unos minutos recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.";

const verOlvidePassword = (req, res) => {
  res.render("login/olvide-password", { mensaje: null, error: null });
};

/** Acepta correo o nombre de usuario. La respuesta es la misma exista o no la cuenta. */
const enviarRecuperacionPassword = async (req, res) => {
  const identificador = String(req.body.identificador ?? req.body.correo ?? "").trim();
  if (!identificador) return res.status(400).render("login/olvide-password", { mensaje: null, error: "Escribe tu correo o tu nombre de usuario." });

  if (limiteRecuperacion.bloqueado(req.ip)) {
    return res.status(429).render("login/olvide-password", { mensaje: null, error: "Demasiadas solicitudes desde este equipo. Intenta de nuevo más tarde." });
  }
  limiteRecuperacion.fallo(req.ip);

  const us = await Usuario.findOne({ where: { [Op.or]: [{ correo: identificador.toLowerCase() }, { correo: identificador }, { usuario: identificador }] } });
  if (us && us.activo && us.correo) {
    try { await enviarEnlacePassword(req, us, "recuperacion"); } catch (e) { console.error("No se pudo enviar la recuperación:", e.message); }
  }
  res.render("login/olvide-password", { mensaje: AVISO_RECUPERACION, error: null });
};

/** Busca al usuario dueño de un enlace vigente (en la BD solo está el hash del token). */
const usuarioDeEnlace = (token) =>
  Usuario.findOne({ where: { token_recuperacion: hashToken(token), token_recuperacion_expira: { [Op.gt]: new Date() }, activo: true } });

const ENLACE_INVALIDO = { codigo: 400, mensaje: "El enlace no es válido, ya se usó o caducó. Solicita uno nuevo desde \"¿Olvidaste tu contraseña?\"." };

const verRestablecerPassword = async (req, res) => {
  const us = await usuarioDeEnlace(req.params.token);
  if (!us) return res.status(400).render("error", ENLACE_INVALIDO);
  res.render("login/recuperar-password", { token: req.params.token, cuenta: us, errores: [] });
};

const restablecerPassword = async (req, res) => {
  const { token } = req.params;
  const { password, password_confirmar } = req.body;
  const us = await usuarioDeEnlace(token);
  if (!us) return res.status(400).render("error", ENLACE_INVALIDO);

  const errores = problemasPassword(password, { usuario: us.usuario });
  if (password !== password_confirmar) errores.push("Las contraseñas no coinciden");
  if (errores.length) return res.status(400).render("login/recuperar-password", { token, cuenta: us, errores });

  us.password = password; // el modelo la cifra e invalida las sesiones abiertas
  us.token_recuperacion = null;
  us.token_recuperacion_expira = null;
  us.email_verificado = true; // el enlace llegó a su correo: queda comprobado que es suyo
  await us.save();
  enviarEmailPasswordCambiada({ usuario: us, correo: us.correo }).catch(() => {});

  res.clearCookie("_token", opcionesCookieSesion());
  res.redirect(`/acceso?${aMensaje("Tu contraseña quedó guardada. Ya puedes iniciar sesión.")}`);
};

const verificarEmailToken = async (req, res) => {
  const hash = hashToken(req.params.token);
  const us = await Usuario.findOne({ where: { token_verificacion: hash } });

  if (!us) {
    return res.status(400).render("error", {
      codigo: 400,
      mensaje: "El enlace de verificación no existe o ya se usó. Si pediste un enlace nuevo, el más reciente reemplaza a todos los anteriores.",
      accion: req.usuario && req.usuario.correo && !req.usuario.email_verificado
        ? { texto: "Enviar un enlace nuevo", url: "/configuracion#pane-cuenta", metodo: "enlace" }
        : null,
    });
  }
  if (new Date(us.token_verificacion_expira) <= new Date()) {
    return res.status(400).render("error", {
      codigo: 400,
      mensaje: "El enlace de verificación caducó (vence a las 24 horas). Solicita uno nuevo para continuar.",
      accion: req.usuario && req.usuario.id === us.id
        ? { texto: "Enviar un enlace nuevo", url: "/configuracion/solicitar-verificacion", metodo: "form" }
        : null,
    });
  }

  us.email_verificado = true;
  us.token_verificacion = null;
  us.token_verificacion_expira = null;
  await us.save();

  // El comprador hereda el historial del mostrador solo ahora que demostró el correo.
  if (us.rol === "comprador" && !us.codigo_cpr) {
    try {
      await vincularComprador(us);
    } catch (error) {
      if (error.code !== "COMPRADOR_YA_VINCULADO") throw error;
      console.warn(`No se vinculó el comprador de la cuenta ${us.id}: el registro de cliente ya pertenece a otra cuenta.`);
      return res.redirect(`/acceso?${aMensaje("Tu correo quedó verificado, pero el cliente con ese correo ya está vinculado a otra cuenta. Pide al personal de la lonja que reconcilie las cuentas antes de comprar.")}`);
    }
  }

  if (req.usuario) {
    return res.redirect(`${inicioSegun(req.usuario)}?${aMensaje("Correo verificado correctamente")}`);
  }
  res.redirect(`/acceso?${aMensaje("Tu correo quedó verificado. Ya puedes iniciar sesión.")}`);
};

export {
  reglasLogin,
  login,
  credenciales,
  principal,
  cerrarsesion,
  verOlvidePassword,
  enviarRecuperacionPassword,
  verRestablecerPassword,
  restablecerPassword,
  verificarEmailToken,
};
