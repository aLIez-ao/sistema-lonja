import path from "path";
import { fileURLToPath } from "url";
import { body } from "express-validator";
import { col, fn, where as sqlWhere } from "sequelize";
import { Especie, EspecieCatalogo, Tipo } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje, aError } from "../helpers/utiles.js";
import { leerListado, consultarListado, combinarWhere } from "../helpers/listado.js";
import { condicionBusqueda } from "../helpers/busqueda.js";
import { condicionFiltros, filtroEntero, filtroLista } from "../helpers/filtros.js";
import { borrarImagen, guardarImagenDataURL } from "../helpers/imagenes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_ESPECIES = path.join(__dirname, "..", "public", "uploads", "especies");
const URL_ESPECIES = "/uploads/especies/";

const reglas = [
  body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio").isLength({ max: 40 }).withMessage("Nombre: máximo 40 caracteres"),
  body("id_tpo").isInt({ min: 1 }).withMessage("Selecciona un tipo"),
  body("descripcion").trim().isLength({ max: 300 }).withMessage("Descripción: máximo 300 caracteres"),
];

const esJSON = (req) => String(req.get("accept") || "").includes("application/json") || req.xhr;

/** Busca un catálogo por nombre sin distinguir mayúsculas (excluyendo un id al editar). */
const catalogoPorNombre = async (nombre, exceptoId) => {
  const filas = await EspecieCatalogo.findAll({ where: sqlWhere(fn("LOWER", col("nombre")), String(nombre).trim().toLowerCase()) });
  return filas.find((f) => String(f.id_cat) !== String(exceptoId)) || null;
};

/** Guarda o reemplaza la imagen del catálogo a partir de los campos del formulario. */
async function aplicarImagen(catalogo, b) {
  const opciones = { dir: DIR_ESPECIES, urlBase: URL_ESPECIES, prefijo: "cat", maxBytes: 280 * 1024 };
  let url = catalogo?.imagen || null;
  if (b.imagen_data) {
    const nueva = await guardarImagenDataURL(b.imagen_data, opciones);
    if (url) await borrarImagen(url, opciones);
    url = nueva;
  } else if (b.imagen_quitar) {
    if (url) await borrarImagen(url, opciones);
    url = null;
  }
  return url;
}

const ORDEN = {
  id: "id_cat",
  nombre: "nombre",
  tipo: col("tipo.nombre"),
  activo: "activo",
};

const FILTROS = {
  tipo: filtroEntero,
  activo: filtroLista("activo", "inactivo"),
};

const lista = async (req, res) => {
  const l = leerListado(req, {
    orden: ORDEN,
    ordenDefecto: { campo: "nombre", dir: "asc" },
    filtros: FILTROS,
  });
  const tipos = await Tipo.findAll({ order: [["nombre", "ASC"]] });
  await consultarListado(l, {
    modelo: EspecieCatalogo,
    pk: "id_cat",
    include: [{ model: Tipo, as: "tipo" }],
    where: combinarWhere(
      await condicionBusqueda("catalogo", l.q),
      await condicionFiltros("catalogo", l.filtros),
    ),
    orden: ORDEN,
  });

  // Cuántas especies de lote usan cada catálogo
  const uso = new Map();
  if (l.filas.length) {
    const filas = await Especie.findAll({
      attributes: ["id_cat"],
      where: { id_cat: l.filas.map((f) => f.id_cat) },
      raw: true,
    });
    for (const f of filas) uso.set(String(f.id_cat), (uso.get(String(f.id_cat)) || 0) + 1);
  }

  res.render("catalogo/index", {
    l,
    catalogo: l.filas,
    uso,
    filtros: [
      {
        clave: "tipo",
        etiqueta: "Tipo",
        tipo: "select",
        opciones: tipos.map((tp) => ({ valor: tp.id_tpo, texto: tp.nombre })),
      },
      {
        clave: "activo",
        etiqueta: "Estado",
        tipo: "select",
        opciones: [
          { valor: "activo", texto: "Activo" },
          { valor: "inactivo", texto: "Inactivo" },
        ],
      },
    ],
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

const verCrear = async (req, res) => {
  res.render("catalogo/formulario", {
    item: null,
    action: "/catalogo",
    errores: [],
    tipos: await Tipo.findAll({ order: [["nombre", "ASC"]] }),
  });
};

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      if (!(await Tipo.findByPk(req.body.id_tpo))) errs.push("El tipo no existe");
      else if (await catalogoPorNombre(req.body.nombre)) errs.push("Ya existe una especie con ese nombre en el catálogo");
      else {
        const item = await EspecieCatalogo.create({
          nombre: req.body.nombre.trim(),
          id_tpo: req.body.id_tpo,
          descripcion: req.body.descripcion?.trim() || null,
          imagen: await aplicarImagen(null, req.body),
          activo: true,
        });
        const conTipo = await EspecieCatalogo.findByPk(item.id_cat, { include: [{ model: Tipo, as: "tipo" }] });
        if (esJSON(req)) {
          return res.status(201).json({
            ok: true,
            especie: {
              id_cat: conTipo.id_cat,
              nombre: conTipo.nombre,
              id_tpo: conTipo.id_tpo,
              imagen: conTipo.imagen,
              tipo: conTipo.tipo.nombre,
            },
          });
        }
        return res.redirect(`/catalogo?${aMensaje("Especie agregada al catálogo")}`);
      }
    } catch (e) {
      errs.push(mensajeBD(e));
    }
  }

  if (esJSON(req)) return res.status(400).json({ ok: false, errores: errs });
  res.status(400).render("catalogo/formulario", {
    item: req.body,
    action: "/catalogo",
    errores: errs,
    tipos: await Tipo.findAll({ order: [["nombre", "ASC"]] }),
  });
};

