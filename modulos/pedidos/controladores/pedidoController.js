import { registro } from '../../../compartido/ayudantes/registro.js';
import {
  CarritoItem,
  Pedido,
  PedidoItem,
  Usuario,
  Comprador,
  DireccionEntrega,
  Lote,
  Especie,
  Tipo,
  Compra,
} from '../../../models/index.js';
import { aMensaje } from '../../../compartido/ayudantes/utiles.js';
import { redondea } from '../../../compartido/ayudantes/fechas.js';
import { generarFacturaPDF } from '../../../compartido/ayudantes/facturaPdf.js';
import { datosFactura } from '../../../compartido/ayudantes/factura.js';
import { costoEnvio, reservaMinutos, reservaEfectivoMinutos, totalLineas } from '../ayudantes/pedidos.js';
import { reservasActivas } from '../../catalogo/index.js';
import { prepararLote } from '../../../compartido/ayudantes/tiendaVista.js';
import { encolarTrabajo } from '../../../compartido/ayudantes/colaTrabajos.js';
import { ESTADO_PEDIDO, OPCIONES_PAGO_PEDIDO } from '../../../models/Pedido.js';
import { crearPedido, pagarPedido } from '../servicios/pedidos.js';

const errorDe = (res, mensaje, estado = 400) =>
  res.status(estado).render('error', {
    codigo: estado,
    mensaje,
    accion: { texto: 'Volver a la tienda', url: '/' },
  });

const includeEspecies = { model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] };
const includeItems = {
  model: PedidoItem,
  as: 'items',
  include: [{ model: Lote, as: 'lote', include: [includeEspecies] }],
};

