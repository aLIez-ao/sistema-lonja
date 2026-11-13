// Pendientes de la auditoría: placeholder del login y páginas protegidas (Fase 7).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente } from "./ayuda.js";

let srv, c;

before(async () => {
  srv = await arrancar();
  c = cliente(srv.base);
});

after(() => srv.cerrar());

test("el login no simula una contraseña escrita", async () => {
  const r = await c.get("/acceso");
  assert.equal(r.status, 200);
  assert.match(r.texto, /placeholder="Tu contraseña"/);
  assert.doesNotMatch(r.texto, /placeholder="••••••••"/);
  assert.match(r.texto, /data-protegida="0"/);
});

test("las páginas con sesión se marcan como protegidas", async () => {
  const entrada = await c.entrar("admin", "AdminPrueba123");
  assert.equal(entrada.status, 302);

  const r = await c.get("/dashboard");
  assert.equal(r.status, 200);
  assert.match(r.texto, /data-protegida="1"/);
});
