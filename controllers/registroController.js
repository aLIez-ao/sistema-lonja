import { col, fn, where as sqlWhere } from "sequelize";
import db from "../config/db.js";
import { Usuario, Comprador } from "../models/index.js";
import { crearLimite, problemasPassword } from "../helpers/seguridad.js";
import { enviarVerificacionCorreo } from "../helpers/cuentas.js";
import { compradorPorCorreo } from "../helpers/comprador.js";

const HORA = 60 * 60 * 1000;

// 5 intentos de registro por IP cada hora.
export const limiteRegistro = crearLimite({ max: 5, ventanaMs: HORA });

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^[0-9+() -]{7,20}$/;
const CAMPOS_TRAMPA = ["sitio_web", "empresa_web"];

const datosFormulario = (b = {}) => ({
  nombre: b.nombre || "",
  apellido_paterno: b.apellido_paterno || "",
  apellido_materno: b.apellido_materno || "",
  correo: b.correo || "",
  telefono: b.telefono || "",
});

/** Parte local del correo convertida en un nombre de usuario único. */
async function usuarioLibre(correo) {
  const base = String(correo).split("@")[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 30) || "comprador";
  let candidato = base;
  let n = 0;
  while (await Usuario.findOne({ where: { usuario: candidato } })) {
    n += 1;
    candidato = `${base.slice(0, 36)}${n}`;
  }
  return candidato;
}

function erroresRegistro(b) {
  const errs = [];
  const nombre = String(b.nombre ?? "").trim();
  const paterno = String(b.apellido_paterno ?? "").trim();
  const materno = String(b.apellido_materno ?? "").trim();
  const correo = String(b.correo ?? "").trim();

  if (!nombre) errs.push("El nombre es obligatorio");
  else if (nombre.length > 40) errs.push("Nombre: máximo 40 caracteres");
  if (!paterno) errs.push("El apellido paterno es obligatorio");
  else if (paterno.length > 40) errs.push("Apellido paterno: máximo 40 caracteres");
  if (materno.length > 40) errs.push("Apellido materno: máximo 40 caracteres");
  if (!CORREO.test(correo) || correo.length > 80) errs.push("Escribe un correo electrónico válido (máximo 80 caracteres)");
  if (b.telefono && !TELEFONO.test(String(b.telefono).trim())) {
    errs.push("Teléfono: entre 7 y 20 caracteres (dígitos, espacios, +, paréntesis o guiones)");
  }
  if (`${nombre} ${paterno} ${materno}`.trim().length > 80) errs.push("El nombre completo admite máximo 80 caracteres");

  errs.push(...problemasPassword(b.password));
  if (b.password !== b.password_confirmar) errs.push("Las contraseñas no coinciden");
  if (b.aviso_privacidad !== "on") errs.push("Debes aceptar el aviso de privacidad para crear tu cuenta");
  return errs;
}

const vistaFormulario = (res, { errores = [], datos = {} } = {}) =>
  res.status(errores.length ? 400 : 200).render("registro/formulario", { errores, datos: datosFormulario(datos) });

/** Página genérica: nunca revela si el correo ya estaba registrado. */
const vistaRevisa = (res, { correo = "", enlace = null } = {}) =>
  res.render("registro/revisa", { correo, enlace });

const verRegistro = (req, res) => {
  if (req.usuario) return res.redirect(req.usuario.rol === "comprador" ? "/" : "/dashboard");
  vistaFormulario(res);
};

const registrar = async (req, res) => {
  // Campo trampa: los bots lo rellenan, las personas no lo ven.
  const trampa = CAMPOS_TRAMPA.some((campo) => String(req.body[campo] ?? "").trim());
  if (trampa) return vistaRevisa(res, { correo: req.body.correo });

  const errs = erroresRegistro(req.body);
  if (errs.length) return vistaFormulario(res, { errores: errs, datos: req.body });

  if (limiteRegistro.bloqueado(req.ip)) {
    return res.status(429).render("error", {
      codigo: 429,
      mensaje: "Se hicieron demasiados registros desde este equipo. Inténtalo de nuevo en una hora.",
    });
  }
  // Solo un intento que pasó todas las validaciones consume el límite.
  limiteRegistro.fallo(req.ip);

  const correo = String(req.body.correo).trim().toLowerCase();
  const existente = await Usuario.findOne({ where: sqlWhere(fn("LOWER", col("correo")), correo) });
  // Respuesta uniforme: si la cuenta ya existe no se crea nada ni se revela el motivo.
  if (existente) return vistaRevisa(res, { correo });

  const nombre = String(req.body.nombre).trim();
  const paterno = String(req.body.apellido_paterno).trim();
  const materno = String(req.body.apellido_materno ?? "").trim() || null;
  let enlace = null;

  try {
    const us = await db.transaction(async (t) => {
      const nuevo = await Usuario.create({
        usuario: await usuarioLibre(correo),
        nombre_completo: `${nombre} ${paterno}${materno ? ` ${materno}` : ""}`,
        correo,
        telefono: String(req.body.telefono ?? "").trim() || null,
        rol: "comprador",
        password: req.body.password,
      }, { transaction: t });

      // Si ya existe un comprador de mostrador con ese correo, se vincula al
      // verificar el correo (no antes), para no apropiarse de historiales ajenos.
      const previo = await compradorPorCorreo(correo);
      if (!previo) {
        const cpr = await Comprador.create({
          nombre, apellido_paterno: paterno, apellido_materno: materno, correo,
        }, { transaction: t });
        nuevo.codigo_cpr = cpr.codigo_cpr;
        await nuevo.save({ transaction: t });
      }
      return nuevo;
    });

    const envio = await enviarVerificacionCorreo(req, us).catch((e) => {
      console.error("No se pudo enviar la verificación del registro:", e.message);
      return { ok: false };
    });
    if (envio.simulado && process.env.NODE_ENV !== "production") enlace = envio.enlace;
  } catch (e) {
    // Un choque de correo por concurrencia también responde igual que el alta correcta.
    if (e?.name !== "SequelizeUniqueConstraintError") {
      console.error("Error al registrar comprador:", e);
      return res.status(500).render("error", { codigo: 500, mensaje: "No pudimos crear la cuenta. Inténtalo más tarde." });
    }
  }

  return vistaRevisa(res, { correo, enlace });
};

export { verRegistro, registrar };
