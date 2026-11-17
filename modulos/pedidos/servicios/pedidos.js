import { registro } from '../../../compartido/ayudantes/registro.js';
import { Op } from 'sequelize';
import db from '../../../compartido/config/db.js';
import { CarritoItem, Pedido, PedidoItem, DireccionEntrega, Lote, Compra, Especie } from '../../../models/index.js';
import { ErrorDeUsuario, mensajeBD } from '../../../compartido/ayudantes/utiles.js';
import { redondea } from '../../../compartido/ayudantes/fechas.js';
import { cobrar } from '../ayudantes/pasarela.js';
import {
  costoEnvio,
  liberarPedidosVencidos,
  reservaMinutos,
  reservaEfectivoMinutos,
  textoDireccion,
} from '../ayudantes/pedidos.js';
import { disponibilidadDeLotes, reservasActivas, totalLineas } from '../../catalogo/index.js';
import { crearLimite } from '../../../compartido/ayudantes/seguridad.js';
import {
  ESTADO_PEDIDO,
  METODO_PAGO_PEDIDO,
  OPCIONES_PAGO_PEDIDO,
  OPCIONES_PAGO_PEDIDO_VALIDAS,
} from '../../../models/Pedido.js';

const limitePagosFallidos = crearLimite({ max: 5, ventanaMs: 60 * 60 * 1000 });
const includeEspecies = { model: Especie, as: 'especies' };
const obtenerCarrito = (usuarioId, transaction) =>
  CarritoItem.findAll({
    where: { id_usuario: usuarioId },
    include: [{ model: Lote, as: 'lote', include: [includeEspecies] }],
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
const subtotalCarrito = (filas) => totalLineas(filas.filter((fila) => fila.lote).map((fila) => fila.lote));

/** Crea y reserva el pedido en una transacción. No depende de Express. */
export async function crearPedido({ usuario, entrega, idDireccion }) {
  if (!usuario?.email_verificado)
    return { ok: false, tipo: 'usuario', estado: 403, mensaje: 'Verifica tu correo antes de iniciar un pedido' };
  if (!usuario.codigo_cpr)
    return {
      ok: false,
      tipo: 'usuario',
      estado: 409,
      mensaje: 'Tu cuenta aún no está vinculada a un registro de cliente',
    };
  if (!['domicilio', 'recoger'].includes(entrega))
    return { ok: false, tipo: 'usuario', estado: 400, mensaje: 'Selecciona una forma de entrega.' };

  try {
    const pedido = await db.transaction(async (transaction) => {
      await liberarPedidosVencidos(new Date(), transaction);
      const carrito = await obtenerCarrito(usuario.id, transaction);
      if (!carrito.length) throw new ErrorDeUsuario('Tu carrito está vacío');

      const direcciones = await DireccionEntrega.findAll({
        where: { id_usuario: usuario.id },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      const direccion =
        entrega === 'domicilio' ? direcciones.find((d) => String(d.id_dir) === String(idDireccion)) : null;
      if (entrega === 'domicilio' && !direccion) throw new ErrorDeUsuario('Selecciona una dirección de entrega tuya');

      const estados = await disponibilidadDeLotes(
        carrito.map((fila) => fila.id_lte),
        {
          usuarioId: usuario.id,
          transaction,
        },
      );
      const lotes = [];
      for (const fila of carrito) {
        const comprobacion = estados.get(Number(fila.id_lte));
        if (!comprobacion || comprobacion.motivo) {
          const mensaje = ['reservado', 'reservado_propio'].includes(comprobacion?.motivo)
            ? `El lote #${fila.id_lte} ya está reservado.`
            : `El lote #${fila.id_lte} ya no está disponible.`;
          throw new ErrorDeUsuario(mensaje, 409);
        }
        if (!fila.lote) throw new ErrorDeUsuario(`El lote #${fila.id_lte} ya no existe.`, 409);
        lotes.push(fila.lote);
      }

      const subtotal = subtotalCarrito(carrito);
      const envio = costoEnvio(subtotal, entrega);
      const ahora = new Date();
      const pedido = await Pedido.create(
        {
          id_usuario: usuario.id,
          codigo_cpr: usuario.codigo_cpr,
          estado: ESTADO_PEDIDO.PENDIENTE_PAGO,
          entrega,
          id_dir: direccion?.id_dir || null,
          dir_destinatario: direccion?.destinatario || null,
          dir_telefono: direccion?.telefono || null,
          dir_texto: entrega === 'domicilio' ? textoDireccion(direccion) : 'Recoger en la lonja pesquera de Veracruz',
          subtotal,
          costo_envio: envio,
          total: redondea(subtotal + envio),
          reservado_hasta: new Date(ahora.getTime() + reservaMinutos() * 60_000),
          fecha: ahora,
        },
        { transaction },
      );
      await PedidoItem.bulkCreate(
        lotes.map((lote) => {
          const precio = Number(lote.precio_kilo_salida);
          const kilos = Number(lote.kilos);
          return {
            id_ped: pedido.id_ped,
            id_lte: lote.id_lte,
            kilos,
            precio_kilo: precio,
            subtotal: redondea(kilos * precio),
          };
        }),
        { transaction },
      );
      await CarritoItem.destroy({
        where: { id_usuario: usuario.id, id_lte: { [Op.in]: lotes.map((lote) => lote.id_lte) } },
        transaction,
      });
      return pedido;
    });
    return { ok: true, pedido };
  } catch (error) {
    if (error instanceof ErrorDeUsuario)
      return { ok: false, tipo: 'regla', estado: error.estado || 400, mensaje: error.message };
    registro.error('No se pudo crear el pedido:', mensajeBD(error));
    return {
      ok: false,
      tipo: 'interno',
      estado: 500,
      mensaje: 'No se pudo crear el pedido. Revisa el carrito e inténtalo otra vez.',
    };
  }
}

/** Valida y procesa un pago; los resultados describen el siguiente paso HTTP. */
export async function pagarPedido({ usuario, pedidoId, metodo, tarjeta }) {
  if (!usuario?.email_verificado) return { estado: 'sin_verificar' };
  if (!OPCIONES_PAGO_PEDIDO_VALIDAS.includes(metodo)) return { estado: 'metodo_invalido' };
  try {
    return await db.transaction(async (transaction) => {
      const pedido = await Pedido.findOne({
        where: { id_ped: pedidoId, id_usuario: usuario.id },
        transaction,
        lock: transaction.LOCK?.UPDATE,
      });
      if (!pedido) return { estado: 'no_encontrado' };
      if (pedido.estado === ESTADO_PEDIDO.PAGADO) return { estado: 'ya_pagado', pedido };
      if (pedido.estado !== ESTADO_PEDIDO.PENDIENTE_PAGO) return { estado: pedido.estado, pedido };
      if (metodo === 'efectivo' && pedido.entrega !== 'recoger') return { estado: 'metodo_invalido', pedido };

      const ahora = new Date();
      if (!pedido.reservado_hasta || new Date(pedido.reservado_hasta) <= ahora) {
        await pedido.update({ estado: ESTADO_PEDIDO.EXPIRADO }, { transaction });
        return { estado: ESTADO_PEDIDO.EXPIRADO, pedido };
      }
      const items = await PedidoItem.findAll({
        where: { id_ped: pedido.id_ped },
        include: [{ model: Lote, as: 'lote' }],
        transaction,
      });
      if (!items.length) return { estado: 'sin_items', pedido };
      const reservadas = await reservasActivas({ exceptoPedido: pedido.id_ped, ahora, transaction });
      for (const item of items) {
        const vendido = await Compra.findOne({
          where: { id_cmp: item.id_lte },
          transaction,
          lock: transaction.LOCK?.UPDATE,
        });
        if (vendido || reservadas.has(Number(item.id_lte))) {
          await pedido.update({ estado: ESTADO_PEDIDO.EXPIRADO }, { transaction });
          return { estado: 'no_disponible', pedido };
        }
      }

      if (metodo === 'efectivo') {
        if (pedido.pago_metodo === METODO_PAGO_PEDIDO.EFECTIVO_LONJA) return { estado: 'efectivo_pendiente', pedido };
        const pendientes = await Pedido.count({
          where: {
            id_usuario: usuario.id,
            estado: ESTADO_PEDIDO.PENDIENTE_PAGO,
            pago_metodo: METODO_PAGO_PEDIDO.EFECTIVO_LONJA,
            id_ped: { [Op.ne]: pedido.id_ped },
          },
          transaction,
        });
        if (pendientes >= 3) return { estado: 'limite_efectivo', pedido };
        await pedido.update(
          {
            pago_metodo: METODO_PAGO_PEDIDO.EFECTIVO_LONJA,
            pago_ref: null,
            pago_ultimos4: null,
            reservado_hasta: new Date(ahora.getTime() + reservaEfectivoMinutos() * 60_000),
          },
          { transaction },
        );
        return { estado: 'efectivo_pendiente', pedido };
      }

      const pago = await cobrar({
        metodo,
        monto: Number(pedido.total),
        referencia: `pedido-${pedido.id_ped}`,
        tarjeta,
      });
      if (!pago.aprobado) {
        if (metodo === 'tarjeta') {
          const clave = `pago:${pedido.id_ped}`;
          limitePagosFallidos.fallo(clave);
          if (limitePagosFallidos.bloqueado(clave)) {
            await pedido.update({ estado: ESTADO_PEDIDO.CANCELADO }, { transaction });
            limitePagosFallidos.limpiar(clave);
            return { estado: 'intentos_agotados', pedido };
          }
        }
        return { estado: 'rechazado', motivo: pago.motivo, pedido };
      }
      if (metodo === 'tarjeta') limitePagosFallidos.limpiar(`pago:${pedido.id_ped}`);

      const fecha = new Date();
      const compras = [];
      for (const item of items) {
        const subtotal = redondea(Number(item.kilos) * Number(item.precio_kilo));
        compras.push(
          await Compra.create(
            {
              id_cmp: item.id_lte,
              codigo_cpr: pedido.codigo_cpr,
              precio_kilo_final: item.precio_kilo,
              precio_total: subtotal,
              fecha,
              id_ped: pedido.id_ped,
            },
            { transaction },
          ),
        );
      }
      await pedido.update(
        {
          estado: ESTADO_PEDIDO.PAGADO,
          fecha_pago: fecha,
          pago_metodo: metodo === OPCIONES_PAGO_PEDIDO.TARJETA ? `Simulado ${pago.marca}` : 'Simulado SPEI',
          pago_ref: pago.referencia,
          pago_ultimos4: pago.ultimos4,
        },
        { transaction },
      );
      return { estado: ESTADO_PEDIDO.PAGADO, pedido, compras };
    });
  } catch (error) {
    registro.error('No se pudo completar el pago:', mensajeBD(error));
    return { estado: 'error' };
  }
}

/** Confirma el cobro en mostrador y registra la venta en una transacción. */
export async function confirmarCobro({ pedidoId }) {
  return db.transaction(async (transaction) => {
    const pedido = await Pedido.findByPk(pedidoId, { transaction, lock: transaction.LOCK?.UPDATE });
    if (!pedido) return { ok: false, mensaje: 'No encontramos ese pedido.' };
    if (
      pedido.estado !== ESTADO_PEDIDO.PENDIENTE_PAGO ||
      pedido.pago_metodo !== METODO_PAGO_PEDIDO.EFECTIVO_LONJA ||
      pedido.entrega !== 'recoger'
    ) {
      return { ok: false, mensaje: 'Solo se confirma el cobro de pedidos pendientes que se pagan en la lonja.' };
    }
    if (!pedido.reservado_hasta || new Date(pedido.reservado_hasta) <= new Date()) {
      await pedido.update({ estado: ESTADO_PEDIDO.EXPIRADO }, { transaction });
      return { ok: false, mensaje: 'La reserva venció y el pedido se liberó.' };
    }
    const items = await PedidoItem.findAll({
      where: { id_ped: pedido.id_ped },
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (!items.length) return { ok: false, mensaje: 'El pedido no tiene artículos.' };
    if (await Compra.findOne({ where: { id_ped: pedido.id_ped }, transaction, lock: transaction.LOCK?.UPDATE })) {
      return { ok: true, pedido, repetido: true };
    }
    const pago = await cobrar({
      metodo: 'efectivo',
      monto: Number(pedido.total),
      referencia: `pedido-${pedido.id_ped}`,
    });
    const fecha = new Date();
    for (const item of items) {
      await Compra.create(
        {
          id_cmp: item.id_lte,
          codigo_cpr: pedido.codigo_cpr,
          precio_kilo_final: item.precio_kilo,
          precio_total: item.subtotal,
          fecha,
          id_ped: pedido.id_ped,
        },
        { transaction },
      );
    }
    await pedido.update(
      { estado: ESTADO_PEDIDO.PAGADO, fecha_pago: fecha, pago_ref: pago.referencia },
      { transaction },
    );
    return { ok: true, pedido, items };
  });
}
