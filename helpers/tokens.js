import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const secreto = () => {
  if (!process.env.SC_JWT) throw new Error("Falta SC_JWT en el archivo .env");
  return process.env.SC_JWT;
};

const JWTGenera = (usuario) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol, v: usuario.sesion_version || 0 }, secreto(), {
    expiresIn: process.env.JWT_DURACION || "8h",
  });

const JWTVerifica = (token) => jwt.verify(token, secreto());

/** Opciones de la cookie de sesión (las mismas al crearla y al borrarla). */
const opcionesCookieSesion = () => ({ httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });

export { JWTGenera, JWTVerifica, opcionesCookieSesion };
