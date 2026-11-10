import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Usuario, Comprador } from "../models/index.js";
import { enviarEmailVerificacion, enviarBoletinClientes } from "../helpers/email.js";
import { aMensaje } from "../helpers/utiles.js";
import { prefValida } from "../middleware/preferencias.js";
import { CATEGORIAS, COOKIE_DE_PREF, aplicarConsentimiento, guardarCookiePreferencia } from "../helpers/cookies.js";

export const verConfiguracion = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  const totalCompradores = await Comprador.count();
  res.render("configuracion/index", {
    us,
    totalCompradores,
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

/** Guarda en la cuenta (siempre) y en cookies (solo las categorías aceptadas). */
async function persistirPreferencias(req, res, cambios) {
  const validas = {};
  for (const [clave, valor] of Object.entries(cambios)) {
    const v = prefValida(clave, valor);
    if (v) validas[clave] = v;
  }
  for (const [clave, valor] of Object.entries(validas)) guardarCookiePreferencia(req, res, clave, valor);

  if (req.usuario && Object.keys(validas).length) {
    const us = await Usuario.findByPk(req.usuario.id);
    let prefs = {};
    try { prefs = JSON.parse(us.preferencias || "{}") || {}; } catch { /* se reemplaza */ }
    us.preferencias = JSON.stringify({ ...prefs, ...validas });
    await us.save();
  }
  return validas;
}

export const guardarPreferencias = async (req, res) => {
  const { tema, idioma, moneda, tamanoFuente, tipoFuente } = req.body;
  await persistirPreferencias(req, res, { tema, idioma, moneda, tamanoFuente, tipoFuente });
  res.redirect(`/configuracion?${aMensaje("Preferencias guardadas correctamente")}`);
};

export const guardarRapido = async (req, res) => {
  const { clave, valor } = req.body;
  const guardadas = await persistirPreferencias(req, res, { [clave]: valor });
  if (!Object.keys(guardadas).length) return res.status(400).json({ ok: false });
  return res.json({ ok: true });
};

/** Consentimiento de cookies: desde el banner (JSON) o desde Configuración (formulario). */
export const guardarCookies = async (req, res) => {
  let categorias = req.body.categorias ?? [];
  if (req.body.nivel === "all") categorias = CATEGORIAS.map((c) => c.id);
  else if (req.body.nivel === "essential") categorias = [];
  if (!Array.isArray(categorias)) categorias = [categorias];

  const consentimiento = aplicarConsentimiento(req, res, categorias);

  // Las preferencias actuales se copian a las cookies recién permitidas
  for (const [clave, { cookie, categoria }] of Object.entries(COOKIE_DE_PREF)) {
    if (consentimiento.permite(categoria) && req.pref?.[clave]) {
      res.cookie(cookie, req.pref[clave], { maxAge: 365 * 24 * 60 * 60 * 1000, path: "/", sameSite: "lax" });
    }
  }

  if (req.is("json")) return res.json({ ok: true, permitidas: consentimiento.permitidas });
  res.redirect(`/configuracion?${aMensaje("Preferencias de cookies actualizadas")}#pane-cookies`);
};

export const actualizarCuenta = async (req, res) => {
  const { nombre_completo, correo } = req.body;
  const us = await Usuario.findByPk(req.usuario.id);

  if (!us) return res.redirect("/");

  try {
    if (correo && correo !== us.correo) {
      const yaExiste = await Usuario.findOne({ where: { correo } });
      if (yaExiste && yaExiste.id !== us.id) {
        return res.redirect(`/configuracion?error=${encodeURIComponent("El correo ya está en uso por otro usuario")}`);
      }
      us.correo = correo;
      us.email_verificado = false; // Requiere re-verificación al cambiar correo
    }

    if (nombre_completo) us.nombre_completo = nombre_completo;
    await us.save();

    res.redirect(`/configuracion?${aMensaje("Datos de cuenta actualizados exitosamente")}`);
  } catch (err) {
    res.redirect(`/configuracion?error=${encodeURIComponent("Error al actualizar cuenta: " + err.message)}`);
  }
};

export const solicitarVerificacionEmail = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us || !us.correo) {
    return res.redirect(`/configuracion?error=${encodeURIComponent("Debes registrar un correo antes de solicitar verificación")}`);
  }

  const token = crypto.randomBytes(32).toString("hex");
  us.token_verificacion = token;
  await us.save();

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  await enviarEmailVerificacion({ usuario: us, correo: us.correo, token, baseUrl });

  res.redirect(`/configuracion?${aMensaje("Se ha enviado un enlace de confirmación a tu correo")}`);
};

export const cambiarPasswordCuenta = async (req, res) => {
  const { password_actual, password_nuevo, password_confirmar } = req.body;
  const us = await Usuario.findByPk(req.usuario.id);

  if (!us) return res.redirect("/");

  const esValida = await bcrypt.compare(password_actual, us.password);
  if (!esValida) {
    return res.redirect(`/configuracion?error=${encodeURIComponent("La contraseña actual es incorrecta")}`);
  }

  if (!password_nuevo || password_nuevo.length < 8) {
    return res.redirect(`/configuracion?error=${encodeURIComponent("La nueva contraseña debe tener al menos 8 caracteres")}`);
  }

  if (password_nuevo !== password_confirmar) {
    return res.redirect(`/configuracion?error=${encodeURIComponent("Las contraseñas no coinciden")}`);
  }

  us.password = password_nuevo;
  await us.save();

  res.redirect(`/configuracion?${aMensaje("Contraseña actualizada exitosamente")}`);
};

export const enviarAvisoClientes = async (req, res) => {
  const { asunto, titulo, mensaje, tipo } = req.body;

  if (!asunto || !mensaje) {
    return res.redirect(`/configuracion?error=${encodeURIComponent("Asunto y mensaje son requeridos")}`);
  }

  const compradores = await Comprador.findAll();
  await enviarBoletinClientes({ asunto, titulo, mensaje, tipo, compradores });

  res.redirect(`/configuracion?${aMensaje(`Aviso enviado a ${compradores.length} clientes registrados`)}`);
};
