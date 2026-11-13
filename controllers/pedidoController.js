import { Op } from "sequelize";
import db from "../config/db.js";
import { CarritoItem, Pedido, PedidoItem, Usuario, Comprador, DireccionEntrega, Lote, Especie, Tipo, Compra } from "../models/index.js";
import { aMensaje, mensajeBD } from "../helpers/utiles.js";
import { dinero, redondea } from "../helpers/fechas.js";
import { generarFacturaPDF } from "../helpers/facturaPdf.js";
import { datosFactura } from "../helpers/factura.js";
import { enviarEmailPedido } from "../helpers/email.js";
import { cobrar } from "../helpers/pasarela.js";
import { costoEnvio, liberarPedidosVencidos, loteDisponible, reservaMinutos, reservasActivas, textoDireccion, totalLineas } from "../helpers/pedidos.js";
import { prepararLote } from "../helpers/tienda.js";
import { crearLimite } from "../helpers/seguridad.js";

const errorDe = (res, mensaje, estado = 400) => res.status(estado).render("error", {
  codigo: estado,
  mensaje,
  accion: { texto: "Volver a la tienda", url: "/" },
});

const includeEspecies = { model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] };
const includeItems = {
  model: PedidoItem,
  as: "items",
  include: [{ model: Lote, as: "lote", include: [includeEspecies] }],
};

const obtenerCarrito = async (usuarioId, transaction) => CarritoItem.findAll({
  where: { id_usuario: usuarioId },
  include: [{ model: Lote, as: "lote", include: [includeEspecies] }],
  transaction,
  lock: transaction?.LOCK?.UPDATE,
});

const subtotalCarrito = (filas) => totalLineas(filas.filter((f) => f.lote).map((f) => f.lote));
const limitePagosFallidos = crearLimite({ max: 5, ventanaMs: 60 * 60 * 1000 });

export const verNuevo = async (req, res) => {
  await liberarPedidosVencidos();
  const usuario = await Usuario.findByPk(req.usuario.id);
  if (!usuario?.email_verificado) {
    return res.redirect(`/cuenta?${aMensaje("Verifica tu correo antes de iniciar un pedido")}`);
  }
  if (!usuario.codigo_cpr) {
    return res.redirect(`/cuenta?${aMensaje("Tu cuenta aún no está vinculada a un registro de cliente. Contacta al personal de la lonja.")}`);
  }
  const filas = await obtenerCarrito(usuario.id);
  const reservas = await reservasActivas();
  const items = filas.map((f) => {
    const reserva = reservas.get(Number(f.id_lte));
    return { lote: f.lote ? prepararLote(f.lote) : null, id_lte: f.id_lte, reservado: Boolean(reserva) };
  });
  const direcciones = await DireccionEntrega.findAll({ where: { id_usuario: usuario.id }, order: [["principal", "DESC"], ["id_dir", "ASC"]] });
  const subtotal = subtotalCarrito(filas.filter((f) => !reservas.has(Number(f.id_lte))));
  const envio = costoEnvio(subtotal, req.query.entrega || "recoger");
  res.render("pedido/nuevo", {
    items,
    direcciones,
    subtotal,
    envio,
    total: redondea(subtotal + envio),
    mensaje: req.query.mensaje || null,
    error: req.query.error || null,
    entregaSeleccionada: req.query.entrega || "recoger",
  });
};

