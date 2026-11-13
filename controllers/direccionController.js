import { Op } from "sequelize";
import db from "../config/db.js";
import { DireccionEntrega } from "../models/index.js";
import { aMensaje, aError } from "../helpers/utiles.js";
import { ESTADOS, MUNICIPIOS_VERACRUZ } from "../helpers/mexico.js";

const TELEFONO = /^[0-9+() -]{7,20}$/;
const CP = /^\d{5}$/;
const MAX_DIRECCIONES = 10;

const datos = (b) => ({
  alias: String(b.alias ?? "").trim(),
  destinatario: String(b.destinatario ?? "").trim(),
  telefono: String(b.telefono ?? "").trim(),
  calle: String(b.calle ?? "").trim(),
  num_ext: String(b.num_ext ?? "").trim(),
  num_int: String(b.num_int ?? "").trim() || null,
  colonia: String(b.colonia ?? "").trim(),
  cp: String(b.cp ?? "").trim(),
  municipio: String(b.municipio ?? "").trim(),
  estado: String(b.estado ?? "").trim(),
  referencias: String(b.referencias ?? "").trim() || null,
});

function erroresDireccion(d) {
  const errs = [];
  const largo = (valor, max, etiqueta) => {
    if (!valor) errs.push(`${etiqueta} es obligatorio`);
    else if (valor.length > max) errs.push(`${etiqueta}: máximo ${max} caracteres`);
  };
  largo(d.alias, 30, "El alias");
  largo(d.destinatario, 60, "El destinatario");
  largo(d.calle, 80, "La calle");
  largo(d.num_ext, 10, "El número exterior");
  largo(d.colonia, 60, "La colonia");
  largo(d.municipio, 60, "El municipio");
  if (!d.estado) errs.push("Selecciona el estado");
  else if (!ESTADOS.includes(d.estado)) errs.push("El estado seleccionado no es válido");
  if (!TELEFONO.test(d.telefono)) errs.push("El teléfono debe tener entre 7 y 20 caracteres");
  if (!CP.test(d.cp)) errs.push("El código postal debe tener exactamente 5 dígitos");
  if (d.num_int && d.num_int.length > 10) errs.push("El número interior admite máximo 10 caracteres");
  if (d.referencias && d.referencias.length > 200) errs.push("Las referencias admiten máximo 200 caracteres");
  return errs;
}

const datosVista = (extra = {}) => ({ estados: ESTADOS, municipios: MUNICIPIOS_VERACRUZ, ...extra });

const vistaFormulario = (res, { direccion, action, errores = [], estado = 200 }) =>
  res.status(estado).render("cuenta/direccion-formulario", datosVista({ direccion, action, errores }));

const noEncontrada = (res) =>
  res.status(404).render("error", { codigo: 404, mensaje: "No se encontró la dirección de entrega." });

/** Busca una dirección del propio usuario; cualquier id ajeno responde 404. */
const propia = (req) =>
  DireccionEntrega.findOne({ where: { id_dir: req.params.id, id_usuario: req.usuario.id } });

export const lista = async (req, res) => {
  const direcciones = await DireccionEntrega.findAll({
    where: { id_usuario: req.usuario.id },
    order: [["principal", "DESC"], ["id_dir", "ASC"]],
  });
  res.render("cuenta/direcciones", {
    direcciones,
    maximo: MAX_DIRECCIONES,
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

export const verCrear = (req, res) => vistaFormulario(res, { direccion: null, action: "/cuenta/direcciones" });

export const registrar = async (req, res) => {
  const total = await DireccionEntrega.count({ where: { id_usuario: req.usuario.id } });
  if (total >= MAX_DIRECCIONES) {
    return vistaFormulario(res, {
      direccion: req.body,
      action: "/cuenta/direcciones",
      errores: [`Puedes guardar como máximo ${MAX_DIRECCIONES} direcciones. Borra una para agregar otra.`],
      estado: 400,
    });
  }

  const d = datos(req.body);
  const errs = erroresDireccion(d);
  if (errs.length) return vistaFormulario(res, { direccion: req.body, action: "/cuenta/direcciones", errores: errs, estado: 400 });

  const principal = total === 0 || req.body.principal === "on";
  await db.transaction(async (t) => {
    if (principal) {
      await DireccionEntrega.update({ principal: false }, { where: { id_usuario: req.usuario.id }, transaction: t });
    }
    await DireccionEntrega.create({ ...d, id_usuario: req.usuario.id, principal }, { transaction: t });
  });

  res.redirect(`/cuenta/direcciones?${aMensaje("Dirección guardada")}`);
};

export const editar = async (req, res) => {
  const direccion = await propia(req);
  if (!direccion) return noEncontrada(res);
  vistaFormulario(res, { direccion, action: `/cuenta/direcciones/${direccion.id_dir}?_method=PUT` });
};

export const actualizar = async (req, res) => {
  const direccion = await propia(req);
  if (!direccion) return noEncontrada(res);

  const d = datos(req.body);
  const errs = erroresDireccion(d);
  if (errs.length) {
    return vistaFormulario(res, {
      direccion: { ...req.body, id_dir: direccion.id_dir },
      action: `/cuenta/direcciones/${direccion.id_dir}?_method=PUT`,
      errores: errs,
      estado: 400,
    });
  }

  const otras = await DireccionEntrega.count({ where: { id_usuario: req.usuario.id, id_dir: { [Op.ne]: direccion.id_dir } } });
  const quierePrincipal = req.body.principal === "on";

  await db.transaction(async (t) => {
    if (quierePrincipal) {
      await DireccionEntrega.update({ principal: false }, { where: { id_usuario: req.usuario.id }, transaction: t });
    }
    // Siempre debe existir una principal: si se desmarca la única que había y
    // hay otras direcciones, se promueve la primera.
    const conservar = quierePrincipal || (direccion.principal && otras === 0);
    await direccion.update({ ...d, principal: conservar }, { transaction: t });

    if (!quierePrincipal && direccion.principal === false) {
      const hayPrincipal = await DireccionEntrega.count({ where: { id_usuario: req.usuario.id, principal: true }, transaction: t });
      if (!hayPrincipal) {
        const primera = await DireccionEntrega.findOne({
          where: { id_usuario: req.usuario.id },
          order: [["id_dir", "ASC"]],
          transaction: t,
        });
        if (primera) await primera.update({ principal: true }, { transaction: t });
      }
    }
  });

  res.redirect(`/cuenta/direcciones?${aMensaje("Dirección actualizada")}`);
};

export const eliminar = async (req, res) => {
  const direccion = await propia(req);
  if (!direccion) return noEncontrada(res);

  await db.transaction(async (t) => {
    const eraPrincipal = direccion.principal;
    await direccion.destroy({ transaction: t });
    if (eraPrincipal) {
      const siguiente = await DireccionEntrega.findOne({
        where: { id_usuario: req.usuario.id },
        order: [["id_dir", "ASC"]],
        transaction: t,
      });
      if (siguiente) await siguiente.update({ principal: true }, { transaction: t });
    }
  });

  res.redirect(`/cuenta/direcciones?${aMensaje("Dirección eliminada")}`);
};

export const marcarPrincipal = async (req, res) => {
  const direccion = await propia(req);
  if (!direccion) return noEncontrada(res);

  await db.transaction(async (t) => {
    await DireccionEntrega.update({ principal: false }, { where: { id_usuario: req.usuario.id }, transaction: t });
    await direccion.update({ principal: true }, { transaction: t });
  });

  res.redirect(`/cuenta/direcciones?${aMensaje("Dirección principal actualizada")}`);
};

export { MAX_DIRECCIONES, erroresDireccion };
