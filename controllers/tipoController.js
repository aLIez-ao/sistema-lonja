import { body } from "express-validator";
import { Tipo } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";

const reglas = [body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio").isLength({ max: 30 }).withMessage("El nombre admite máximo 30 caracteres")];

const lista = async (req, res) => {
  const tipos = await Tipo.findAll({ order: [["nombre", "ASC"]] });
  res.render("tipos/index", { tipos, mensaje: req.query.mensaje });
};

const verCrear = (req, res) => res.render("tipos/formulario", { tipo: null, action: "/tipos", method: "POST", errores: [] });

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await Tipo.create({ nombre: req.body.nombre });
      return res.redirect(`/tipos?${aMensaje("Tipo registrado")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("tipos/formulario", { tipo: req.body, action: "/tipos", method: "POST", errores: errs });
};

const editar = async (req, res) => {
  const tipo = await Tipo.findByPk(req.params.id);
  if (!tipo) return res.redirect("/tipos");
  res.render("tipos/formulario", { tipo, action: `/tipos/${tipo.id_tpo}?_method=PUT`, method: "POST", errores: [] });
};

const actualizar = async (req, res) => {
  const tipo = await Tipo.findByPk(req.params.id);
  if (!tipo) return res.redirect("/tipos");
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await tipo.update({ nombre: req.body.nombre });
      return res.redirect(`/tipos?${aMensaje("Tipo actualizado")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("tipos/formulario", { tipo: { ...req.body, id_tpo: tipo.id_tpo }, action: `/tipos/${tipo.id_tpo}?_method=PUT`, method: "POST", errores: errs });
};

const eliminar = async (req, res) => {
  try {
    await Tipo.destroy({ where: { id_tpo: req.params.id } });
    res.redirect(`/tipos?${aMensaje("Tipo eliminado")}`);
  } catch (e) {
    res.redirect(`/tipos?${aMensaje("No se puede eliminar: hay especies de este tipo")}`);
  }
};

export { reglas, lista, verCrear, registrar, editar, actualizar, eliminar };
