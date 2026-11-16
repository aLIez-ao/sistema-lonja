import { test } from "node:test";
import assert from "node:assert/strict";
import { rutaVolver } from "../helpers/navegacion.js";

test("solo acepta retornos internos sin controles, espacios ni barras invertidas", () => {
  assert.equal(rutaVolver("/cuenta/pedidos?page=2#actual"), "/cuenta/pedidos?page=2#actual");
  for (const ruta of ["//evil.example/x", "/\\evil.example/x", "/cuenta\t/../acceso", "/cuenta/pedidos\n", "/ruta con espacios", "https://evil.example"]) {
    assert.equal(rutaVolver(ruta), null, `rechaza ${JSON.stringify(ruta)}`);
  }
});
