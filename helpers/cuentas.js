// Operaciones de cuenta compartidas por login, configuración y administración de usuarios.
import { nuevoToken, hashToken, crearLimite } from "./seguridad.js";
import { enviarEmailInvitacion, enviarEmailRecuperacion, enviarEmailVerificacion } from "./email.js";

const HORA = 60 * 60 * 1000;
const SEGUNDO = 1000;

/** URL pública de la app: APP_URL si está definida; si no, el host de la petición. */
export const urlBase = (req) => {
  const configurada = String(process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (configurada) return configurada;
  return `${req.protocol}://${req.get("host")}`;
};

/**
 * Genera un enlace de un solo uso para definir la contraseña y lo envía por correo.
 * tipo: "recuperacion" (1 h) | "invitacion" (72 h).
 * Devuelve { ok, simulado, enlace }: el enlace solo se devuelve para mostrarlo al administrador
 * cuando el correo no está configurado (modo simulador).
 */
export async function enviarEnlacePassword(req, usuario, tipo = "recuperacion") {
  const token = nuevoToken();
  usuario.token_recuperacion = hashToken(token);
  usuario.token_recuperacion_expira = new Date(Date.now() + (tipo === "invitacion" ? 72 : 1) * HORA);
  await usuario.save();

  const datos = { usuario, correo: usuario.correo, token, baseUrl: urlBase(req) };
  const resultado = tipo === "invitacion"
    ? await enviarEmailInvitacion({ ...datos, invitadoPor: req.usuario?.nombre_completo })
    : await enviarEmailRecuperacion(datos);
  return { ...resultado, enlace: `${datos.baseUrl}/recuperar-password/${token}` };
}

/** Envío de verificación: 60 s de enfriamiento y máximo 5 por hora y usuario. */
export const limiteVerificacion = crearLimite({ max: 5, ventanaMs: HORA });

/** Segundos que faltan para poder reenviar (0 si ya se puede). */
export function segundosEsperaVerificacion(usuario) {
  if (!usuario?.token_verificacion_envio) return 0;
  const transcurrido = Date.now() - new Date(usuario.token_verificacion_envio).getTime();
  return Math.max(0, Math.ceil((60 * SEGUNDO - transcurrido) / SEGUNDO));
}

/**
 * Envía el enlace de verificación del correo (24 h).
 * Guarda también la fecha del envío para aplicar el enfriamiento de 60 s.
 */
export async function enviarVerificacionCorreo(req, usuario) {
  const token = nuevoToken();
  const baseUrl = urlBase(req);
  usuario.token_verificacion = hashToken(token);
  usuario.token_verificacion_expira = new Date(Date.now() + 24 * HORA);
  usuario.token_verificacion_envio = new Date();
  await usuario.save();
  const resultado = await enviarEmailVerificacion({ usuario, correo: usuario.correo, token, baseUrl });
  return { ...resultado, enlace: `${baseUrl}/verificar-email/${token}` };
}

/** Texto para el administrador según cómo salió el envío. */
export function resumenEnvio(resultado, correo) {
  if (resultado.ok) return `Se envió el enlace a ${correo}.`;
  if (resultado.simulado) return `El correo no está configurado (GMAIL_USER/GMAIL_PASS), así que no se envió nada. Comparte este enlace con el usuario: ${resultado.enlace}`;
  return `No se pudo enviar el correo (${resultado.error || "error desconocido"}). Comparte este enlace con el usuario: ${resultado.enlace}`;
}
