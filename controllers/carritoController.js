import { CarritoItem, Lote, Especie, Tipo, EspecieCatalogo, Compra } from "../models/index.js";
import { loteDisponible, reservasActivas, liberarPedidosVencidos, totalLineas } from "../helpers/pedidos.js";
import { prepararLote } from "../helpers/tienda.js";
import { aMensaje } from "../helpers/utiles.js";

const includeLote = {
  model: Lote,
  as: "lote",
  include: [{
    model: Especie,
    as: "especies",
    include: [
      { model: Tipo, as: "tipo" },
      { model: EspecieCatalogo, as: "catalogo", attributes: ["imagen", "descripcion"] },
    ],
  }],
};

const esJson = (req) => req.is("json") || req.accepts(["html", "json"]) === "json";

async function responder(req, res, { ok, mensaje, estado = 200 } = {}) {
  const cantidad = await CarritoItem.count({ where: { id_usuario: req.usuario.id } });
  if (esJson(req)) return res.status(estado).json({ ok, mensaje, cantidad });
  return res.redirect(`/carrito?${aMensaje(mensaje)}`);
}

export const verCarrito = async (req, res) => {
  await liberarPedidosVencidos();
  const filas = await CarritoItem.findAll({
    where: { id_usuario: req.usuario.id },
    include: [includeLote],
    order: [["fecha", "DESC"]],
  });
  const reservas = await reservasActivas();
  const items = await Promise.all(filas.map(async (fila) => {
    const lote = fila.lote;
    const reserva = reservas.get(Number(fila.id_lte));
    const compra = await Compra.findByPk(fila.id_lte);
    const problema = !lote ? "El lote ya no existe"
      : compra ? "Este lote ya fue vendido"
        : reserva && reserva.id_usuario !== req.usuario.id ? "Está reservado por otro comprador"
          : reserva ? "Ya está en un pedido tuyo" : null;
    return { id_lte: fila.id_lte, lote: lote ? prepararLote(lote) : null, problema };
  }));
  const disponibles = items.filter((i) => !i.problema && i.lote);
  const subtotal = totalLineas(disponibles.map((i) => ({
    kilos: i.lote.kilos,
    precio_kilo_salida: i.lote.precio_kilo_salida,
  })));
  res.render("carrito/index", {
    items,
    subtotal,
    mensaje: req.query.mensaje || null,
    error: req.query.error || null,
  });
};

export const agregar = async (req, res) => {
  await liberarPedidosVencidos();
  const id = Number(req.params.id_lte);
  const { lote, motivo } = await loteDisponible(id, { usuarioId: req.usuario.id });
  if (!lote || motivo) {
    const mensajes = {
      no_existe: "El lote ya no está disponible.",
      vendido: "Ese lote ya fue vendido.",
      reservado: "Ese lote está reservado por otro comprador.",
      reservado_propio: "Ese lote ya está en uno de tus pedidos pendientes de pago.",
    };
    return responder(req, res, { ok: false, estado: 409, mensaje: mensajes[motivo] || mensajes.no_existe });
  }
  try {
    await CarritoItem.create({ id_usuario: req.usuario.id, id_lte: id });
    return responder(req, res, { ok: true, mensaje: `Lote #${id} agregado al carrito.` });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return responder(req, res, { ok: true, mensaje: "Ese lote ya estaba en tu carrito." });
    }
    throw error;
  }
};

export const quitar = async (req, res) => {
  await CarritoItem.destroy({ where: { id_usuario: req.usuario.id, id_lte: req.params.id_lte } });
  return responder(req, res, { ok: true, mensaje: "Lote quitado del carrito." });
};

export const vaciar = async (req, res) => {
  await CarritoItem.destroy({ where: { id_usuario: req.usuario.id } });
  return responder(req, res, { ok: true, mensaje: "Carrito vacío." });
};
