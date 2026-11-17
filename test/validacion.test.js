import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correoValido, telefonoValido } from '../compartido/ayudantes/validacion.js';

test('validación compartida de correo recorta espacios y rechaza formatos incompletos', () => {
  assert.equal(correoValido(' persona@ejemplo.mx '), true);
  assert.equal(correoValido('persona@ejemplo'), false);
  assert.equal(correoValido(''), false);
  assert.equal(correoValido(null), false);
});

test('validación compartida de teléfono acepta formatos admitidos y rechaza caracteres ajenos', () => {
  assert.equal(telefonoValido('+52 (229) 123-4567'), true);
  assert.equal(telefonoValido('123456'), false);
  assert.equal(telefonoValido('12345678x'), false);
  assert.equal(telefonoValido(undefined), false);
});
