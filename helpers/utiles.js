import { validationResult } from "express-validator";

/** Lista de mensajes de error de express-validator para la petición. */
export const mensajesError = (req) => validationResult(req).array().map((e) => e.msg);

/** Traduce errores de Sequelize/BD a un mensaje claro para el usuario. */
export const mensajeBD = (err) => {
  const n = err?.name ?? "";
  if (n === "SequelizeUniqueConstraintError") return "Ya existe un registro con ese valor único (por ejemplo, el correo).";
  if (n === "SequelizeForeignKeyConstraintError") return "No se puede completar: el registro está relacionado con otros datos.";
  if (n === "SequelizeValidationError") return err.errors.map((e) => e.message).join(". ");
  console.error(err);
  return "Ocurrió un error inesperado. Intenta de nuevo.";
};

export const aMensaje = (texto) => `mensaje=${encodeURIComponent(texto)}`;

/** Parámetro de error para redirecciones a la lista. */
export const aError = (texto) => `error=${encodeURIComponent(texto)}`;
