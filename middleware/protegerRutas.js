import { Usuario } from "../models/index.js";
import { JWTVerifica, opcionesCookieSesion } from "../helpers/tokens.js";
import { rutaVolver } from "../helpers/navegacion.js";

/**
 * Devuelve el usuario dueño del token o null si el token no sirve: firma inválida o vencida,
 * usuario borrado o desactivado, o contraseña cambiada después de emitirlo (sesion_version).
 */
export async function usuarioDesdeToken(token) {
  if (!token) return null;
  try {
    const decoded = JWTVerifica(token);
    const usuario = await Usuario.scope("sinClave").findByPk(decoded.id);
    if (!usuario || !usuario.activo) return null;
    if ((decoded.v ?? 0) !== (usuario.sesion_version ?? 0)) return null;
    return usuario;
  } catch {
    return null;
  }
}

/** Autenticación: exige una sesión válida (app.js ya resolvió req.usuario a partir de la cookie). */
const rutaProteger = async (req, res, next) => {
  const usuario = req.usuario ?? (await usuarioDesdeToken(req.cookies?._token));
  if (!usuario) {
    if (req.cookies?._token) res.clearCookie("_token", opcionesCookieSesion());
    // Tras iniciar sesión se vuelve a la ruta pedida (solo si es interna).
    const volver = req.method === "GET" ? rutaVolver(req.originalUrl) : null;
    const destino = volver && volver !== "/acceso" ? `/acceso?volver=${encodeURIComponent(volver)}` : "/acceso";
    return res.redirect(destino);
  }
  req.usuario = usuario;
  res.locals.usuario = usuario;
  // Las páginas privadas no se guardan en caché: tras cerrar sesión, "atrás" vuelve a pedirlas y redirige al login
  res.set({ "Cache-Control": "no-store, no-cache, must-revalidate, private", Pragma: "no-cache", Expires: "0" });
  return next();
};

/** Autorización: permite solo los roles indicados. Usar después de rutaProteger. */
export const permitir =
  (...roles) =>
  (req, res, next) => {
    if (roles.includes(req.usuario.rol)) return next();
    return res.status(403).render("error", {
      codigo: 403,
      mensaje: "No tienes permiso para realizar esta acción.",
    });
  };

export default rutaProteger;
