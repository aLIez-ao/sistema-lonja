import { test } from "node:test";
import assert from "node:assert/strict";
import { indiceSiguiente } from "../public/js/tienda-utils.js";

test("el carrusel de lotes calcula saltos de cuatro tarjetas sin salir de los extremos", () => {
  assert.equal(indiceSiguiente(0, 12, 4, 1), 4);
  assert.equal(indiceSiguiente(4, 12, 4, 1), 8);
  assert.equal(indiceSiguiente(8, 12, 4, 1), 11);
  assert.equal(indiceSiguiente(8, 12, 4, -1), 4);
  assert.equal(indiceSiguiente(2, 3, 4, -1), 0);
  assert.equal(indiceSiguiente(0, 0), -1);
});

import { extremosDeFila } from "../public/js/tienda-utils.js";

test("los extremos de una fila se calculan con el desplazamiento real, no con el índice de tarjeta", () => {
  // 1800 px de contenido en 700 px visibles: el tope de desplazamiento es 1100 px.
  assert.deepEqual(extremosDeFila(0, 1800, 700), { alInicio: true, alFinal: false });
  assert.deepEqual(extremosDeFila(600, 1800, 700), { alInicio: false, alFinal: false });
  assert.deepEqual(extremosDeFila(1099, 1800, 700), { alInicio: false, alFinal: true }, "la tolerancia absorbe el redondeo");
  assert.deepEqual(extremosDeFila(1100, 1800, 700), { alInicio: false, alFinal: true });
  assert.deepEqual(extremosDeFila(0, 500, 700), { alInicio: true, alFinal: true }, "si todo cabe, ambos extremos");
});