export const crear = async (req, res) => {
  const usuario = await Usuario.findByPk(req.usuario.id);
  if (!usuario?.email_verificado) return errorDe(res, "Verifica tu correo antes de iniciar un pedido", 403);
  if (!usuario.codigo_cpr) return errorDe(res, "Tu cuenta aún no está vinculada a un registro de cliente", 409);
  const entrega = req.body.entrega;
  if (!["domicilio", "recoger"].includes(entrega)) return errorDe(res, "Selecciona una forma de entrega.");

  try {
    const pedido = await db.transaction(async (transaction) => {
      await liberarPedidosVencidos(new Date(), transaction);
      const carrito = await obtenerCarrito(usuario.id, transaction);
      if (!carrito.length) throw Object.assign(new Error("Tu carrito está vacío"), { status: 400 });

      const direcciones = await DireccionEntrega.findAll({ where: { id_usuario: usuario.id }, transaction, lock: transaction.LOCK?.UPDATE });
      let direccion = null;
      if (entrega === "domicilio") {
        direccion = direcciones.find((d) => String(d.id_dir) === String(req.body.id_dir));
        if (!direccion) throw Object.assign(new Error("Selecciona una dirección de entrega tuya"), { status: 400 });
      }

      const lotes = [];
      for (const fila of carrito) {
        const comprobacion = await loteDisponible(fila.id_lte, { usuarioId: usuario.id, transaction });
        if (!comprobacion.lote || comprobacion.motivo) {
          const texto = comprobacion.motivo === "reservado" || comprobacion.motivo === "reservado_propio"
            ? `El lote #${fila.id_lte} ya está reservado.`
            : `El lote #${fila.id_lte} ya no está disponible.`;
          throw Object.assign(new Error(texto), { status: 409 });
        }
        if (!fila.lote) throw Object.assign(new Error(`El lote #${fila.id_lte} ya no existe.`), { status: 409 });
        lotes.push(fila.lote);
      }

      const subtotal = subtotalCarrito(carrito);
      const envio = costoEnvio(subtotal, entrega);
      const ahora = new Date();
      const pedidoNuevo = await Pedido.create({
        id_usuario: usuario.id,
        codigo_cpr: usuario.codigo_cpr,
        estado: "pendiente_pago",
        entrega,
        id_dir: direccion?.id_dir || null,
        dir_destinatario: direccion?.destinatario || null,
        dir_telefono: direccion?.telefono || null,
        dir_texto: entrega === "domicilio" ? textoDireccion(direccion) : "Recoger en la lonja pesquera de Veracruz",
        subtotal,
        costo_envio: envio,
        total: redondea(subtotal + envio),
        reservado_hasta: new Date(ahora.getTime() + reservaMinutos() * 60_000),
        fecha: ahora,
      }, { transaction });

      await PedidoItem.bulkCreate(lotes.map((lote) => {
        const precio = Number(lote.precio_kilo_salida);
        const kilos = Number(lote.kilos);
        return { id_ped: pedidoNuevo.id_ped, id_lte: lote.id_lte, kilos, precio_kilo: precio, subtotal: redondea(kilos * precio) };
      }), { transaction });
      await CarritoItem.destroy({ where: { id_usuario: usuario.id, id_lte: { [Op.in]: lotes.map((l) => l.id_lte) } }, transaction });
      return pedidoNuevo;
    });
    return res.redirect(`/pedido/${pedido.id_ped}/pago`);
  } catch (error) {
    const estado = error.status || 400;
    if (!error.status) console.error("No se pudo crear el pedido:", mensajeBD(error));
    return res.redirect(`/pedido/nuevo?error=${encodeURIComponent(error.status ? error.message : "No se pudo crear el pedido. Revisa el carrito e inténtalo otra vez.")}&entrega=${encodeURIComponent(entrega)}`);
  }
};

export const verPago = async (req, res) => {
  await liberarPedidosVencidos();
  const pedido = await Pedido.findOne({ where: { id_ped: req.params.id, id_usuario: req.usuario.id }, include: [includeItems] });
  if (!pedido) return errorDe(res, "No encontramos ese pedido.", 404);
  if (pedido.estado !== "pendiente_pago") return res.redirect(`/cuenta/pedidos/${pedido.id_ped}`);
  res.render("pedido/pago", {
    pedido,
    items: pedido.items,
    error: req.query.error || null,
    vence: new Date(pedido.reservado_hasta).toISOString(),
    minutos: reservaMinutos(),
  });
};

