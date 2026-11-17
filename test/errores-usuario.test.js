import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorDeUsuario, ErrorImagen } from '../compartido/ayudantes/utiles.js';
import { guardarImagenDataURL } from '../compartido/ayudantes/imagenes.js';

test('ErrorDeUsuario conserva su estado HTTP y distingue errores de validación', () => {
  const error = new ErrorDeUsuario('lote reservado', 409);
  assert.equal(error.message, 'lote reservado');
  assert.equal(error.estado, 409);
  assert.ok(error instanceof Error);
});

test('las entradas de imagen inválidas tienen un tipo explícito y un mensaje seguro', async () => {
  await assert.rejects(
    guardarImagenDataURL('data:text/plain;base64,dGVzdA=='),
    (error) => error instanceof ErrorImagen && error.message === 'La imagen debe ser un archivo JPG, PNG o WebP',
  );
});
