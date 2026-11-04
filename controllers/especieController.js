import { body } from "express-validator";
import { Especie, Lote, Tipo } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";

const reglas = [
  body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio").isLength({ max: 25 }).withMessage("Nombre: máximo 25 caracteres"),
  body("id_lte").isInt({ min: 1 }).withMessage("Selecciona un lote"),
  body("id_tpo").isInt({ min: 1 }).withMessage("Selecciona un tipo"),
  body("imagen").trim().isLength({ max: 100 }).withMessage("Imagen: máximo 100 caracteres"),
];

const datos = (b) => ({ nombre: b.nombre, id_lte: b.id_lte, id_tpo: b.id_tpo, imagen: b.imagen || null });

const catalogos = async () => ({
  lotes: await Lote.findAll({ order: [["id_lte", "DESC"]] }),
  tipos: await Tipo.findAll({ order: [["nombre", "ASC"]] }),
});

const lista = async (req, res) => {
  const especies = await Especie.findAll({ order: [["id_epe", "DESC"]], include: [{ model: Tipo, as: "tipo" }, { model: Lote, as: "lote" }] });
  res.render("especies/index", { especies, mensaje: req.query.mensaje });
};

const verCrear = async (req, res) => {
  const especie = req.query.lote ? { id_lte: req.query.lote } : null;
  res.render("especies/formulario", { especie, action: "/especies", errores: [], mensaje: req.query.mensaje, ...(await catalogos()) });
};

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await Especie.create(datos(req.body));
      return res.redirect(`/especies?${aMensaje("Especie registrada")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("especies/formulario", { especie: req.body, action: "/especies", errores: errs, mensaje: null, ...(await catalogos()) });
};

const editar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id);
  if (!especie) return res.redirect("/especies");
  res.render("especies/formulario", { especie, action: `/especies/${especie.id_epe}?_method=PUT`, errores: [], mensaje: null, ...(await catalogos()) });
};

const actualizar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id);
  if (!especie) return res.redirect("/especies");
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await especie.update(datos(req.body));
      return res.redirect(`/especies?${aMensaje("Especie actualizada")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("especies/formulario", { especie: { ...req.body, id_epe: especie.id_epe }, action: `/especies/${especie.id_epe}?_method=PUT`, errores: errs, mensaje: null, ...(await catalogos()) });
};

const eliminar = async (req, res) => {
  await Especie.destroy({ where: { id_epe: req.params.id } });
  res.redirect(`/especies?${aMensaje("Especie eliminada")}`);
};

export { reglas, lista, verCrear, registrar, editar, actualizar, eliminar };