export const pagar = async (req, res) => {
  const usuario = await Usuario.findByPk(req.usuario.id);
  if (!usuario?.email_verificado) return errorDe(res, "Verifica tu correo antes de pagar.", 403);
  let resultado;
  try {
    resultado = await db.transaction(async (transaction) => {
      const pedido = await Pedido.findOne({ where: { id_ped: req.params.id, id_usuario: usuario.id }, transaction, lock: transaction.LOCK?.UPDATE });
      if (!pedido) return { estado: "no_encontrado" };
      if (pedido.estado === "pagado") return { estado: "ya_pagado", pedido };
      if (pedido.estado !== "pendiente_pago") return { estado: pedido.estado, pedido };

      const ahora = new Date();
      if (!pedido.reservado_hasta || new Date(pedido.reservado_hasta) <= ahora) {
        await pedido.update({ estado: "expirado" }, { transaction });
        return { estado: "expirado", pedido };
      }

      const items = await PedidoItem.findAll({
        where: { id_ped: pedido.id_ped },
        include: [{ model: Lote, as: "lote", lock: transaction.LOCK?.UPDATE }],
        transaction,
      });
      if (!items.length) return { estado: "sin_items", pedido };
      const reservadas = await reservasActivas({ exceptoPedido: pedido.id_ped, ahora, transaction });
      for (const item of items) {
        const vendido = await Compra.findOne({ where: { id_cmp: item.id_lte }, transaction, lock: transaction.LOCK?.UPDATE });
        if (vendido || reservadas.has(Number(item.id_lte))) {
          await pedido.update({ estado: "expirado" }, { transaction });
          return { estado: "no_disponible", pedido };
        }
      }

      // El número y el CVV solo viven durante esta llamada. No se escriben ni se registran.
      const pago = await cobrar({ monto: Number(pedido.total), referencia: `pedido-${pedido.id_ped}`, tarjeta: req.body });
      if (!pago.aprobado) {
        const clave = `pago:${pedido.id_ped}`;
        limitePagosFallidos.fallo(clave);
        if (limitePagosFallidos.bloqueado(clave)) {
          await pedido.update({ estado: "cancelado" }, { transaction });
          limitePagosFallidos.limpiar(clave);
          return { estado: "intentos_agotados", pedido };
        }
        return { estado: "rechazado", motivo: pago.motivo, pedido };
      }
      limitePagosFallidos.limpiar(`pago:${pedido.id_ped}`);

      const fecha = new Date();
      const compras = [];
      for (const item of items) {
        const subtotal = redondea(Number(item.kilos) * Number(item.precio_kilo));
        compras.push(await Compra.create({
          id_cmp: item.id_lte,
          codigo_cpr: pedido.codigo_cpr,
          precio_kilo_final: item.precio_kilo,
          precio_total: subtotal,
          fecha,
          id_ped: pedido.id_ped,
        }, { transaction }));
      }
      await pedido.update({
        estado: "pagado",
        fecha_pago: fecha,
        pago_metodo: `Simulado ${pago.marca}`,
        pago_ref: pago.referencia,
        pago_ultimos4: pago.ultimos4,
      }, { transaction });
      return { estado: "pagado", pedido, compras };
    });
  } catch (error) {
    console.error("No se pudo completar el pago:", mensajeBD(error));
    return res.redirect(`/pedido/${encodeURIComponent(req.params.id)}/pago?error=${encodeURIComponent("No se pudo confirmar la compra; revisa el pedido e inténtalo de nuevo.")}`);
  }

  if (resultado.estado === "no_encontrado") return errorDe(res, "No encontramos ese pedido.", 404);
  if (resultado.estado === "ya_pagado") return res.redirect(`/cuenta/pedidos/${resultado.pedido.id_ped}?${aMensaje("Este pedido ya estaba pagado")}`);
  if (resultado.estado === "rechazado") return res.redirect(`/pedido/${resultado.pedido.id_ped}/pago?error=${encodeURIComponent(resultado.motivo)}`);
  if (resultado.estado === "intentos_agotados") return res.redirect(`/cuenta/pedidos/${resultado.pedido.id_ped}?error=${encodeURIComponent("Se canceló el pedido después de cinco intentos de pago rechazados. Puedes volver a armar el carrito.")}`);
  if (resultado.estado !== "pagado") {
    const mensaje = resultado.estado === "expirado" ? "La reserva venció. Regresa al carrito para revisar qué lotes siguen disponibles."
      : resultado.estado === "no_disponible" ? "Uno o más lotes ya no están disponibles y la reserva se liberó."
        : "Este pedido ya no admite pago.";
    return res.redirect(`/pedido/${resultado.pedido.id_ped}/pago?error=${encodeURIComponent(mensaje)}`);
  }

  const pedido = resultado.pedido;
  try {
    const compraIds = resultado.compras.map((c) => c.id_cmp);
    const completas = await Compra.findAll({
      where: { id_cmp: { [Op.in]: compraIds } },
      include: [
        { model: Comprador, as: "comprador" },
        { model: Pedido, as: "pedido" },
        { model: Lote, as: "lote", include: [includeEspecies] },
      ],
    });
    const facturas = await Promise.all(completas.map(async (compra) => ({
      folio: `FAC-${String(compra.id_cmp).padStart(6, "0")}`,
      pdf: await generarFacturaPDF(compra),
    })));
    const items = await PedidoItem.findAll({ where: { id_ped: pedido.id_ped } });
    await enviarEmailPedido({
      usuario,
      correo: usuario.correo,
      pedido,
      items,
      facturas,
      asunto: "Confirmación de pago",
      titulo: "Pago confirmado",
      parrafos: ["Tu pago de prueba fue aprobado. Esta aplicación no realizó ningún cargo real."],
    });
  } catch (error) {
    console.warn("El pedido fue pagado pero no se pudo enviar el correo:", error.message);
  }
  return res.redirect(`/cuenta/pedidos/${pedido.id_ped}?${aMensaje("Pago de prueba aprobado. No se realizó ningún cargo real.")}`);
};

