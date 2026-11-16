import jwt from "jsonwebtoken";
import "../config/entorno.js";
import crypto from "node:crypto";

const secreto = () => {
  if (!process.env.SC_JWT) throw new Error("Falta SC_JWT en el archivo .env");
  return process.env.SC_JWT;
};

const JWTGenera = (usuario) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol, v: usuario.sesion_version || 0 }, secreto(), {
    expiresIn: process.env.JWT_DURACION || "8h",
  });

const JWTVerifica = (token) => jwt.verify(token, secreto());

/** Token firmado para retirar consentimiento de avisos (vigencia de un año). */
export function crearTokenBajaAvisos(idUsuario, ahora = Date.now()) {
  const cuerpo = Buffer.from(`${Number(idUsuario)}:${Math.floor(ahora / 1000)}`).toString("base64url");
  const firma = crypto.createHmac("sha256", secreto()).update(`baja-avisos:${cuerpo}`).digest("base64url");
  return `${cuerpo}.${firma}`;
}

export function idUsuarioDeTokenBajaAvisos(token, ahora = Date.now()) {
  const [cuerpo, firma, extra] = String(token || "").split(".");
  if (!cuerpo || !firma || extra) return null;
  const esperada = crypto.createHmac("sha256", secreto()).update(`baja-avisos:${cuerpo}`).digest();
  let recibida;
  try { recibida = Buffer.from(firma, "base64url"); } catch { return null; }
  if (recibida.length !== esperada.length || !crypto.timingSafeEqual(recibida, esperada)) return null;
  try {
    const texto = Buffer.from(cuerpo, "base64url").toString("utf8");
    const m = /^(\d+):(\d+)$/.exec(texto);
    if (!m) return null;
    const id = Number(m[1]);
    const creado = Number(m[2]) * 1000;
    if (!Number.isSafeInteger(id) || id < 1 || creado > ahora || ahora - creado > 365 * 24 * 60 * 60 * 1000) return null;
    return id;
  } catch { return null; }
}

/** Opciones de la cookie de sesión (las mismas al crearla y al borrarla). */
const opcionesCookieSesion = () => ({ httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });

export { JWTGenera, JWTVerifica, opcionesCookieSesion };