const obtenerCarrito = async (usuarioId, transaction) =>
  CarritoItem.findAll({
    where: { id_usuario: usuarioId },
    include: [{ model: Lote, as: 'lote', include: [includeEspecies] }],
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

const subtotalCarrito = (filas) => totalLineas(filas.filter((f) => f.lote).map((f) => f.lote));

export const verNuevo = async (req, res) => {
  const usuario = await Usuario.findByPk(req.usuario.id);
  if (!usuario?.email_verificado) {
    return res.redirect(`/cuenta?${aMensaje('Verifica tu correo antes de iniciar un pedido')}`);
  }
  if (!usuario.codigo_cpr) {
    return res.redirect(
      `/cuenta?${aMensaje('Tu cuenta aún no está vinculada a un registro de cliente. Contacta al personal de la lonja.')}`,
    );
  }
  const filas = await obtenerCarrito(usuario.id);
  const reservas = await reservasActivas();
  const items = filas.map((f) => {
    const reserva = reservas.get(Number(f.id_lte));
    return { lote: f.lote ? prepararLote(f.lote) : null, id_lte: f.id_lte, reservado: Boolean(reserva) };
  });
  const direcciones = await DireccionEntrega.findAll({
    where: { id_usuario: usuario.id },
    order: [
      ['principal', 'DESC'],
      ['id_dir', 'ASC'],
    ],
  });
  const subtotal = subtotalCarrito(filas.filter((f) => !reservas.has(Number(f.id_lte))));
  const envio = costoEnvio(subtotal, req.query.entrega || 'recoger');
  res.render('pedido/nuevo', {
    items,
    direcciones,
    subtotal,
    envio,
    total: redondea(subtotal + envio),
    minutos: reservaMinutos(),
    mensaje: req.query.mensaje || null,
    error: req.query.error || null,
    entregaSeleccionada: req.query.entrega || 'recoger',
  });
};

export const crear = async (req, res) => {
  const usuario = await Usuario.findByPk(req.usuario.id);
  const resultado = await crearPedido({ usuario, entrega: req.body.entrega, idDireccion: req.body.id_dir });
  if (!resultado.ok) {
    const destino = resultado.tipo === 'usuario' ? null : '/pedido/nuevo';
    if (destino === null) return errorDe(res, resultado.mensaje, resultado.estado);
    return res.redirect(
      `${destino}?error=${encodeURIComponent(resultado.mensaje)}&entrega=${encodeURIComponent(req.body.entrega || '')}`,
    );
  }
  return res.redirect(`/pedido/${resultado.pedido.id_ped}/pago`);
};

export const verPago = async (req, res) => {
  const pedido = await Pedido.findOne({
    where: { id_ped: req.params.id, id_usuario: req.usuario.id },
    include: [includeItems],
  });
  if (!pedido) return errorDe(res, 'No encontramos ese pedido.', 404);
  if (pedido.estado !== ESTADO_PEDIDO.PENDIENTE_PAGO) return res.redirect(`/cuenta/pedidos/${pedido.id_ped}`);
  res.render('pedido/pago', {
    pedido,
    items: pedido.items,
    error: req.query.error || null,
    vence: new Date(pedido.reservado_hasta).toISOString(),
    minutos: reservaMinutos(),
    minutosEfectivo: reservaEfectivoMinutos(),
  });
};

export const pagar = async (req, res) => {
  const usuario = await Usuario.findByPk(req.usuario.id);
  const metodo = req.body.metodo || OPCIONES_PAGO_PEDIDO.TARJETA;
  const resultado = await pagarPedido({ usuario, pedidoId: req.params.id, metodo, tarjeta: req.body });

  if (resultado.estado === 'sin_verificar') return errorDe(res, 'Verifica tu correo antes de pagar.', 403);
  if (resultado.estado === 'metodo_invalido' && !resultado.pedido)
    return errorDe(res, 'Selecciona un método de pago válido.', 400);
  if (resultado.estado === 'error') {
    return res.redirect(
      `/pedido/${encodeURIComponent(req.params.id)}/pago?error=${encodeURIComponent('No se pudo confirmar la compra; revisa el pedido e inténtalo de nuevo.')}`,
    );
  }
  if (resultado.estado === 'no_encontrado') return errorDe(res, 'No encontramos ese pedido.', 404);
  if (resultado.estado === 'ya_pagado') {
    return res.redirect(`/cuenta/pedidos/${resultado.pedido.id_ped}?${aMensaje('Este pedido ya estaba pagado')}`);
  }
  if (resultado.estado === 'rechazado') {
    return res.redirect(`/pedido/${resultado.pedido.id_ped}/pago?error=${encodeURIComponent(resultado.motivo)}`);
  }
  if (resultado.estado === 'intentos_agotados') {
    return res.redirect(
      `/cuenta/pedidos/${resultado.pedido.id_ped}?error=${encodeURIComponent('Se canceló el pedido después de cinco intentos de pago rechazados. Puedes volver a armar el carrito.')}`,
    );
  }
  if (resultado.estado === 'limite_efectivo') {
    return res.redirect(
      `/pedido/${resultado.pedido.id_ped}/pago?error=${encodeURIComponent('Ya tienes tres pedidos pendientes de pago en la lonja.')}`,
    );
  }
  if (resultado.estado === 'efectivo_pendiente') {
    return res.redirect(
      `/cuenta/pedidos/${resultado.pedido.id_ped}?${aMensaje('Tu pedido quedó reservado para pagarse en la lonja.')}`,
    );
  }
  if (resultado.estado === 'metodo_invalido') {
    return errorDe(res, 'El pago en la lonja solo está disponible para pedidos que se recogen en persona.', 400);
  }
  if (resultado.estado !== ESTADO_PEDIDO.PAGADO) {
    const mensaje =
      resultado.estado === ESTADO_PEDIDO.EXPIRADO
        ? 'La reserva venció. Regresa al carrito para revisar qué lotes siguen disponibles.'
        : resultado.estado === 'no_disponible'
          ? 'Uno o más lotes ya no están disponibles y la reserva se liberó.'
          : 'Este pedido ya no admite pago.';
    return res.redirect(`/pedido/${resultado.pedido.id_ped}/pago?error=${encodeURIComponent(mensaje)}`);
  }

  const pedido = resultado.pedido;
  const encolado = await encolarTrabajo('facturas_pedido', {
    pedidoId: pedido.id_ped,
    usuarioId: usuario.id,
    compraIds: resultado.compras.map((compra) => compra.id_cmp),
  });
  if (!encolado) registro.warn('No se encolaron las facturas del pedido: la cola de trabajos está llena.');
  return res.redirect(
    `/cuenta/pedidos/${pedido.id_ped}?${aMensaje('Pago de prueba aprobado. No se realizó ningún cargo real.')}`,
  );
};

export const cancelar = async (req, res) => {
  const pedido = await Pedido.findOne({ where: { id_ped: req.params.id, id_usuario: req.usuario.id } });
  if (!pedido) return errorDe(res, 'No encontramos ese pedido.', 404);
  if (pedido.estado !== ESTADO_PEDIDO.PENDIENTE_PAGO)
    return res.redirect(
      `/cuenta/pedidos/${pedido.id_ped}?error=${encodeURIComponent('Solo se cancelan pedidos pendientes de pago')}`,
    );
  await pedido.update({ estado: ESTADO_PEDIDO.CANCELADO });
  return res.redirect(
    `/cuenta/pedidos/${pedido.id_ped}?${aMensaje('Pedido cancelado; los lotes quedaron disponibles')}`,
  );
};

export const listaCuenta = async (req, res) => {
  const pedidos = await Pedido.findAll({
    where: { id_usuario: req.usuario.id },
    include: [includeItems],
    order: [['fecha', 'DESC']],
  });
  res.render('cuenta/pedidos', { pedidos, mensaje: req.query.mensaje || null, error: req.query.error || null });
};

export const detalleCuenta = async (req, res) => {
  const pedido = await Pedido.findOne({
    where: { id_ped: req.params.id, id_usuario: req.usuario.id },
    include: [includeItems, { model: Compra, as: 'compras' }],
  });
  if (!pedido) return errorDe(res, 'No encontramos ese pedido.', 404);
  res.render('cuenta/pedido', { pedido, mensaje: req.query.mensaje || null, error: req.query.error || null });
};

async function compraPropia(req) {
  const pedido = await Pedido.findOne({ where: { id_ped: req.params.id, id_usuario: req.usuario.id } });
  if (!pedido || pedido.estado === ESTADO_PEDIDO.PENDIENTE_PAGO) return null;
  return Compra.findOne({
    where: { id_cmp: req.params.id_cmp, id_ped: pedido.id_ped, codigo_cpr: pedido.codigo_cpr },
    include: [
      { model: Comprador, as: 'comprador' },
      { model: Lote, as: 'lote', include: [includeEspecies] },
    ],
  });
}

export const facturaCuenta = async (req, res) => {
  const compra = await compraPropia(req);
  if (!compra) return errorDe(res, 'No encontramos esa factura.', 404);
  res.render('compras/factura', { compra, f: datosFactura(compra), mensaje: null, error: null, soloLectura: true });
};

export const facturaCuentaPdf = async (req, res) => {
  const compra = await compraPropia(req);
  if (!compra) return errorDe(res, 'No encontramos esa factura.', 404);
  const pdf = await generarFacturaPDF(compra);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="Factura-Lonja-FAC-${String(compra.id_cmp).padStart(6, '0')}.pdf"`,
    'Content-Length': pdf.length,
  });
  res.send(pdf);
};
