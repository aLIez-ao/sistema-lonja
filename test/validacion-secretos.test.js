import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarSecretosInicio } from '../helpers/validacionSecretos.js';

test('señala secretos de ejemplo en desarrollo sin incluir sus valores', () => {
  const resultado = validarSecretosInicio({
    NODE_ENV: 'development',
    SC_JWT: 'cambia_esta_clave_por_una_larga_y_aleatoria',
    ADMIN_PASSWORD: 'CambiaEstaClave123',
  });
  assert.equal(resultado.errores.length, 0);
  assert.equal(resultado.avisos.length, 2);
  assert.doesNotMatch(resultado.avisos.join(' '), /cambia_esta_clave|CambiaEstaClave123/);
});

test('rechaza secretos ausentes o de ejemplo en producción', () => {
  const resultado = validarSecretosInicio({
    NODE_ENV: 'production',
    SC_JWT: 'corta',
    ADMIN_PASSWORD: 'CambiaEstaClave123',
  });
  assert.equal(resultado.avisos.length, 0);
  assert.equal(resultado.errores.length, 2);
  assert.doesNotMatch(resultado.errores.join(' '), /corta|CambiaEstaClave123/);
});

test('acepta un secreto JWT largo y contraseña administrativa propia', () => {
  const resultado = validarSecretosInicio({
    NODE_ENV: 'production',
    SC_JWT: 'secreto-aleatorio-propio-con-32-caracteres-minimo',
    ADMIN_PASSWORD: 'otra-clave-propia',
  });
  assert.deepEqual(resultado, { errores: [], avisos: [] });
});
