import { test } from 'node:test';
import assert from 'node:assert/strict';
import { origenDePeticionValido, rutaVolver } from '../helpers/navegacion.js';

test('solo acepta retornos internos sin controles, espacios ni barras invertidas', () => {
  assert.equal(rutaVolver('/cuenta/pedidos?page=2#actual'), '/cuenta/pedidos?page=2#actual');
  for (const ruta of [
    '//evil.example/x',
    '/\\evil.example/x',
    '/cuenta\t/../acceso',
    '/cuenta/pedidos\n',
    '/ruta con espacios',
    'https://evil.example',
  ]) {
    assert.equal(rutaVolver(ruta), null, `rechaza ${JSON.stringify(ruta)}`);
  }
});

test('las solicitudes con efectos requieren origen o referer del mismo host', () => {
  const cabeceras = { host: 'lonja.example', origin: 'https://lonja.example', referer: 'https://lonja.example/cuenta' };
  const req = { get: (nombre) => cabeceras[nombre] };
  assert.equal(origenDePeticionValido(req), true);
  cabeceras.referer = 'https://evil.example/form';
  assert.equal(origenDePeticionValido(req), false);
  cabeceras.origin = undefined;
  assert.equal(origenDePeticionValido(req), false);
  cabeceras.referer = undefined;
  assert.equal(origenDePeticionValido(req), false);
});

test('APP_URL fija el origen de confianza cuando el proxy cambia Host', () => {
  const anterior = process.env.APP_URL;
  try {
    process.env.APP_URL = 'https://lonja.example/base';
    const cabeceras = {
      host: 'proxy-interno:8080',
      origin: 'https://lonja.example',
      referer: 'https://lonja.example/cuenta',
    };
    const req = { get: (nombre) => cabeceras[nombre] };
    assert.equal(origenDePeticionValido(req), true);
    cabeceras.origin = 'https://atacante.example';
    assert.equal(origenDePeticionValido(req), false);
    process.env.APP_URL = 'javascript:alert(1)';
    cabeceras.origin = 'https://lonja.example';
    assert.equal(origenDePeticionValido(req), false);
  } finally {
    if (anterior === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = anterior;
  }
});
