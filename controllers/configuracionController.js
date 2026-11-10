import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Usuario, Comprador } from "../models/index.js";
import { enviarEmailVerificacion, enviarBoletinClientes } from "../helpers/email.js";
import { aMensaje } from "../helpers/utiles.js";

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

export const guardarPreferencias = async (req, res) => {
  const { tema, idioma, moneda, tamanoFuente, tipoFuente, cookiesConsent } = req.body;

  const prefs = {
    tema: tema || "ocean",
    idioma: idioma || "es",
    moneda: moneda || "MXN",
    tamanoFuente: tamanoFuente || "md",
    tipoFuente: tipoFuente || "sans",
  };

  const dias = 365;
  const maxAge = dias * 24 * 60 * 60 * 1000;

  res.cookie("lonja_theme", prefs.tema, { maxAge, path: "/" });
  res.cookie("lonja_lang", prefs.idioma, { maxAge, path: "/" });
  res.cookie("lonja_currency", prefs.moneda, { maxAge, path: "/" });
  res.cookie("lonja_font_size", prefs.tamanoFuente, { maxAge, path: "/" });
  res.cookie("lonja_font_family", prefs.tipoFuente, { maxAge, path: "/" });

  if (cookiesConsent) {
    res.cookie("lonja_cookies_consent", cookiesConsent, { maxAge, path: "/" });
  }

  // Guardar en base de datos si el usuario está autenticado
  if (req.usuario) {
    try {
      const us = await Usuario.findByPk(req.usuario.id);
      if (us) {
        us.preferencias = JSON.stringify(prefs);
        await us.save();
      }
    } catch (e) {
      console.warn("No se pudo persistir preferencias en usuario:", e.message);
    }
  }

  res.redirect(`/configuracion?${aMensaje("Preferencias guardadas correctamente")}`);
};

export const guardarRapido = async (req, res) => {
  const { clave, valor } = req.body;
  if (!clave || !valor) return res.status(400).json({ ok: false });

  const maxAge = 365 * 24 * 60 * 60 * 1000;
  const mapaCookies = {
    tema: "lonja_theme",
    idioma: "lonja_lang",
    moneda: "lonja_currency",
    tamanoFuente: "lonja_font_size",
    tipoFuente: "lonja_font_family",
  };

  const nombreCookie = mapaCookies[clave];
  if (nombreCookie) {
    res.cookie(nombreCookie, valor, { maxAge, path: "/" });
  }

  if (req.usuario) {
    try {
      const us = await Usuario.findByPk(req.usuario.id);
      if (us) {
        let prefs = {};
        try { prefs = JSON.parse(us.preferencias || "{}"); } catch {}
        prefs[clave] = valor;
        us.preferencias = JSON.stringify(prefs);
        await us.save();
      }
    } catch {}
  }

  return res.json({ ok: true });
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

export const verificarEmailToken = async (req, res) => {
  const { token } = req.params;
  const us = await Usuario.findOne({ where: { token_verificacion: token } });

  if (!us) {
    return res.render("error", {
      codigo: 400,
      mensaje: "El enlace de verificación no es válido o ya ha expirado.",
    });
  }

  us.email_verificado = true;
  us.token_verificacion = null;
  await us.save();

  res.redirect(`/configuracion?${aMensaje("¡Tu correo electrónico ha sido verificado exitosamente!")}`);
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
