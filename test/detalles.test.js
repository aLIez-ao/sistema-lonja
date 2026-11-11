// Páginas de detalle y enlaces entre registros relacionados (Fase 5).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Compra, Lote, Comprador, Especie, Tipo } = modelos;

let srv, c, tipo, comprador, lote, especie;

before(async () => {
  srv = await arrancar();
  c = cliente(srv.base);

  tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  comprador = await Comprador.create({
    nombre: "Ana",
    apellido_paterno: "Huerta",
    apellido_materno: "Solis",
    correo: "ana.huerta@example.com",
    direccion: "Muelle 12, Veracruz",
  });
  lote = await Lote.create({ kilos: 12.5, numero_cajas: 2, precio_kilo_salida: 90, fecha: new Date(2026, 10, 5, 8, 0, 0) });
  especie = await Especie.create({ nombre: "Huachinango", id_lte: lote.id_lte, id_tpo: tipo.id_tpo });
  await Compra.create({
    id_cmp: lote.id_lte,
    codigo_cpr: comprador.codigo_cpr,
    precio_kilo_final: 100,
    precio_total: 1250,
    fecha: new Date(2026, 10, 5, 9, 0, 0),
  });

  await c.entrar("admin", "AdminPrueba123");
});

after(() => srv.cerrar());

test("detalle del comprador: contacto, indicadores y compras enlazadas", async () => {
  const r = await c.get(`/compradores/${comprador.codigo_cpr}`);
  assert.equal(r.status, 200);
  assert.match(r.texto, /Ana Huerta Solis/);
  assert.match(r.texto, /ana\.huerta@example\.com/);
  assert.match(r.texto, /Muelle 12, Veracruz/);
  assert.match(r.texto, /Total gastado/);
  assert.match(r.texto, /\$1,250\.00/);
  assert.match(r.texto, new RegExp(`href="/lotes/${lote.id_lte}"`));
  assert.match(r.texto, new RegExp(`href="/especies/${especie.id_epe}"`));
  assert.match(r.texto, new RegExp(`href="/compras/${lote.id_lte}/factura"`));
});

test("detalle del lote: datos, especies y venta enlazada", async () => {
  const r = await c.get(`/lotes/${lote.id_lte}`);
  assert.equal(r.status, 200);
  assert.match(r.texto, /Lote #\d+/);
  assert.match(r.texto, /Huachinango/);
  assert.match(r.texto, /Vendido/);
  assert.match(r.texto, new RegExp(`href="/compradores/${comprador.codigo_cpr}"`));
  assert.match(r.texto, new RegExp(`href="/especies/${especie.id_epe}"`));
  assert.match(r.texto, new RegExp(`href="/tipos/${tipo.id_tpo}"`));
  assert.match(r.texto, new RegExp(`href="/compras/${lote.id_lte}/factura"`));
});

test("detalle de la especie: tipo, lote y estado", async () => {
  const r = await c.get(`/especies/${especie.id_epe}`);
  assert.equal(r.status, 200);
  assert.match(r.texto, /Huachinango/);
  assert.match(r.texto, new RegExp(`href="/tipos/${tipo.id_tpo}"`));
  assert.match(r.texto, new RegExp(`href="/lotes/${lote.id_lte}"`));
  assert.match(r.texto, /Vendido/);
  assert.match(r.texto, new RegExp(`href="/compras/${lote.id_lte}/factura"`));
});

test("detalle del tipo: especies enlazadas", async () => {
  const r = await c.get(`/tipos/${tipo.id_tpo}`);
  assert.equal(r.status, 200);
  assert.match(r.texto, /Pescado/);
  assert.match(r.texto, new RegExp(`href="/especies/${especie.id_epe}"`));
  assert.match(r.texto, new RegExp(`href="/lotes/${lote.id_lte}"`));
  assert.match(r.texto, /Vendido/);
});

test("id inexistente redirige a la lista con un error", async () => {
  for (const [ruta, lista] of [
    ["/compradores/99999", "/compradores"],
    ["/lotes/99999", "/lotes"],
    ["/especies/99999", "/especies"],
    ["/tipos/99999", "/tipos"],
  ]) {
    const r = await c.get(ruta);
    assert.equal(r.status, 302);
    assert.ok(r.loc.startsWith(lista), `${ruta} → ${r.loc}`);
    assert.match(r.loc, /error=No%20se%20encontr%C3%B3%20el%20registro/);
  }
});

test("/crear sigue mostrando el formulario y no el detalle", async () => {
  for (const ruta of ["/compradores/crear", "/lotes/crear", "/especies/crear", "/tipos/crear"]) {
    const r = await c.get(ruta);
    assert.equal(r.status, 200, ruta);
    assert.match(r.texto, /<form/, ruta);
  }
});

test("la lista de compras enlaza lote, especies y comprador", async () => {
  const r = await c.get("/compras");
  assert.equal(r.status, 200);
  assert.match(r.texto, new RegExp(`href="/lotes/${lote.id_lte}"`));
  assert.match(r.texto, new RegExp(`href="/especies/${especie.id_epe}"`));
  assert.match(r.texto, new RegExp(`href="/compradores/${comprador.codigo_cpr}"`));
});

test("las sugerencias apuntan a las páginas de detalle", async () => {
  const lotes = JSON.parse((await c.get("/buscar/sugerencias?entidad=lotes&q=huach")).texto);
  assert.equal(lotes[0].url, `/lotes/${lote.id_lte}`);

  const especies = JSON.parse((await c.get("/buscar/sugerencias?entidad=especies&q=huach")).texto);
  assert.equal(especies[0].url, `/especies/${especie.id_epe}`);

  const compradores = JSON.parse((await c.get("/buscar/sugerencias?entidad=compradores&q=huerta")).texto);
  assert.equal(compradores[0].url, `/compradores/${comprador.codigo_cpr}`);

  const tipos = JSON.parse((await c.get("/buscar/sugerencias?entidad=tipos&q=pesc")).texto);
  assert.equal(tipos[0].url, `/tipos/${tipo.id_tpo}`);
});
