import { Op } from "sequelize";
import db from "../config/db.js";
import { Pedido, Usuario, Comprador, PedidoItem, Lote, Especie, Compra } from "../models/index.js";
import { enviarEmailPedido } from "../helpers/email.js";
import { cobrar } from "../helpers/pasarela.js";
import { aError } from "../helpers/utiles.js";

const ESTADOS = ["pendiente_pago", "pagado", "preparando", "enviado", "entregado", "cancelado", "expirado"];
const avanzan = { pagado: "preparando", preparando: "enviado", enviado: "entregado" };
const incluir = [
  { model: Usuario, as: "usuario", attributes: ["id", "nombre_completo", "correo"] },
  { model: Comprador, as: "comprador" },
  { model: PedidoItem, as: "items", include: [{ model: Lote, as: "lote", include: [{ model: Especie, as: "especies" }] }] },
];

export async function lista(req, res) {
  const where = {};
  if (ESTADOS.includes(req.query.estado)) where.estado = req.query.estado;
  if (["domicilio", "recoger"].includes(req.query.entrega)) where.entrega = req.query.entrega;
  if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.desde || "") || /^\d{4}-\d{2}-\d{2}$/.test(req.query.hasta || "")) {
    where.fecha = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.desde || "")) where.fecha[Op.gte] = new Date(`${req.query.desde}T00:00:00`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.hasta || "")) where.fecha[Op.lt] = new Date(new Date(`${req.query.hasta}T00:00:00`).getTime() + 86400000);
  }
  if (req.query.q?.trim()) {
    const q = `%${req.query.q.trim().slice(0, 80)}%`;
    const personas = await Comprador.findAll({ where: { [Op.or]: [{ nombre: { [Op.like]: q } }, { apellido_paterno: { [Op.like]: q } }, { correo: { [Op.like]: q } }] }, attributes: ["codigo_cpr"] });
    const usuarios = await Usuario.findAll({ where: { [Op.or]: [{ usuario: { [Op.like]: q } }, { nombre_completo: { [Op.like]: q } }, { correo: { [Op.like]: q } }] }, attributes: ["id"] });
    where[Op.or] = [{ id_ped: Number.isInteger(Number(req.query.q)) ? Number(req.query.q) : -1 }, { codigo_cpr: { [Op.in]: personas.map((p) => p.codigo_cpr) } }, { id_usuario: { [Op.in]: usuarios.map((p) => p.id) } }];
  }
  const pagina = Math.max(1, Math.min(10000, Number.parseInt(req.query.pagina, 10) || 1));
  const tamano = 25;
  const ordenCampo = ["fecha", "total", "estado"].includes(req.query.orden) ? req.query.orden : "fecha";
  const direccion = String(req.query.dir).toUpperCase() === "ASC" ? "ASC" : "DESC";
  const { count, rows: pedidos } = await Pedido.findAndCountAll({ where, include: incluir, distinct: true, order: [[ordenCampo, direccion]], limit: tamano, offset: (pagina - 1) * tamano });
  res.render("pedidos/index", { pedidos, estados: ESTADOS, filtros: req.query, pagina, paginas: Math.max(1, Math.ceil(count / tamano)), total: count });
}

export async function detalle(req, res) {
  const pedido = await Pedido.findByPk(req.params.id, { include: incluir });
  if (!pedido) return res.sendStatus(404);
  const compras = await Compra.findAll({ where: { id_ped: pedido.id_ped } });
  res.render("pedidos/detalle", { pedido, compras, siguiente: avanzan[pedido.estado] || null, mensaje: req.query.mensaje, error: req.query.error });
}

export async function cambiarEstado(req, res) {
  const pedido = await Pedido.findByPk(req.params.id, { include: incluir });
  if (!pedido) return res.sendStatus(404);
  const siguiente = avanzan[pedido.estado];
  if (!siguiente || req.body.estado !== siguiente) {
    const etiqueta = { pendiente_pago: "pendiente de pago", pagado: "pagado", preparando: "preparando", enviado: "enviado", entregado: "entregado", cancelado: "cancelado", expirado: "expirado" };
    const solicitada = etiqueta[req.body.estado] || "estado desconocido";
    const actual = etiqueta[pedido.estado] || pedido.estado;
    return res.redirect(`/pedidos/${pedido.id_ped}?${aError(`No se puede pasar el pedido de «${actual}» a «${solicitada}».`)}`);
  }
  await pedido.update({ estado: siguiente });
  if (["enviado", "entregado"].includes(siguiente) && pedido.usuario?.correo) {
    const parrafos = siguiente === "enviado" ? ["Tu pedido está en camino."] : ["Tu pedido fue marcado como entregado."];
    await enviarEmailPedido({ usuario: pedido.usuario, correo: pedido.usuario.correo, pedido, items: pedido.items, asunto: "Actualización de pedido", titulo: siguiente === "enviado" ? "Pedido enviado" : "Pedido entregado", parrafos });
  }
  res.redirect(`/pedidos/${pedido.id_ped}?mensaje=actualizado`);
}

export async function confirmarCobro(req, res) {
  const salida = await db.transaction(async (transaction) => {
    const pedido = await Pedido.findByPk(req.params.id, { transaction, lock: transaction.LOCK?.UPDATE });
    if (!pedido) return { error: "No encontramos ese pedido." };
    if (pedido.estado !== "pendiente_pago" || pedido.pago_metodo !== "Efectivo en lonja" || pedido.entrega !== "recoger") return { error: "Solo se confirma el cobro de pedidos pendientes que se pagan en la lonja." };
    if (!pedido.reservado_hasta || new Date(pedido.reservado_hasta) <= new Date()) {
      await pedido.update({ estado: "expirado" }, { transaction });
      return { error: "La reserva venció y el pedido se liberó." };
    }
    const items = await PedidoItem.findAll({ where: { id_ped: pedido.id_ped }, transaction, lock: transaction.LOCK?.UPDATE });
    if (!items.length) return { error: "El pedido no tiene artículos." };
    if (await Compra.findOne({ where: { id_ped: pedido.id_ped }, transaction, lock: transaction.LOCK?.UPDATE })) return { pedido, repetido: true };
    const pago = await cobrar({ metodo: "efectivo", monto: Number(pedido.total), referencia: `pedido-${pedido.id_ped}` });
    const fecha = new Date();
    for (const item of items) await Compra.create({ id_cmp: item.id_lte, codigo_cpr: pedido.codigo_cpr, precio_kilo_final: item.precio_kilo, precio_total: item.subtotal, fecha, id_ped: pedido.id_ped }, { transaction });
    await pedido.update({ estado: "pagado", fecha_pago: fecha, pago_ref: pago.referencia }, { transaction });
    return { pedido, items };
  });
  if (salida.error) return res.redirect(`/pedidos/${req.params.id}?error=${encodeURIComponent(salida.error)}`);
  if (salida.items) {
    const usuario = await Usuario.findByPk(salida.pedido.id_usuario);
    if (usuario?.correo) {
      try { await enviarEmailPedido({ usuario, correo: usuario.correo, pedido: salida.pedido, items: salida.items, asunto: "Cobro confirmado", titulo: "Pago en la lonja confirmado", parrafos: ["El personal confirmó el cobro de tu pedido."] }); }
      catch (error) { console.warn("El cobro se confirmó pero no se pudo enviar el correo:", error.message); }
    }
  }
  const mensaje = salida.repetido ? "El pedido ya estaba confirmado." : "Cobro confirmado y compra registrada.";
  return res.redirect(`/pedidos/${req.params.id}?mensaje=${encodeURIComponent(mensaje)}`);
}
