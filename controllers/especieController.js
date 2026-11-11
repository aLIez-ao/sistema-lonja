import { body } from "express-validator";
import { col } from "sequelize";
import { Especie, Lote, Tipo } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";
import { leerListado, consultarListado, combinarWhere } from "../helpers/listado.js";
import { condicionBusqueda } from "../helpers/busqueda.js";
import { condicionFiltros, filtroEntero, filtroLista } from "../helpers/filtros.js";

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
    include: [{ model: Tipo, as: "tipo" }, { model: Lote, as: "lote" }],
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
  });
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
