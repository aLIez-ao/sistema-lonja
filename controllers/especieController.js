import { body } from "express-validator";
import { col, Op } from "sequelize";
import { Especie, EspecieCatalogo, Lote, Tipo, Compra } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje, aError } from "../helpers/utiles.js";
import { leerListado, consultarListado, combinarWhere } from "../helpers/listado.js";
import { condicionBusqueda } from "../helpers/busqueda.js";
import { condicionFiltros, filtroEntero, filtroLista } from "../helpers/filtros.js";
import { LoteVendidoError, exigirLoteNoVendido, responderErrorLote } from "../helpers/lotes.js";

const reglas = [
  body("id_lte").isInt({ min: 1 }).withMessage("Selecciona un lote"),
  body("id_cat").isInt({ min: 1 }).withMessage("Selecciona una especie del catálogo"),
];

const ORDEN = {
  id: "id_epe",
  nombre: "nombre",
  tipo: col("tipo.nombre"),
  lote: "id_lte",
};

const FILTROS = {
  tipo: filtroEntero,
  estado: filtroLista("disponibles", "vendidos"),
};

const lista = async (req, res) => {
  const l = leerListado(req, {
    orden: ORDEN,
    ordenDefecto: { campo: "id", dir: "desc" },
    filtros: FILTROS,
  });
  const tipos = await Tipo.findAll({ order: [["nombre", "ASC"]] });
  await consultarListado(l, {
    modelo: Especie,
    pk: "id_epe",
    include: [{ model: Tipo, as: "tipo" }, { model: Lote, as: "lote", include: [{ model: Compra, as: "compra" }] }],
    includeOrden: [{ model: Tipo, as: "tipo" }],
    where: combinarWhere(
      await condicionBusqueda("especies", l.q),
      await condicionFiltros("especies", l.filtros),
    ),
    orden: ORDEN,
  });
  res.render("especies/index", {
    l,
    especies: l.filas,
    filtros: [
      {
        clave: "tipo",
        etiqueta: "Tipo",
        tipo: "select",
        opciones: tipos.map((tp) => ({ valor: tp.id_tpo, texto: tp.nombre })),
      },
      {
        clave: "estado",
        etiqueta: "Estado del lote",
        tipo: "select",
        opciones: [
          { valor: "disponibles", texto: "Disponible" },
          { valor: "vendidos", texto: "Vendido" },
        ],
      },
    ],
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

/** Lotes sin compra; el lote actual se conserva al editar. */
const lotesDisponibles = async (incluirId) => {
  const vendidos = (await Compra.findAll({ attributes: ["id_cmp"], raw: true })).map((c) => c.id_cmp);
  const excluir = vendidos.filter((id) => String(id) !== String(incluirId));
  const where = excluir.length ? { id_lte: { [Op.notIn]: excluir } } : {};
  return Lote.findAll({
    where,
    order: [["id_lte", "DESC"]],
    include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }],
  });
};

const catalogos = async ({ loteId, catId } = {}) => {
  const where = catId ? { [Op.or]: [{ activo: true }, { id_cat: catId }] } : { activo: true };
  const [lotes, catalogo, tipos] = await Promise.all([
    lotesDisponibles(loteId),
    EspecieCatalogo.findAll({ where, include: [{ model: Tipo, as: "tipo" }], order: [["nombre", "ASC"]] }),
    Tipo.findAll({ order: [["nombre", "ASC"]] }),
  ]);
  return { lotes, catalogo, tipos };
};

const verCrear = async (req, res) => {
  if (req.query.lote) {
    try {
      await exigirLoteNoVendido(req.query.lote);
    } catch (e) {
      return responderErrorLote(res, e, { volver: `/lotes/${req.query.lote}` });
    }
  }
  const especie = req.query.lote ? { id_lte: req.query.lote } : null;
  res.render("especies/formulario", {
    especie,
    action: "/especies",
    errores: [],
    mensaje: req.query.mensaje,
    ...(await catalogos({ loteId: req.query.lote })),
  });
};

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await exigirLoteNoVendido(req.body.id_lte);
      const catalogo = await EspecieCatalogo.findByPk(req.body.id_cat);
      if (!catalogo) errs.push("La especie no existe en el catálogo");
      else if (!catalogo.activo) errs.push("La especie está desactivada en el catálogo");
      else if (await Especie.findOne({ where: { id_lte: req.body.id_lte, id_cat: catalogo.id_cat } })) {
        errs.push("Ese lote ya tiene registrada esta especie");
      } else {
        await Especie.create({
          id_lte: req.body.id_lte,
          id_cat: catalogo.id_cat,
          nombre: catalogo.nombre,
          id_tpo: catalogo.id_tpo,
          imagen: catalogo.imagen,
        });
        return res.redirect(`/especies?${aMensaje("Especie registrada")}`);
      }
    } catch (e) {
      if (e instanceof LoteVendidoError) return responderErrorLote(res, e, { volver: `/lotes/${req.body.id_lte}` });
      errs.push(e?.codigo ? e.message : mensajeBD(e));
    }
  }
  res.status(400).render("especies/formulario", {
    especie: req.body,
    action: "/especies",
    errores: errs,
    mensaje: null,
    ...(await catalogos({ loteId: req.body.id_lte, catId: req.body.id_cat })),
  });
};

