import crypto from "crypto";
import { body } from "express-validator";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { Usuario, Compra, Lote } from "../models/index.js";
import { JWTGenera } from "../helpers/tokens.js";
import { mensajesError, aMensaje } from "../helpers/utiles.js";
import { hoy, rangoDelDia } from "../helpers/fechas.js";
import { enviarEmailRecuperacion } from "../helpers/email.js";

const reglasLogin = [
  body("usuario").trim().notEmpty().withMessage("El usuario no debe estar vacío"),
  body("password").notEmpty().withMessage("La contraseña no debe estar vacía"),
];

const HASH_FALSO = bcrypt.hashSync("no-existe", 10);

const vistaLogin = (res, errores = [], usuario = "", mensaje = null) =>
  res.status(errores.length ? 401 : 200).render("login/login", { errores, usuario, mensaje });

const login = (req, res) => {
  vistaLogin(res, [], "", req.query.mensaje);
};

const credenciales = async (req, res) => {
  const errs = mensajesError(req);
  if (errs.length) return vistaLogin(res, errs, req.body.usuario);

  const { usuario, password } = req.body;
  const us = await Usuario.findOne({ where: { usuario } });
  const clave = await bcrypt.compare(password, us ? us.password : HASH_FALSO);

  if (!us || !clave || !us.activo) return vistaLogin(res, ["Revisa las credenciales"], usuario);

  const token = JWTGenera(us);
  return res
    .cookie("_token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })
    .redirect("/inicio");
};

const principal = async (req, res) => {
  const fecha = hoy();
  const { inicio, fin } = rangoDelDia(fecha);
  const compras = await Compra.findAll({ where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } } });
  const total = compras.reduce((s, c) => s + Number(c.precio_total), 0);
  const lotesLibres = (await Lote.count()) - (await Compra.count());
  res.render("inicio", { fecha, numCompras: compras.length, total, lotesLibres });
};

const cerrarsesion = (req, res) => {
  res.clearCookie("_token", { httpOnly: true, sameSite: "strict" });
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.redirect("/");
};

// --- Recuperación de contraseña olvidada ---
const verOlvidePassword = (req, res) => {
  res.render("login/olvide-password", { mensaje: req.query.mensaje, error: req.query.error });
};

const enviarRecuperacionPassword = async (req, res) => {
  const { correo } = req.body;
  if (!correo) {
    return res.render("login/olvide-password", { error: "Por favor ingresa un correo válido." });
  }

  const us = await Usuario.findOne({ where: { correo } });
  if (!us) {
    // Para prevenir enumeración de usuarios, decimos que si el correo existe se enviaron instrucciones
    return res.render("login/olvide-password", {
      mensaje: "Si el correo coincide con una cuenta activa, recibirás las instrucciones en breve.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  us.token_recuperacion = token;
  us.token_recuperacion_expira = new Date(Date.now() + 3600000); // 1 hora de validez
  await us.save();

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  await enviarEmailRecuperacion({ usuario: us, correo: us.correo, token, baseUrl });

  res.render("login/olvide-password", {
    mensaje: "Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.",
  });
};

const verRestablecerPassword = async (req, res) => {
  const { token } = req.params;
  const us = await Usuario.findOne({
    where: {
      token_recuperacion: token,
      token_recuperacion_expira: { [Op.gt]: new Date() },
    },
  });

  if (!us) {
    return res.render("error", {
      codigo: 400,
      mensaje: "El enlace de recuperación es inválido o ha caducado.",
    });
  }

  res.render("login/recuperar-password", { token, usuario: us, error: null });
};

const restablecerPassword = async (req, res) => {
  const { token } = req.params;
  const { password, password_confirmar } = req.body;

  const us = await Usuario.findOne({
    where: {
      token_recuperacion: token,
      token_recuperacion_expira: { [Op.gt]: new Date() },
    },
  });

  if (!us) {
    return res.render("error", {
      codigo: 400,
      mensaje: "El enlace de recuperación es inválido o ha caducado.",
    });
  }

  if (!password || password.length < 8) {
    return res.render("login/recuperar-password", {
      token,
      usuario: us,
      error: "La contraseña debe tener al menos 8 caracteres.",
    });
  }

  if (password !== password_confirmar) {
    return res.render("login/recuperar-password", {
      token,
      usuario: us,
      error: "Las contraseñas no coinciden.",
    });
  }

  us.password = password;
  us.token_recuperacion = null;
  us.token_recuperacion_expira = null;
  await us.save();

  res.redirect(`/?${aMensaje("Tu contraseña ha sido actualizada exitosamente. Inicia sesión.")}`);
};

const verificarEmailToken = async (req, res) => {
  const { token } = req.params;
  const us = await Usuario.findOne({ where: { token_verificacion: token } });

  if (!us) {
    return res.render("error", {
      codigo: 400,
      mensaje: "El enlace de verificación no es válido o ya ha sido utilizado.",
    });
  }

  us.email_verificado = true;
  us.token_verificacion = null;
  await us.save();

  if (req.cookies._token) {
    return res.redirect(`/configuracion?${aMensaje("¡Correo verificado exitosamente!")}`);
  }

  res.redirect(`/?${aMensaje("¡Tu correo ha sido verificado con éxito! Ya puedes iniciar sesión.")}`);
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
