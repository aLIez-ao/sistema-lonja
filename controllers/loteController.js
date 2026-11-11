import { body } from "express-validator";
import { literal } from "sequelize";
import { Lote, Especie, Tipo, Compra, Comprador } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";
import { leerListado, consultarListado } from "../helpers/listado.js";

const reglas = [
  body("kilos").isFloat({ gt: 0, max: 99999999 }).withMessage("Los kilos deben ser un número mayor a 0"),
  body("numero_cajas").isInt({ min: 0, max: 32767 }).withMessage("El número de cajas debe ser un entero entre 0 y 32767"),
  body("precio_kilo_salida").isFloat({ min: 0, max: 99999999 }).withMessage("El precio de salida por kilo debe ser un número mayor o igual a 0"),
];

const datos = (b) => ({ kilos: b.kilos, numero_cajas: b.numero_cajas, precio_kilo_salida: b.precio_kilo_salida });

const ORDEN = {
  id: "id_lte",
  fecha: "fecha",
  kilos: "kilos",
  cajas: "numero_cajas",
  salida: "precio_kilo_salida",
  estado: literal("(SELECT COUNT(*) FROM compra WHERE compra.id_cmp = `Lote`.`id_lte`)"),
};

const lista = async (req, res) => {
  const l = leerListado(req, {
    orden: ORDEN,
    ordenDefecto: { campo: "id", dir: "desc" },
  });
  await consultarListado(l, {
    modelo: Lote,
    pk: "id_lte",
    include: [
      { model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] },
      { model: Compra, as: "compra", include: [{ model: Comprador, as: "comprador" }] },
    ],
    includeOrden: [],
    orden: ORDEN,
  });
  res.render("lotes/index", { l, lotes: l.filas, mensaje: req.query.mensaje });
};

const verCrear = (req, res) => res.render("lotes/formulario", { lote: null, action: "/lotes", errores: [] });

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      const lote = await Lote.create(datos(req.body));
      // Siguiente paso natural: registrar las especies que trae el lote
      return res.redirect(`/especies/crear?lote=${lote.id_lte}&${aMensaje("Lote registrado. Agrega las especies que contiene")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("lotes/formulario", { lote: req.body, action: "/lotes", errores: errs });
};

const editar = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id, { include: [{ model: Compra, as: "compra" }] });
  if (!lote) return res.redirect("/lotes");
  res.render("lotes/formulario", { lote, action: `/lotes/${lote.id_lte}?_method=PUT`, errores: [] });
};

const actualizar = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id, { include: [{ model: Compra, as: "compra" }] });
  if (!lote) return res.redirect("/lotes");
  const errs = mensajesError(req);
  // Un lote ya comprado no se modifica: cambiaría el total cobrado
  if (lote.compra) errs.push("El lote ya fue comprado y no puede modificarse");
  if (!errs.length) {
    try {
      await lote.update(datos(req.body));
      return res.redirect(`/lotes?${aMensaje("Lote actualizado")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("lotes/formulario", { lote: { ...req.body, id_lte: lote.id_lte, compra: lote.compra }, action: `/lotes/${lote.id_lte}?_method=PUT`, errores: errs });
};

const eliminar = async (req, res) => {
  try {
    await Lote.destroy({ where: { id_lte: req.params.id } });
    res.redirect(`/lotes?${aMensaje("Lote eliminado")}`);
  } catch {
    res.redirect(`/lotes?${aMensaje("No se puede eliminar: el lote ya fue comprado")}`);
  }
};

export { reglas, lista, verCrear, registrar, editar, actualizar, eliminar };
