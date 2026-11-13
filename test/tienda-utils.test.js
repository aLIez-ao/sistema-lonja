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
