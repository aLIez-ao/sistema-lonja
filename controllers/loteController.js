import { body } from "express-validator";
import { literal, Op } from "sequelize";
import db from "../config/db.js";
import { Lote, Especie, EspecieCatalogo, Tipo, Compra, Comprador } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje, aError } from "../helpers/utiles.js";
import { leerListado, consultarListado, combinarWhere } from "../helpers/listado.js";
import { condicionBusqueda } from "../helpers/busqueda.js";
import { condicionFiltros, filtroEntero, filtroFecha, filtroLista, filtroNumero } from "../helpers/filtros.js";
import {
  LoteVendidoError,
  exigirLoteNoVendido,
  idsEspecies,
  responderErrorLote,
  sincronizarEspecies,
} from "../helpers/lotes.js";

const reglas = [
  body("kilos").isFloat({ gt: 0, max: 99999999 }).withMessage("Los kilos deben ser un número mayor a 0"),
  body("numero_cajas").isInt({ min: 0, max: 32767 }).withMessage("El número de cajas debe ser un entero entre 0 y 32767"),
  body("precio_kilo_salida").isFloat({ min: 0, max: 99999999 }).withMessage("El precio de salida por kilo debe ser un número mayor o igual a 0"),
  body("especies").isArray({ min: 1 }).withMessage("Selecciona al menos una especie para el lote"),
];

/** Convierte "1,2" (o un único valor) en arreglo antes de validar. */
const normalizarEspecies = (req, res, next) => {
  req.body.especies = idsEspecies(req.body.especies);
  next();
};

const datos = (b) => ({ kilos: b.kilos, numero_cajas: b.numero_cajas, precio_kilo_salida: b.precio_kilo_salida });

const ORDEN = {
  id: "id_lte",
  fecha: "fecha",
  kilos: "kilos",
  cajas: "numero_cajas",
  salida: "precio_kilo_salida",
  estado: literal("(SELECT COUNT(*) FROM compra WHERE compra.id_cmp = `Lote`.`id_lte`)"),
};

const FILTROS = {
  estado: filtroLista("disponibles", "vendidos"),
  desde: filtroFecha,
  hasta: filtroFecha,
  tipo: filtroEntero,
  kilosMin: filtroNumero,
  kilosMax: filtroNumero,
};

const lista = async (req, res) => {
  const l = leerListado(req, {
    orden: ORDEN,
    ordenDefecto: { campo: "id", dir: "desc" },
    filtros: FILTROS,
  });
  const tipos = await Tipo.findAll({ order: [["nombre", "ASC"]] });
  await consultarListado(l, {
    modelo: Lote,
    pk: "id_lte",
    include: [
      { model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] },
      { model: Compra, as: "compra", include: [{ model: Comprador, as: "comprador" }] },
    ],
    includeOrden: [],
    where: combinarWhere(
      await condicionBusqueda("lotes", l.q),
      await condicionFiltros("lotes", l.filtros),
    ),
    orden: ORDEN,
  });
  res.render("lotes/index", {
    l,
    lotes: l.filas,
    filtros: [
      {
        clave: "estado",
        etiqueta: "Estado",
        tipo: "select",
        opciones: [
          { valor: "disponibles", texto: "Disponibles" },
          { valor: "vendidos", texto: "Vendidos" },
        ],
      },
      { clave: "desde", etiqueta: "Desde", tipo: "fecha" },
      { clave: "hasta", etiqueta: "Hasta", tipo: "fecha" },
      {
        clave: "tipo",
        etiqueta: "Tipo de especie",
        tipo: "select",
        opciones: tipos.map((tp) => ({ valor: tp.id_tpo, texto: tp.nombre })),
      },
      { clave: "kilosMin", etiqueta: "Kilos mínimo", tipo: "numero" },
      { clave: "kilosMax", etiqueta: "Kilos máximo", tipo: "numero" },
    ],
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

/** Catálogo activo + las especies que ya tenga el lote (aunque se hayan desactivado). */
const catalogos = async (idLte) => {
  const idsActuales = idLte
    ? (await Especie.findAll({ where: { id_lte: idLte }, attributes: ["id_cat"], raw: true }))
      .map((e) => e.id_cat)
      .filter(Boolean)
    : [];
  const where = idsActuales.length ? { [Op.or]: [{ activo: true }, { id_cat: { [Op.in]: idsActuales } }] } : { activo: true };

  const [catalogo, tipos] = await Promise.all([
    EspecieCatalogo.findAll({ where, include: [{ model: Tipo, as: "tipo" }], order: [["nombre", "ASC"]] }),
    Tipo.findAll({ order: [["nombre", "ASC"]] }),
  ]);
  return { catalogo, tipos, seleccion: idsActuales.map(String) };
};

const formulario = async (res, { lote, action, errores, idLte }) => {
  const { catalogo, tipos, seleccion } = await catalogos(idLte);
  // Al reenviar un formulario con errores se conservan las casillas marcadas.
  const marcadas = Array.isArray(lote?.especies) ? lote.especies.map(String) : seleccion;
  res.status(errores.length ? 400 : 200).render("lotes/formulario", {
    lote,
    action,
    errores,
    catalogo,
    tipos,
    seleccion: marcadas,
  });
};

const verCrear = async (req, res) => formulario(res, { lote: null, action: "/lotes", errores: [] });

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await db.transaction(async (t) => {
        const lote = await Lote.create(datos(req.body), { transaction: t });
        await sincronizarEspecies(lote.id_lte, req.body.especies, t);
      });
      return res.redirect(`/lotes?${aMensaje("Lote registrado con sus especies")}`);
    } catch (e) { errs.push(e?.codigo ? e.message : mensajeBD(e)); }
  }
  return formulario(res, {
    lote: { ...req.body, especies: idsEspecies(req.body.especies) },
    action: "/lotes",
    errores: errs,
  });
};

