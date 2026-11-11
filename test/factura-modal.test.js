// Factura en modal: parcial sin layout y página completa (Fase 6).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Compra, Lote, Comprador, Especie, Tipo } = modelos;

let srv, c, compra;

before(async () => {
  srv = await arrancar();
  c = cliente(srv.base);

  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  const comprador = await Comprador.create({
    nombre: "Ana",
    apellido_paterno: "Huerta",
    correo: "ana.huerta@example.com",
  });
  const lote = await Lote.create({ kilos: 12.5, numero_cajas: 2, precio_kilo_salida: 90, fecha: new Date(2026, 10, 5, 8, 0, 0) });
  await Especie.create({ nombre: "Huachinango", id_lte: lote.id_lte, id_tpo: tipo.id_tpo });
  compra = await Compra.create({
    id_cmp: lote.id_lte,
    codigo_cpr: comprador.codigo_cpr,
    precio_kilo_final: 100,
    precio_total: 1250,
    fecha: new Date(2026, 10, 5, 9, 0, 0),
  });

  await c.entrar("admin", "AdminPrueba123");
});

after(() => srv.cerrar());

test("el parcial responde 200 sin barra de navegación ni pie de página", async () => {
  const r = await c.get(`/compras/${compra.id_cmp}/factura?parcial=1`);
  assert.equal(r.status, 200);
  assert.doesNotMatch(r.texto, /<!DOCTYPE/i);
  assert.doesNotMatch(r.texto, /<nav\b/i);
  assert.doesNotMatch(r.texto, /<main\b/i);
  assert.doesNotMatch(r.texto, /Sistema Lonja de Veracruz/);
  assert.match(r.texto, /class="factura-parcial"/);
  assert.match(r.texto, /data-folio="FAC-/);
  assert.match(r.texto, /class="hoja-carta factura"/);
  assert.match(r.texto, /Abrir en página/);
  assert.match(r.texto, /data-bs-dismiss="modal"/);
});

test("la página completa de la factura sigue funcionando", async () => {
  const r = await c.get(`/compras/${compra.id_cmp}/factura`);
  assert.equal(r.status, 200);
  assert.match(r.texto, /<!DOCTYPE/i);
  assert.match(r.texto, /<nav\b/i);
  assert.match(r.texto, /class="hoja-carta factura"/);
  assert.match(r.texto, /Volver a Compras/);
});

test("el listado de compras incluye el modal y el disparador", async () => {
  const r = await c.get("/compras");
  assert.equal(r.status, 200);
  assert.match(r.texto, /id="modalFactura"/);
  assert.match(r.texto, /data-factura-cuerpo/);
  assert.match(r.texto, new RegExp(`data-factura-modal data-id="${compra.id_cmp}"`));
  // El enlace conserva su href para funcionar sin JS.
  assert.match(r.texto, new RegExp(`href="/compras/${compra.id_cmp}/factura" data-factura-modal`));
});

test("una compra inexistente redirige al listado", async () => {
  const r = await c.get("/compras/99999/factura");
  assert.equal(r.status, 302);
  assert.equal(r.loc, "/compras");
});
