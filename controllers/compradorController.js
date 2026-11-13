import { body } from "express-validator";
import { literal } from "sequelize";
import { Comprador, Compra, Lote, Especie, Tipo, Usuario } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje, aError } from "../helpers/utiles.js";
import { leerListado, consultarListado, combinarWhere } from "../helpers/listado.js";
import { condicionBusqueda } from "../helpers/busqueda.js";
import { condicionFiltros, filtroSiNo } from "../helpers/filtros.js";

const reglas = [
  body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio").isLength({ max: 15 }).withMessage("Nombre: máximo 15 caracteres"),
  body("apellido_paterno").trim().notEmpty().withMessage("El apellido paterno es obligatorio").isLength({ max: 15 }).withMessage("Apellido paterno: máximo 15 caracteres"),
  body("apellido_materno").trim().isLength({ max: 15 }).withMessage("Apellido materno: máximo 15 caracteres"),
  body("direccion").trim().isLength({ max: 200 }).withMessage("Dirección: máximo 200 caracteres"),
  body("correo").trim().isEmail().withMessage("Correo inválido").isLength({ max: 80 }).withMessage("Correo: máximo 80 caracteres"),
];

const datos = (b) => ({
  nombre: b.nombre,
  apellido_paterno: b.apellido_paterno,
  apellido_materno: b.apellido_materno || null,
  direccion: b.direccion || null,
  correo: b.correo,
});

const ORDEN = {
  codigo: "codigo_cpr",
  nombre: "apellido_paterno",
  correo: "correo",
  compras: literal("(SELECT COUNT(*) FROM compra WHERE compra.codigo_cpr = `Comprador`.`codigo_cpr`)"),
};

const FILTROS = {
  compras: filtroSiNo,
  correo: filtroSiNo,
};

const lista = async (req, res) => {
  const l = leerListado(req, {
    orden: ORDEN,
    ordenDefecto: { campo: "codigo", dir: "desc" },
    filtros: FILTROS,
  });
  await consultarListado(l, {
    modelo: Comprador,
    pk: "codigo_cpr",
    include: [{ model: Compra, as: "compras", attributes: ["id_cmp"] }],
    includeOrden: [],
    where: combinarWhere(
      await condicionBusqueda("compradores", l.q),
      await condicionFiltros("compradores", l.filtros),
    ),
    orden: ORDEN,
  });
  res.render("compradores/index", {
    l,
    compradores: l.filas,
    filtros: [
      {
        clave: "compras",
        etiqueta: "Compras",
        tipo: "select",
        opciones: [
          { valor: "con", texto: "Con compras" },
          { valor: "sin", texto: "Sin compras" },
        ],
      },
      {
        clave: "correo",
        etiqueta: "Correo",
        tipo: "select",
        opciones: [
          { valor: "con", texto: "Con correo" },
          { valor: "sin", texto: "Sin correo" },
        ],
      },
    ],
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

const verCrear = (req, res) => res.render("compradores/formulario", { comprador: null, action: "/compradores", errores: [] });

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await Comprador.create(datos(req.body));
      return res.redirect(`/compradores?${aMensaje("Comprador registrado")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("compradores/formulario", { comprador: req.body, action: "/compradores", errores: errs });
};

const editar = async (req, res) => {
  const comprador = await Comprador.findByPk(req.params.id);
  if (!comprador) return res.redirect("/compradores");
  res.render("compradores/formulario", { comprador, action: `/compradores/${comprador.codigo_cpr}?_method=PUT`, errores: [] });
};

/** Detalle de solo lectura: contacto, indicadores y compras del comprador. */
const detalle = async (req, res) => {
  const comprador = await Comprador.findByPk(req.params.id, {
    include: [
      {
        model: Compra,
        as: "compras",
        include: [
          {
            model: Lote,
            as: "lote",
            include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }],
          },
        ],
      },
      {
        model: Usuario,
        as: "cuenta",
        attributes: ["id", "usuario", "correo", "email_verificado", "activo"],
      },
    ],
  });
  if (!comprador) return res.redirect(`/compradores?${aError("No se encontró el registro")}`);

  const compras = (comprador.compras || []).slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const kilos = compras.reduce((suma, c) => suma + Number(c.lote?.kilos || 0), 0);
  const total = compras.reduce((suma, c) => suma + Number(c.precio_total || 0), 0);

  res.render("compradores/detalle", {
    comprador,
    compras,
    kilos,
    total,
    ultima: compras.length ? compras[0].fecha : null,
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

const actualizar = async (req, res) => {
  const comprador = await Comprador.findByPk(req.params.id);
  if (!comprador) return res.redirect("/compradores");
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      await comprador.update(datos(req.body));
      return res.redirect(`/compradores?${aMensaje("Comprador actualizado")}`);
    } catch (e) { errs.push(mensajeBD(e)); }
  }
  res.status(400).render("compradores/formulario", { comprador: { ...req.body, codigo_cpr: comprador.codigo_cpr }, action: `/compradores/${comprador.codigo_cpr}?_method=PUT`, errores: errs });
};

const eliminar = async (req, res) => {
  try {
    await Comprador.destroy({ where: { codigo_cpr: req.params.id } });
    res.redirect(`/compradores?${aMensaje("Comprador eliminado")}`);
  } catch {
    res.redirect(`/compradores?${aMensaje("No se puede eliminar: el comprador tiene compras registradas")}`);
  }
};

export { reglas, lista, verCrear, registrar, detalle, editar, actualizar, eliminar };