const editar = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id, { include: [{ model: Compra, as: "compra" }] });
  if (!lote) return res.redirect(`/lotes?${aError("No se encontró el registro")}`);
  if (lote.compra) {
    return res.redirect(`/lotes/${lote.id_lte}?${aError(new LoteVendidoError().message)}`);
  }
  return formulario(res, { lote, action: `/lotes/${lote.id_lte}?_method=PUT`, errores: [], idLte: lote.id_lte });
};

/** Detalle de solo lectura: datos, especies y estado de venta del lote. */
const detalle = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id, {
    include: [
      { model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] },
      { model: Compra, as: "compra", include: [{ model: Comprador, as: "comprador" }] },
    ],
  });
  if (!lote) return res.redirect(`/lotes?${aError("No se encontró el registro")}`);
  res.render("lotes/detalle", {
    lote,
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

const actualizar = async (req, res) => {
  let lote;
  try {
    lote = await exigirLoteNoVendido(req.params.id);
  } catch (e) {
    return responderErrorLote(res, e, { volver: `/lotes/${req.params.id}` });
  }

  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await db.transaction(async (t) => {
        await lote.update(datos(req.body), { transaction: t });
        await sincronizarEspecies(lote.id_lte, req.body.especies, t);
      });
      return res.redirect(`/lotes?${aMensaje("Lote actualizado")}`);
    } catch (e) { errs.push(e?.codigo ? e.message : mensajeBD(e)); }
  }
  return formulario(res, {
    lote: { ...req.body, id_lte: lote.id_lte, especies: idsEspecies(req.body.especies) },
    action: `/lotes/${lote.id_lte}?_method=PUT`,
    errores: errs,
    idLte: lote.id_lte,
  });
};

const eliminar = async (req, res) => {
  try {
    const lote = await exigirLoteNoVendido(req.params.id);
    await lote.destroy();
    res.redirect(`/lotes?${aMensaje("Lote eliminado")}`);
  } catch (e) {
    if (e instanceof LoteVendidoError) return responderErrorLote(res, e, { volver: `/lotes/${req.params.id}` });
    res.redirect(`/lotes?${aMensaje("No se puede eliminar: el lote ya fue comprado")}`);
  }
};

export { reglas, normalizarEspecies, lista, verCrear, registrar, detalle, editar, actualizar, eliminar };
