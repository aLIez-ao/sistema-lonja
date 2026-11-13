import { Op } from "sequelize";
import { Pedido, PedidoItem, Lote, Compra } from "../models/index.js";
import { redondea } from "./fechas.js";

const numero = (valor, defecto) => Number.isFinite(Number(valor)) ? Number(valor) : defecto;

export const reservaMinutos = () => Math.max(1, numero(process.env.RESERVA_MINUTOS, 15));
export const reservaEfectivoMinutos = () => Math.min(24 * 60, Math.max(15, numero(process.env.RESERVA_EFECTIVO_MINUTOS, 120)));

export const costoEnvio = (subtotal, entrega) => {
  if (entrega !== "domicilio") return 0;
  const costo = Math.max(0, numero(process.env.ENVIO_COSTO, 150));
  const gratisDesde = Math.max(0, numero(process.env.ENVIO_GRATIS_DESDE, 2500));
  return subtotal >= gratisDesde ? 0 : costo;
};

export const totalLineas = (lotes) => redondea(lotes.reduce(
  (suma, lote) => suma + Number(lote.kilos) * Number(lote.precio_kilo_salida), 0,
));

/** Devuelve el pedido activo que mantiene reservado cada lote. */
export async function reservasActivas({ ahora = new Date(), exceptoPedido = null, transaction } = {}) {
  await liberarPedidosVencidos(ahora, transaction);
  const filas = await PedidoItem.findAll({
    attributes: ["id_lte"],
    include: [{
      model: Pedido,
      as: "pedido",
      attributes: ["id_ped", "id_usuario", "reservado_hasta"],
      where: {
        estado: "pendiente_pago",
        reservado_hasta: { [Op.gt]: ahora },
        ...(exceptoPedido ? { id_ped: { [Op.ne]: exceptoPedido } } : {}),
      },
      required: true,
    }],
    transaction,
  });
  return new Map(filas.map((fila) => [Number(fila.id_lte), {
    id_ped: fila.pedido.id_ped,
    id_usuario: fila.pedido.id_usuario,
    reservado_hasta: fila.pedido.reservado_hasta,
  }]));
}

export async function loteDisponible(idLote, { usuarioId = null, transaction, exceptoPedido = null } = {}) {
  const lote = await Lote.findByPk(idLote, { transaction, lock: transaction?.LOCK?.UPDATE });
  if (!lote) return { lote: null, motivo: "no_existe" };
  if (await Compra.findOne({ where: { id_cmp: idLote }, transaction, lock: transaction?.LOCK?.UPDATE })) {
    return { lote, motivo: "vendido" };
  }
  const reserva = (await reservasActivas({ exceptoPedido, transaction })).get(Number(idLote));
  if (reserva && reserva.id_usuario !== usuarioId) return { lote, motivo: "reservado" };
  if (reserva && reserva.id_usuario === usuarioId) return { lote, motivo: "reservado_propio", reserva };
  return { lote, motivo: null };
}

/** Marca como expirados los pedidos cuya reserva venció. */
export async function liberarPedidosVencidos(ahora = new Date(), transaction = null) {
  const [cantidad] = await Pedido.update({ estado: "expirado" }, {
    where: {
      estado: "pendiente_pago",
      reservado_hasta: { [Op.lte]: ahora },
    },
    transaction,
  });
  return cantidad;
}

export function textoDireccion(direccion) {
  if (!direccion) return null;
  return [
    `${direccion.calle} ${direccion.num_ext}${direccion.num_int ? ` int. ${direccion.num_int}` : ""}`,
    direccion.colonia,
    `C.P. ${direccion.cp}, ${direccion.municipio}, ${direccion.estado}`,
    direccion.referencias ? `Referencias: ${direccion.referencias}` : null,
  ].filter(Boolean).join(", ");
}
