import { Op } from 'sequelize';
import { Compra, Comprador, Especie, Lote, Pedido, PedidoItem, Tipo, Usuario } from '../models/index.js';
import {
  enviarBoletinClientes,
  enviarEmailComprobanteCompra,
  enviarEmailPedido,
} from '../compartido/ayudantes/email.js';
import { generarFacturaPDF } from '../compartido/ayudantes/facturaPdf.js';
import { crearTokenBajaAvisos } from '../compartido/ayudantes/tokens.js';
import { registrarProcesadorTrabajo } from '../compartido/ayudantes/colaTrabajos.js';

const incluirLote = {
  model: Lote,
  as: 'lote',
  include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
};

registrarProcesadorTrabajo('factura_compra', async ({ id_cmp }) => {
  const compra = await Compra.findOne({
    where: { id_cmp },
    include: [{ model: Comprador, as: 'comprador' }, incluirLote],
  });
  if (!compra?.comprador?.correo) return { ok: true };
  const pdfBuffer = await generarFacturaPDF(compra);
  return enviarEmailComprobanteCompra({
    compra,
    comprador: compra.comprador,
    pdfBuffer,
    folio: compra.id_cmp,
  });
});

registrarProcesadorTrabajo('facturas_pedido', async ({ pedidoId, usuarioId, compraIds }) => {
  const [usuario, pedido, compras, items] = await Promise.all([
    Usuario.findByPk(usuarioId),
    Pedido.findByPk(pedidoId),
    Compra.findAll({
      where: { id_cmp: { [Op.in]: compraIds } },
      include: [{ model: Comprador, as: 'comprador' }, { model: Pedido, as: 'pedido' }, incluirLote],
    }),
    PedidoItem.findAll({ where: { id_ped: pedidoId } }),
  ]);
  if (!usuario?.correo || !pedido) return { ok: true };

  const facturas = await Promise.all(
    compras.map(async (compra) => ({
      folio: `FAC-${String(compra.id_cmp).padStart(6, '0')}`,
      pdf: await generarFacturaPDF(compra),
    })),
  );
  return enviarEmailPedido({
    usuario,
    correo: usuario.correo,
    pedido,
    items,
    facturas,
    asunto: 'Confirmación de pago',
    titulo: 'Pago confirmado',
    parrafos: ['Tu pago de prueba fue aprobado. Esta aplicación no realizó ningún cargo real.'],
  });
});

registrarProcesadorTrabajo('aviso_estado_pedido', async ({ pedidoId, usuarioId, asunto, titulo, parrafos }) => {
  const [usuario, pedido, items] = await Promise.all([
    Usuario.findByPk(usuarioId),
    Pedido.findByPk(pedidoId),
    PedidoItem.findAll({ where: { id_ped: pedidoId } }),
  ]);
  if (!usuario?.correo || !pedido) return { ok: true };
  return enviarEmailPedido({ usuario, correo: usuario.correo, pedido, items, asunto, titulo, parrafos });
});

registrarProcesadorTrabajo('aviso_masivo', async (carga, { guardarCarga }) => {
  const { usuarioIds, asunto, titulo, mensaje, tipo, baseUrl } = carga;
  const usuarios = await Usuario.findAll({
    where: {
      id: { [Op.in]: usuarioIds },
      rol: 'comprador',
      activo: true,
      email_verificado: true,
      recibir_avisos: true,
    },
    include: [{ model: Comprador, as: 'comprador', required: true }],
  });
  const enviadosIds = new Set(carga.enviadosIds || []);
  for (const usuario of usuarios) {
    if (enviadosIds.has(usuario.id)) continue;
    const compradores = [
      {
        ...usuario.comprador.get({ plain: true }),
        correo: usuario.correo,
        bajaUrl: `${baseUrl}/avisos/baja/${crearTokenBajaAvisos(usuario.id)}`,
      },
    ];
    const [resultado] = await enviarBoletinClientes({ asunto, titulo, mensaje, tipo, compradores });
    if (resultado?.resultado?.ok === false) throw new Error('No se pudo enviar un destinatario del aviso masivo.');
    enviadosIds.add(usuario.id);
    await guardarCarga({ ...carga, enviadosIds: [...enviadosIds] });
  }
  return { ok: true };
});
