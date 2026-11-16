import { test } from "node:test";
import assert from "node:assert/strict";
import { encolarTrabajo, esperarColaTrabajos } from "../helpers/colaTrabajos.js";

test("la cola difiere tareas y permite esperar a que se vacíe", async () => {
  const orden = [];
  assert.equal(encolarTrabajo("uno", async () => { orden.push(1); }), true);
  assert.equal(encolarTrabajo("dos", async () => { orden.push(2); }), true);
  assert.deepEqual(orden, []);
  await esperarColaTrabajos();
  assert.deepEqual(orden, [1, 2]);
});