const editar = async (req, res) => {
  const item = await EspecieCatalogo.findByPk(req.params.id);
  if (!item) return res.redirect(`/catalogo?${aError("No se encontró la especie")}`);
  res.render("catalogo/formulario", {
    item,
    action: `/catalogo/${item.id_cat}?_method=PUT`,
    errores: [],
    tipos: await Tipo.findAll({ order: [["nombre", "ASC"]] }),
  });
};

const actualizar = async (req, res) => {
  const item = await EspecieCatalogo.findByPk(req.params.id);
  if (!item) return res.redirect(`/catalogo?${aError("No se encontró la especie")}`);
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      if (!(await Tipo.findByPk(req.body.id_tpo))) errs.push("El tipo no existe");
      else if (await catalogoPorNombre(req.body.nombre, item.id_cat)) errs.push("Ya existe una especie con ese nombre en el catálogo");
      else {
        const imagen = await aplicarImagen(item, req.body);
        await item.update({
          nombre: req.body.nombre.trim(),
          id_tpo: req.body.id_tpo,
          descripcion: req.body.descripcion?.trim() || null,
          imagen,
        });
        return res.redirect(`/catalogo?${aMensaje("Especie del catálogo actualizada")}`);
      }
    } catch (e) {
      errs.push(mensajeBD(e));
    }
  }
  res.status(400).render("catalogo/formulario", {
    item: { ...req.body, id_cat: item.id_cat, imagen: item.imagen },
    action: `/catalogo/${item.id_cat}?_method=PUT`,
    errores: errs,
    tipos: await Tipo.findAll({ order: [["nombre", "ASC"]] }),
  });
};

/** Borrar = desactivar: las especies ya capturadas conservan su copia. */
const desactivar = async (req, res) => {
  const item = await EspecieCatalogo.findByPk(req.params.id);
  if (!item) return res.redirect(`/catalogo?${aError("No se encontró la especie")}`);
  await item.update({ activo: false });
  const usos = await Especie.count({ where: { id_cat: item.id_cat } });
  res.redirect(`/catalogo?${aMensaje(usos ? "La especie está en uso: se desactivó para nuevos lotes" : "Especie desactivada del catálogo")}`);
};

const reactivar = async (req, res) => {
  const item = await EspecieCatalogo.findByPk(req.params.id);
  if (!item) return res.redirect(`/catalogo?${aError("No se encontró la especie")}`);
  await item.update({ activo: true });
  res.redirect(`/catalogo?${aMensaje("Especie reactivada")}`);
};

export {
  DIR_ESPECIES,
  URL_ESPECIES,
  reglas,
  lista,
  verCrear,
  registrar,
  editar,
  actualizar,
  desactivar,
  reactivar,
};
