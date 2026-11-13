import { Op } from "sequelize";
import { Pedido, Usuario, Comprador, PedidoItem, Lote, Especie, Compra } from "../models/index.js";
import { enviarEmailPedido } from "../helpers/email.js";
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
