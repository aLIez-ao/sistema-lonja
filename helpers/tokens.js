import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const secreto = () => {
  if (!process.env.SC_JWT) throw new Error("Falta SC_JWT en el archivo .env");
  return process.env.SC_JWT;
};

const JWTGenera = (usuario) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol }, secreto(), {
    expiresIn: process.env.JWT_DURACION || "8h",
  });

const JWTVerifica = (token) => jwt.verify(token, secreto());

export { JWTGenera, JWTVerifica };
