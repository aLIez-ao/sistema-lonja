import { body } from "express-validator";
import { Op } from "sequelize";
import { Compra, Lote, Comprador, Especie, Tipo } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";
import { redondea } from "../helpers/fechas.js";

const reglas = [
  body("precio_kilo_final").isFloat({ gt: 0, max: 99999999 }).withMessage("El precio final por kilo debe ser un número mayor a 0"),
  body("codigo_cpr").isInt({ min: 1 }).withMessage("Selecciona un comprador"),
];
const reglasAlta = [body("id_cmp").isInt({ min: 1 }).withMessage("Selecciona un lote"), ...reglas];

const incluye = [
  { model: Comprador, as: "comprador" },
  { model: Lote, as: "lote", include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }] },
];

/** Lotes que aún no tienen compra (+ el lote indicado, útil al editar). */
const lotesDisponibles = async (incluirId) => {
  const vendidos = (await Compra.findAll({ attributes: ["id_cmp"] })).map((c) => c.id_cmp).filter((id) => String(id) !== String(incluirId));
  const where = vendidos.length ? { id_lte: { [Op.notIn]: vendidos } } : {};
  return Lote.findAll({ where, order: [["id_lte", "DESC"]], include: [{ model: Especie, as: "especies" }] });
};

const catalogos = async (incluirId) => ({
  lotes: await lotesDisponibles(incluirId),
  compradores: await Comprador.findAll({ order: [["apellido_paterno", "ASC"], ["nombre", "ASC"]] }),
});

const lista = async (req, res) => {
  const compras = await Compra.findAll({ order: [["fecha", "DESC"]], limit: 200, include: incluye });
  res.render("compras/index", { compras, mensaje: req.query.mensaje });
};

const verCrear = async (req, res) => {
  const compra = req.query.lote ? { id_cmp: req.query.lote } : null;
  res.render("compras/formulario", { compra, editando: false, action: "/compras", errores: [], ...(await catalogos()) });
};

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      const lote = await Lote.findByPk(req.body.id_cmp);
      if (!lote) errs.push("El lote no existe");
      else if (await Compra.findOne({ where: { id_cmp: lote.id_lte } })) errs.push("Ese lote ya fue comprado");
      else if (!(await Comprador.findByPk(req.body.codigo_cpr))) errs.push("El comprador no existe");
      else {
        const precio = Number(req.body.precio_kilo_final);
        // El total SIEMPRE se calcula en el servidor: kilos del lote x precio final por kilo
        await Compra.create({
          id_cmp: lote.id_lte,
          codigo_cpr: req.body.codigo_cpr,
          precio_kilo_final: precio,
          precio_total: redondea(Number(lote.kilos) * precio),
        });
        return res.redirect(`/compras?${aMensaje("Compra registrada")}`);
      }
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("compras/formulario", { compra: req.body, editando: false, action: "/compras", errores: errs, ...(await catalogos()) });
};

const editar = async (req, res) => {
  const compra = await Compra.findOne({ where: { id_cmp: req.params.id } });
  if (!compra) return res.redirect("/compras");
  res.render("compras/formulario", { compra, editando: true, action: `/compras/${compra.id_cmp}?_method=PUT`, errores: [], ...(await catalogos(compra.id_cmp)) });
};

const actualizar = async (req, res) => {
  const compra = await Compra.findOne({ where: { id_cmp: req.params.id }, include: [{ model: Lote, as: "lote" }] });
  if (!compra) return res.redirect("/compras");
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      if (!(await Comprador.findByPk(req.body.codigo_cpr))) errs.push("El comprador no existe");
      else {
        const precio = Number(req.body.precio_kilo_final);
        // Update por consulta porque codigo_cpr forma parte de la llave primaria compuesta
        await Compra.update(
          { codigo_cpr: req.body.codigo_cpr, precio_kilo_final: precio, precio_total: redondea(Number(compra.lote.kilos) * precio) },
          { where: { id_cmp: compra.id_cmp } },
        );
        return res.redirect(`/compras?${aMensaje("Compra actualizada")}`);
      }
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("compras/formulario", { compra: { ...req.body, id_cmp: compra.id_cmp }, editando: true, action: `/compras/${compra.id_cmp}?_method=PUT`, errores: errs, ...(await catalogos(compra.id_cmp)) });
};

const eliminar = async (req, res) => {
  await Compra.destroy({ where: { id_cmp: req.params.id } });
  res.redirect(`/compras?${aMensaje("Compra eliminada")}`);
};

export { reglas, reglasAlta, lista, verCrear, registrar, editar, actualizar, eliminar };
