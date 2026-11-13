import bcrypt from "bcryptjs";
import { Usuario, Comprador } from "../models/index.js";
import { enviarBoletinClientes, enviarEmailPasswordCambiada, estadoCorreo, enviarCorreoPrueba } from "../helpers/email.js";
import { enviarVerificacionCorreo, limiteVerificacion, segundosEsperaVerificacion, urlBase } from "../helpers/cuentas.js";
import { aplicarFoto } from "../helpers/avatar.js";
import { problemasPassword } from "../helpers/seguridad.js";
import { JWTGenera, opcionesCookieSesion } from "../helpers/tokens.js";
import { aMensaje } from "../helpers/utiles.js";
import { compradorDe, compradorPorCorreo } from "../helpers/comprador.js";
import { prefValida } from "../middleware/preferencias.js";
import { CATEGORIAS, COOKIE_DE_PREF, aplicarConsentimiento, guardarCookiePreferencia } from "../helpers/cookies.js";

const renderConfiguracion = async (req, res, adicionales = {}) => {
  const us = await Usuario.findByPk(req.usuario.id);
  const totalCompradores = await Comprador.count();
  res.render("configuracion/index", {
    us,
    totalCompradores,
    estadoCorreo: estadoCorreo(),
    appUrl: urlBase(req),
    mensaje: req.query.mensaje,
    error: req.query.error,
    ...adicionales,
  });
};

export const verConfiguracion = (req, res) => renderConfiguracion(req, res);

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
    const correoCambio = correo !== String(us.correo || "").toLowerCase();
    if (correoCambio && (await Usuario.findOne({ where: { correo } }))) {
      return res.redirect(`/configuracion?${aError("Ese correo ya está en uso por otro usuario")}#pane-cuenta`);
    }
    const comprador = await compradorDe(us);
    if (correoCambio && comprador) {
      const compradorExistente = await compradorPorCorreo(correo);
      if (compradorExistente && compradorExistente.codigo_cpr !== comprador.codigo_cpr) {
        return res.redirect(`/configuracion?${aError("Ese correo ya está asociado a otro cliente de la lonja")}#pane-cuenta`);
      }
    }
    us.nombre_completo = nombre;
    us.telefono = telefono || null;
    if (correoCambio) {
      us.correo = correo;
      us.email_verificado = false; // un correo nuevo debe verificarse otra vez
      us.token_verificacion = null;
      us.token_verificacion_expira = null;
    }
    await aplicarFoto(us, { fotoData: req.body.foto_data, quitar: req.body.foto_quitar === "on" });
    await us.save();
    if (correoCambio && comprador) await comprador.update({ correo });

    let aviso = "Datos de la cuenta actualizados.";
    if (correoCambio) {
      const espera = segundosEsperaVerificacion(us);
      if (espera > 0) {
        aviso += ` Ya se envió un enlace de verificación hace poco; espera ${espera} s o reenvíalo desde Mi cuenta.`;
      } else {
        const envio = await enviarVerificacionCorreo(req, us);
        if (envio.ok) aviso += ` Te enviamos un enlace a ${correo} para verificarlo.`;
        else if (envio.simulado && process.env.NODE_ENV !== "production") {
          return renderConfiguracion(req, res, { mensaje: aviso, enlaceVerificacion: envio.enlace, paneActiva: "cuenta" });
        } else if (envio.simulado) aviso += " No pudimos enviar el correo. Avisa al administrador.";
        else aviso += " No pudimos enviar el correo; inténtalo más tarde.";
      }
    }
    res.redirect(`/configuracion?${aMensaje(aviso)}#pane-cuenta`);
  } catch (err) {
    console.error("No se pudo actualizar la cuenta:", err);
    const errorImagen = /^(?:La imagen debe ser un archivo JPG, PNG o WebP|La imagen es demasiado grande|El archivo no es una imagen válida)$/.test(String(err?.message || ""));
    res.redirect(`/configuracion?${aError(errorImagen ? err.message : "No se pudieron guardar los datos. Revisa la información e inténtalo de nuevo.")}#pane-cuenta`);
  }
};

export const solicitarVerificacionEmail = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us?.correo) return res.redirect(`/configuracion?${aError("Primero registra un correo en tu cuenta")}#pane-cuenta`);
  if (us.email_verificado) return res.redirect(`/configuracion?${aMensaje("Tu correo ya está verificado")}#pane-cuenta`);

  const espera = segundosEsperaVerificacion(us);
  if (espera > 0) {
    return res.redirect(`/configuracion?${aError(`Espera ${espera} segundos antes de pedir otro enlace`)}#pane-cuenta`);
  }
  const clave = `verificacion:${us.id}`;
  if (limiteVerificacion.bloqueado(clave)) {
    return res.status(429).render("error", {
      codigo: 429,
      mensaje: "Se enviaron demasiados enlaces de verificación en la última hora. Inténtalo más tarde.",
    });
  }
  limiteVerificacion.fallo(clave);

  const envio = await enviarVerificacionCorreo(req, us);
  let aviso;
  if (envio.ok) aviso = `Se envió un enlace nuevo a ${us.correo}; los enlaces anteriores dejan de servir. Vence en 24 horas.`;
  else if (envio.simulado && process.env.NODE_ENV !== "production") {
    return renderConfiguracion(req, res, { mensaje: `Modo desarrollo: correo no configurado para ${us.correo}.`, enlaceVerificacion: envio.enlace, paneActiva: "cuenta" });
  } else if (envio.simulado) aviso = "No pudimos enviar el correo. Avisa al administrador.";
  else aviso = "No pudimos enviar el correo; inténtalo más tarde.";
  res.redirect(`/configuracion?${aMensaje(aviso)}#pane-cuenta`);
};

/** Envía un correo de prueba al propio administrador (pestaña Correo). */
export const probarCorreo = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us?.correo) return res.redirect(`/configuracion?${aError("Tu cuenta no tiene correo registrado")}#pane-correo`);
  const resultado = await enviarCorreoPrueba({ para: us.correo, usuario: us });
  if (resultado.ok) return res.redirect(`/configuracion?${aMensaje(`Correo de prueba enviado a ${us.correo}`)}#pane-correo`);
  const detalle = resultado.simulado
    ? "El correo está en modo simulador: configura GMAIL_USER y GMAIL_PASS en .env"
    : resultado.error || "No se pudo enviar el correo de prueba";
  res.redirect(`/configuracion?${aError(detalle)}#pane-correo`);
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
