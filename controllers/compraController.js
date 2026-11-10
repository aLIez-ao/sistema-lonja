import { body } from "express-validator";
import { Op } from "sequelize";
import { Compra, Lote, Comprador, Especie, Tipo } from "../models/index.js";
import { mensajesError, mensajeBD, aMensaje } from "../helpers/utiles.js";
import { redondea } from "../helpers/fechas.js";
import { generarFacturaPDF } from "../helpers/facturaPdf.js";
import { enviarEmailComprobanteCompra } from "../helpers/email.js";

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
  return Lote.findAll({ where, order: [["id_lte", "DESC"]], include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }] });
};

const catalogos = async (incluirId) => ({
  lotes: await lotesDisponibles(incluirId),
  compradores: await Comprador.findAll({ order: [["apellido_paterno", "ASC"], ["nombre", "ASC"]] }),
});

const lista = async (req, res) => {
  const compras = await Compra.findAll({ order: [["fecha", "DESC"]], limit: 200, include: incluye });
  res.render("compras/index", { compras, mensaje: req.query.mensaje, error: req.query.error });
};

const verCrear = async (req, res) => {
  const compra = req.query.lote ? { id_cmp: req.query.lote } : null;
  res.render("compras/formulario", { compra, editando: false, action: "/compras", errores: [], ...(await catalogos()) });
};

const registrar = async (req, res) => {
  const errs = mensajesError(req);
  if (!errs.length) {
    try {
      const lote = await Lote.findByPk(req.body.id_cmp, {
        include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }],
      });
      if (!lote) errs.push("El lote no existe");
      else if (await Compra.findOne({ where: { id_cmp: lote.id_lte } })) errs.push("Ese lote ya fue comprado");
      else {
        const comprador = await Comprador.findByPk(req.body.codigo_cpr);
        if (!comprador) errs.push("El comprador no existe");
        else {
          const precio = Number(req.body.precio_kilo_final);
          const total = redondea(Number(lote.kilos) * precio);

          const nuevaCompra = await Compra.create({
            id_cmp: lote.id_lte,
            codigo_cpr: req.body.codigo_cpr,
            precio_kilo_final: precio,
            precio_total: total,
          });

          // Si el comprador tiene correo, enviar comprobante / factura opcional o automáticamente
          if (comprador.correo) {
            try {
              nuevaCompra.lote = lote;
              const pdfBuffer = await generarFacturaPDF(nuevaCompra);
              await enviarEmailComprobanteCompra({
                compra: nuevaCompra,
                comprador,
                pdfBuffer,
                folio: nuevaCompra.id_cmp,
              });
            } catch (errEmail) {
              console.warn("Aviso: no se pudo enviar correo de compra:", errEmail.message);
            }
          }

          return res.redirect(`/compras/${nuevaCompra.id_cmp}/factura?${aMensaje("Compra registrada y factura generada con éxito")}`);
        }
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

/**
 * Vista de presentación oficial de Factura
 */
const verFactura = async (req, res) => {
  const compra = await Compra.findOne({
    where: { id_cmp: req.params.id },
    include: incluye,
  });

  if (!compra) return res.redirect("/compras");

  res.render("compras/factura", {
    compra,
    mensaje: req.query.mensaje,
    error: req.query.error,
  });
};

/**
 * Descarga de factura en PDF oficial
 */
const descargarFacturaPdf = async (req, res) => {
  const compra = await Compra.findOne({
    where: { id_cmp: req.params.id },
    include: incluye,
  });

  if (!compra) return res.status(404).send("Compra no encontrada");

  try {
    const pdfBuffer = await generarFacturaPDF(compra);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Factura-Lonja-Lote-${compra.id_cmp}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error al generar PDF de factura:", err);
    res.status(500).send("Error interno al generar factura PDF");
  }
};

/**
 * Envío de factura por correo electrónico al comprador
 */
const enviarFacturaPorCorreo = async (req, res) => {
  const compra = await Compra.findOne({
    where: { id_cmp: req.params.id },
    include: incluye,
  });

  if (!compra) return res.redirect("/compras");

  if (!compra.comprador?.correo) {
    return res.redirect(`/compras/${compra.id_cmp}/factura?error=${encodeURIComponent("El comprador no tiene un correo registrado en el sistema")}`);
  }

  try {
    const pdfBuffer = await generarFacturaPDF(compra);
    const resultado = await enviarEmailComprobanteCompra({
      compra,
      comprador: compra.comprador,
      pdfBuffer,
      folio: compra.id_cmp,
    });

    if (resultado.ok || resultado.simulado) {
      return res.redirect(`/compras/${compra.id_cmp}/factura?${aMensaje(`Factura enviada exitosamente a ${compra.comprador.correo}`)}`);
    } else {
      return res.redirect(`/compras/${compra.id_cmp}/factura?error=${encodeURIComponent("Error al enviar correo: " + (resultado.error || "Desconocido"))}`);
    }
  } catch (err) {
    return res.redirect(`/compras/${compra.id_cmp}/factura?error=${encodeURIComponent("Error al procesar envío de correo")}`);
  }
};

export {
  reglas,
  reglasAlta,
  lista,
  verCrear,
  registrar,
  editar,
  actualizar,
  eliminar,
  verFactura,
  descargarFacturaPdf,
  enviarFacturaPorCorreo,
};
