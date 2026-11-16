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

test("la cola registra fallos devueltos y excepciones con el nombre del trabajo", async () => {
  const errores = [];
  const anterior = console.error;
  console.error = (linea) => errores.push(JSON.parse(linea));
  try {
    encolarTrabajo("envío de aviso", async () => ({ ok: false, error: "SMTP no disponible" }));
    encolarTrabajo("pdf", async () => { throw new Error("disco no disponible"); });
    await esperarColaTrabajos();
  } finally {
    console.error = anterior;
  }
  assert.equal(errores.length, 2);
  assert.equal(errores[0].trabajo, "envío de aviso");
  assert.match(errores[0].error, /SMTP/);
  assert.equal(errores[1].trabajo, "pdf");
  assert.match(errores[1].error.mensaje, /disco/);
});
