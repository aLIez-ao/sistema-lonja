import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, cliente, db } from './ayuda.js';

let servidor;

before(async () => {
  servidor = await arrancar();
});

after(async () => {
  await servidor.cerrar();
});

test('salud devuelve 200 sin incluir detalles sensibles cuando la base responde', async () => {
  const autenticarOriginal = db.authenticate.bind(db);
  db.authenticate = async () => {};
  try {
    const respuesta = await cliente(servidor.base).get('/salud');
    assert.equal(respuesta.status, 200);
    assert.deepEqual(JSON.parse(respuesta.texto), { bd: 'ok' });
  } finally {
    db.authenticate = autenticarOriginal;
  }
});

test('salud devuelve 503 sin filtrar errores de conexión', async () => {
  const autenticarOriginal = db.authenticate.bind(db);
  db.authenticate = async () => {
    throw new Error('detalle privado de conexión');
  };
  try {
    const respuesta = await cliente(servidor.base).get('/salud');
    assert.equal(respuesta.status, 503);
    assert.deepEqual(JSON.parse(respuesta.texto), { bd: 'error' });
    assert.doesNotMatch(respuesta.texto, /detalle privado/);
  } finally {
    db.authenticate = autenticarOriginal;
  }
});
