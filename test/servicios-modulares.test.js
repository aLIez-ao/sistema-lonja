import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar } from './ayuda.js';
import { disponibilidadDeLotes } from '../modulos/catalogo/index.js';
import { crearPedido } from '../modulos/pedidos/index.js';
import { registrarCompraMostrador } from '../modulos/ventas/index.js';

let servidor;

before(async () => {
  servidor = await arrancar();
});

after(async () => servidor.cerrar());

test('el servicio de catálogo marca como inexistente un lote desconocido', async () => {
  const disponibilidad = await disponibilidadDeLotes([999999]);
  assert.equal(disponibilidad.get(999999).motivo, 'no_existe');
});

test('el servicio de pedidos rechaza una cuenta sin correo verificado antes de abrir una transacción', async () => {
  const resultado = await crearPedido({ usuario: { email_verificado: false }, entrega: 'recoger' });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.estado, 403);
});

test('el servicio de ventas no registra una compra si el lote ya no existe', async () => {
  const resultado = await registrarCompraMostrador({ idLote: 999999, codigoComprador: 1, precioFinal: 10 });
  assert.equal(resultado.error, 'El lote no existe');
});
