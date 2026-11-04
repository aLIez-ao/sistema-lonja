import { Usuario } from "../models/index.js";
import { JWTVerifica } from "../helpers/tokens.js";

/** Autenticación: exige un JWT válido en la cookie _token y carga req.usuario. */
const rutaProteger = async (req, res, next) => {
  const { _token } = req.cookies;
  if (!_token) return res.redirect("/");

  try {
    const decoded = JWTVerifica(_token);
    const usuario = await Usuario.scope("sinClave").findByPk(decoded.id);
    // Un usuario desactivado o borrado pierde el acceso aunque su token no haya vencido
    if (!usuario || !usuario.activo) return res.clearCookie("_token").redirect("/");
    req.usuario = usuario;
    res.locals.usuario = usuario;
    return next();
  } catch {
    return res.clearCookie("_token").redirect("/");
  }
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
