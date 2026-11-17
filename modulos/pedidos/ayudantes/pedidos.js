import { Op } from 'sequelize';
import { Pedido } from '../../../models/index.js';
import { redondea } from '../../../compartido/ayudantes/fechas.js';
import { ESTADO_PEDIDO } from '../../../models/Pedido.js';
import { loteDisponible, reservasActivas, disponibilidadDeLotes } from '../../catalogo/index.js';

const numero = (valor, defecto) => (Number.isFinite(Number(valor)) ? Number(valor) : defecto);

export const reservaMinutos = () => Math.max(1, numero(process.env.RESERVA_MINUTOS, 15));
export const reservaEfectivoMinutos = () =>
  Math.min(24 * 60, Math.max(15, numero(process.env.RESERVA_EFECTIVO_MINUTOS, 120)));

export const costoEnvio = (subtotal, entrega) => {
  if (entrega !== 'domicilio') return 0;
  const costo = Math.max(0, numero(process.env.ENVIO_COSTO, 150));
  const gratisDesde = Math.max(0, numero(process.env.ENVIO_GRATIS_DESDE, 2500));
  return subtotal >= gratisDesde ? 0 : costo;
};

export const totalLineas = (lotes) =>
  redondea(lotes.reduce((suma, lote) => suma + Number(lote.kilos) * Number(lote.precio_kilo_salida), 0));

export { loteDisponible, reservasActivas, disponibilidadDeLotes };

/** Marca como expirados los pedidos cuya reserva venció. */
export async function liberarPedidosVencidos(ahora = new Date(), transaction = null) {
  const [cantidad] = await Pedido.update(
    { estado: ESTADO_PEDIDO.EXPIRADO },
    {
      where: {
        estado: ESTADO_PEDIDO.PENDIENTE_PAGO,
        reservado_hasta: { [Op.lte]: ahora },
      },
      transaction,
    },
  );
  return cantidad;
}

export function textoDireccion(direccion) {
  if (!direccion) return null;
  return [
    `${direccion.calle} ${direccion.num_ext}${direccion.num_int ? ` int. ${direccion.num_int}` : ''}`,
    direccion.colonia,
    `C.P. ${direccion.cp}, ${direccion.municipio}, ${direccion.estado}`,
    direccion.referencias ? `Referencias: ${direccion.referencias}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}
