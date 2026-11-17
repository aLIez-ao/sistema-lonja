import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registro } from '../helpers/registro.js';

test('LOG_NIVEL filtra niveles inferiores y emite eventos JSON', () => {
  const anterior = process.env.LOG_NIVEL;
  const salidas = { info: [], warn: [], error: [] };
  const consola = { info: console.info, warn: console.warn, error: console.error };
  process.env.LOG_NIVEL = 'warn';
  for (const nivel of Object.keys(salidas)) console[nivel] = (linea) => salidas[nivel].push(linea);

  try {
    registro.info('omitido');
    registro.warn('aviso', { cuenta: 1 });
    registro.error('fallo', new Error('mensaje técnico'));
  } finally {
    for (const nivel of Object.keys(consola)) console[nivel] = consola[nivel];
    if (anterior === undefined) delete process.env.LOG_NIVEL;
    else process.env.LOG_NIVEL = anterior;
  }

  assert.deepEqual(salidas.info, []);
  assert.equal(JSON.parse(salidas.warn[0]).evento, 'aviso');
  const error = JSON.parse(salidas.error[0]);
  assert.equal(error.error.nombre, 'Error');
  assert.equal(error.error.mensaje, 'mensaje técnico');
});
