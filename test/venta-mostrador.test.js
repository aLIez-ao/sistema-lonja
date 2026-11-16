import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, cliente, modelos } from './ayuda.js';

const { Usuario, Comprador, Tipo, Lote, Especie, Pedido, PedidoItem, Compra } = modelos;
let srv;
before(async () => {
  srv = await arrancar();
});
after(async () => srv.cerrar());

test('la caja muestra y respeta una reserva activa de la tienda', async () => {
  const comprador = await Comprador.create({
    nombre: 'Cliente',
    apellido_paterno: 'Reservado',
    correo: 'reservado@example.com',
  });
  const usuario = await Usuario.create({
    usuario: 'cliente_reserva_caja',
    nombre_completo: 'Cliente Reservado',
    correo: comprador.correo,
    password: 'Clave1234',
    rol: 'comprador',
    codigo_cpr: comprador.codigo_cpr,
  });
  const tipo = await Tipo.findOne({ where: { nombre: 'Pescado' } });
  const lote = await Lote.create({ kilos: 5, numero_cajas: 1, precio_kilo_salida: 20 });
  await Especie.create({ nombre: 'Pargo reservado', id_tpo: tipo.id_tpo, id_lte: lote.id_lte });
  const pedido = await Pedido.create({
    id_usuario: usuario.id,
    codigo_cpr: comprador.codigo_cpr,
    entrega: 'recoger',
    subtotal: 100,
    costo_envio: 0,
    total: 100,
    estado: 'pendiente_pago',
    reservado_hasta: new Date(Date.now() + 60_000),
  });
  await PedidoItem.create({ id_ped: pedido.id_ped, id_lte: lote.id_lte, kilos: 5, precio_kilo: 20, subtotal: 100 });

  const admin = cliente(srv.base);
  await admin.entrar('admin', 'AdminPrueba123');
  const formulario = await admin.get('/compras/crear');
  assert.match(formulario.texto, /Reservado por un pedido en línea hasta/);
  assert.match(formulario.texto, new RegExp(`id="id_cmp_${lote.id_lte}"[^>]*disabled`));

  const respuesta = await admin.post('/compras', {
    id_cmp: lote.id_lte,
    codigo_cpr: comprador.codigo_cpr,
    precio_kilo_final: '25',
  });
  assert.equal(respuesta.status, 400);
  assert.match(respuesta.texto, /reservado por un pedido en línea/);
  assert.equal(await Compra.findByPk(lote.id_lte), null);
  assert.equal((await Pedido.findByPk(pedido.id_ped)).estado, 'pendiente_pago');
});