export const cancelar = async (req, res) => {
  const pedido = await Pedido.findOne({ where: { id_ped: req.params.id, id_usuario: req.usuario.id } });
  if (!pedido) return errorDe(res, "No encontramos ese pedido.", 404);
  if (pedido.estado !== "pendiente_pago") return res.redirect(`/cuenta/pedidos/${pedido.id_ped}?error=${encodeURIComponent("Solo se cancelan pedidos pendientes de pago")}`);
  await pedido.update({ estado: "cancelado" });
  return res.redirect(`/cuenta/pedidos/${pedido.id_ped}?${aMensaje("Pedido cancelado; los lotes quedaron disponibles")}`);
};

export const listaCuenta = async (req, res) => {
  await liberarPedidosVencidos();
  const pedidos = await Pedido.findAll({
    where: { id_usuario: req.usuario.id },
    include: [includeItems],
    order: [["fecha", "DESC"]],
  });
  res.render("cuenta/pedidos", { pedidos, mensaje: req.query.mensaje || null, error: req.query.error || null });
};

export const detalleCuenta = async (req, res) => {
  await liberarPedidosVencidos();
  const pedido = await Pedido.findOne({
    where: { id_ped: req.params.id, id_usuario: req.usuario.id },
    include: [includeItems, { model: Compra, as: "compras" }],
  });
  if (!pedido) return errorDe(res, "No encontramos ese pedido.", 404);
  res.render("cuenta/pedido", { pedido, mensaje: req.query.mensaje || null, error: req.query.error || null });
};

async function compraPropia(req) {
  const pedido = await Pedido.findOne({ where: { id_ped: req.params.id, id_usuario: req.usuario.id } });
  if (!pedido || pedido.estado === "pendiente_pago") return null;
  return Compra.findOne({
    where: { id_cmp: req.params.id_cmp, id_ped: pedido.id_ped, codigo_cpr: pedido.codigo_cpr },
    include: [
      { model: Comprador, as: "comprador" },
      { model: Lote, as: "lote", include: [includeEspecies] },
    ],
  });
}

export const facturaCuenta = async (req, res) => {
  const compra = await compraPropia(req);
  if (!compra) return errorDe(res, "No encontramos esa factura.", 404);
  res.render("compras/factura", { compra, f: datosFactura(compra), mensaje: null, error: null, soloLectura: true });
};

export const facturaCuentaPdf = async (req, res) => {
  const compra = await compraPropia(req);
  if (!compra) return errorDe(res, "No encontramos esa factura.", 404);
  const pdf = await generarFacturaPDF(compra);
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Factura-Lonja-FAC-${String(compra.id_cmp).padStart(6, "0")}.pdf"`, "Content-Length": pdf.length });
  res.send(pdf);
};

export { dinero };