const editar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id, {
    include: [{ model: Lote, as: "lote", include: [{ model: Compra, as: "compra" }] }],
  });
  if (!especie) return res.redirect(`/especies?${aError("No se encontró el registro")}`);
  if (especie.lote?.compra) {
    return res.redirect(`/lotes/${especie.id_lte}?${aError(new LoteVendidoError().message)}`);
  }
  res.render("especies/formulario", {
    especie,
    action: `/especies/${especie.id_epe}?_method=PUT`,
    errores: [],
    mensaje: null,
    ...(await catalogos({ loteId: especie.id_lte, catId: especie.id_cat })),
  });
};

/** Detalle de solo lectura: datos, tipo, lote y estado del lote. */
const detalle = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id, {
    include: [
      { model: Tipo, as: "tipo" },
      { model: EspecieCatalogo, as: "catalogo" },
      { model: Lote, as: "lote", include: [{ model: Compra, as: "compra" }] },
    ],
  });
  if (!especie) return res.redirect(`/especies?${aError("No se encontró el registro")}`);
  res.render("especies/detalle", {
    especie,
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

const actualizar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id, {
    include: [{ model: Lote, as: "lote", include: [{ model: Compra, as: "compra" }] }],
  });
  if (!especie) return res.redirect(`/especies?${aError("No se encontró el registro")}`);
  if (especie.lote?.compra) {
    return res.redirect(`/lotes/${especie.id_lte}?${aError(new LoteVendidoError().message)}`);
  }

  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await exigirLoteNoVendido(req.body.id_lte);
      const catalogo = await EspecieCatalogo.findByPk(req.body.id_cat);
      if (!catalogo) errs.push("La especie no existe en el catálogo");
      else if (!catalogo.activo) errs.push("La especie está desactivada en el catálogo");
      else {
        const repetida = await Especie.findOne({ where: { id_lte: req.body.id_lte, id_cat: catalogo.id_cat } });
        if (repetida && repetida.id_epe !== especie.id_epe) errs.push("Ese lote ya tiene registrada esta especie");
        else {
          await especie.update({
            id_lte: req.body.id_lte,
            id_cat: catalogo.id_cat,
            nombre: catalogo.nombre,
            id_tpo: catalogo.id_tpo,
            imagen: catalogo.imagen,
          });
          return res.redirect(`/especies?${aMensaje("Especie actualizada")}`);
        }
      }
    } catch (e) {
      if (e instanceof LoteVendidoError) return responderErrorLote(res, e, { volver: `/lotes/${req.body.id_lte}` });
      errs.push(e?.codigo ? e.message : mensajeBD(e));
    }
  }
  res.status(400).render("especies/formulario", {
    especie: { ...req.body, id_epe: especie.id_epe },
    action: `/especies/${especie.id_epe}?_method=PUT`,
    errores: errs,
    mensaje: null,
    ...(await catalogos({ loteId: req.body.id_lte, catId: req.body.id_cat })),
  });
};

const eliminar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id, {
    include: [{ model: Lote, as: "lote", include: [{ model: Compra, as: "compra" }] }],
  });
  if (!especie) return res.redirect(`/especies?${aMensaje("La especie ya no existe")}`);
  if (especie.lote?.compra) {
    return responderErrorLote(res, new LoteVendidoError(), { volver: `/lotes/${especie.id_lte}` });
  }
  await especie.destroy();
  res.redirect(`/especies?${aMensaje("Especie eliminada")}`);
};

export { reglas, lista, verCrear, registrar, detalle, editar, actualizar, eliminar };
