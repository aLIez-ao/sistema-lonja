import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Usuario } = modelos;
let srv;
let personal;
let comprador;

before(async () => {
  srv = await arrancar();
  personal = await Usuario.create({ usuario: "panel-cap", nombre_completo: "Panel Capturista", correo: "panel-cap@example.test", password: "Clave1234", rol: "capturista", email_verificado: true });
  comprador = await Usuario.create({ usuario: "panel-cli", nombre_completo: "Panel Cliente", correo: "panel-cli@example.test", password: "Clave1234", rol: "comprador", email_verificado: true });
});
after(async () => srv.cerrar());

test("el panel usa /dashboard y /inicio conserva una redirección permanente", async () => {
  const anonimo = cliente(srv.base);
  assert.deepEqual(
    [(await anonimo.get("/dashboard")).status, (await anonimo.get("/dashboard")).loc],
    [302, "/acceso?volver=%2Fdashboard"],
  );
  const legado = await anonimo.get("/inicio");
  assert.equal(legado.status, 301);
  assert.equal(legado.loc, "/dashboard");

  const trabajador = cliente(srv.base);
  assert.equal((await trabajador.entrar(personal.usuario, "Clave1234")).loc, "/dashboard");
  const panel = await trabajador.get("/dashboard");
  assert.equal(panel.status, 200);
  assert.match(panel.texto, /href="\/dashboard"[^>]*>.*Dashboard/s);
  assert.match(panel.texto, /href="\/"[^>]*>.*Tienda.*ver como cliente/s);
  assert.match(panel.texto, /navbar-brand" href="\/"/);

  const clienteWeb = cliente(srv.base);
  assert.equal((await clienteWeb.entrar(comprador.usuario, "Clave1234")).loc, "/");
  assert.equal((await clienteWeb.get("/dashboard")).status, 403);
  const tienda = await clienteWeb.get("/");
  assert.match(tienda.texto, /navbar-brand" href="\/"/);
  assert.doesNotMatch(tienda.texto, />Dashboard</);
});
