import bcrypt from "bcryptjs";
import { Usuario, Comprador } from "../models/index.js";
import { enviarBoletinClientes, enviarEmailPasswordCambiada } from "../helpers/email.js";
import { enviarVerificacionCorreo } from "../helpers/cuentas.js";
import { aplicarFoto } from "../helpers/avatar.js";
import { problemasPassword } from "../helpers/seguridad.js";
import { JWTGenera, opcionesCookieSesion } from "../helpers/tokens.js";
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

const aError = (texto) => `error=${encodeURIComponent(texto)}`;

export const actualizarCuenta = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us) return res.redirect("/");
  const nombre = String(req.body.nombre_completo ?? "").trim();
  const correo = String(req.body.correo ?? "").trim().toLowerCase();
  const telefono = String(req.body.telefono ?? "").trim();

  if (!nombre || nombre.length > 80) return res.redirect(`/configuracion?${aError("El nombre es obligatorio (máximo 80 caracteres)")}#pane-cuenta`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 80) return res.redirect(`/configuracion?${aError("Escribe un correo electrónico válido")}#pane-cuenta`);
  if (telefono && !/^[0-9+() -]{7,20}$/.test(telefono)) return res.redirect(`/configuracion?${aError("El teléfono no es válido")}#pane-cuenta`);

  try {
    const correoCambio = correo !== (us.correo || "");
    if (correoCambio && (await Usuario.findOne({ where: { correo } }))) {
      return res.redirect(`/configuracion?${aError("Ese correo ya está en uso por otro usuario")}#pane-cuenta`);
    }
    us.nombre_completo = nombre;
    us.telefono = telefono || null;
    if (correoCambio) {
      us.correo = correo;
      us.email_verificado = false; // un correo nuevo debe verificarse otra vez
    }
    await aplicarFoto(us, { fotoData: req.body.foto_data, quitar: req.body.foto_quitar === "on" });
    await us.save();

    let aviso = "Datos de la cuenta actualizados.";
    if (correoCambio) {
      const envio = await enviarVerificacionCorreo(req, us);
      aviso += envio.ok ? ` Te enviamos un enlace a ${correo} para verificarlo.` : " Falta verificar el correo nuevo.";
    }
    res.redirect(`/configuracion?${aMensaje(aviso)}#pane-cuenta`);
  } catch (err) {
    res.redirect(`/configuracion?${aError(err.name?.startsWith("Sequelize") ? "No se pudieron guardar los datos" : err.message)}#pane-cuenta`);
  }
};

export const solicitarVerificacionEmail = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us?.correo) return res.redirect(`/configuracion?${aError("Primero registra un correo en tu cuenta")}#pane-cuenta`);
  if (us.email_verificado) return res.redirect(`/configuracion?${aMensaje("Tu correo ya está verificado")}#pane-cuenta`);

  const envio = await enviarVerificacionCorreo(req, us);
  const aviso = envio.ok
    ? `Enviamos un enlace de verificación a ${us.correo}. Vence en 24 horas.`
    : envio.simulado
      ? "El servidor no tiene configurado el envío de correo (GMAIL_USER/GMAIL_PASS); el enlace se imprimió en la consola del servidor."
      : null;
  res.redirect(aviso ? `/configuracion?${aMensaje(aviso)}#pane-cuenta` : `/configuracion?${aError("No se pudo enviar el correo de verificación")}#pane-cuenta`);
};

export const cambiarPasswordCuenta = async (req, res) => {
  const { password_actual, password_nuevo, password_confirmar } = req.body;
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us) return res.redirect("/");

  const errores = [];
  if (!(await bcrypt.compare(String(password_actual ?? ""), us.password))) errores.push("La contraseña actual es incorrecta");
  else {
    errores.push(...problemasPassword(password_nuevo, { usuario: us.usuario }));
    if (password_nuevo !== password_confirmar) errores.push("Las contraseñas nuevas no coinciden");
    if (!errores.length && password_nuevo === password_actual) errores.push("La contraseña nueva debe ser distinta de la actual");
  }
  if (errores.length) return res.redirect(`/configuracion?${aError(errores.join(". "))}#pane-seguridad`);

  us.password = password_nuevo; // invalida todas las sesiones anteriores (sesion_version)
  await us.save();
  // Esta sesión continúa con un token nuevo; las demás quedan cerradas
  res.cookie("_token", JWTGenera(us), opcionesCookieSesion());
  if (us.correo) enviarEmailPasswordCambiada({ usuario: us, correo: us.correo }).catch(() => {});

  res.redirect(`/configuracion?${aMensaje("Contraseña actualizada. Se cerraron las demás sesiones abiertas.")}#pane-seguridad`);
};

export const enviarAvisoClientes = async (req, res) => {
  const { asunto, titulo, mensaje, tipo } = req.body;

  if (!asunto || !mensaje) {
    return res.redirect(`/configuracion?error=${encodeURIComponent("Asunto y mensaje son requeridos")}`);
  }

  const compradores = await Comprador.findAll();
  await enviarBoletinClientes({ asunto, titulo, mensaje, tipo, compradores });

  res.redirect(`/configuracion?${aMensaje(`Aviso enviado a ${compradores.length} clientes registrados`)}#pane-avisos`);
};
