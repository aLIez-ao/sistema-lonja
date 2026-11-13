// Fase 1: reglas de los formularios de administración (lotes, especies y
// catálogo) y sincronización de las especies de un lote.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Lote, Especie, EspecieCatalogo, Compra, Comprador } = modelos;
let srv, admin;

before(async () => {
  srv = await arrancar();
  admin = cliente(srv.base);
  await admin.entrar("admin", "AdminPrueba123");
});
after(() => srv.cerrar());

/** Mensaje de error que viaja en la redirección (?error=…), ya decodificado. */
const errorDe = (r) => new URLSearchParams((r.loc || "").split("?")[1] || "").get("error");

const catalogo = (nombre, id_tpo = 1, activo = true) =>
  EspecieCatalogo.create({ nombre, id_tpo, activo, imagen: `/img/${nombre}.webp` });

const nuevoLote = (datos = {}) =>
  Lote.create({ kilos: 100, numero_cajas: 10, precio_kilo_salida: 50, ...datos });

let huachi, camaron, pulpo;
let lote;

test("un lote sin especies se rechaza y no deja registros a medias", async () => {
  const antes = await Lote.count();
  const sin = await admin.post("/lotes", { kilos: "10", numero_cajas: "1", precio_kilo_salida: "5" });
  assert.equal(sin.status, 400);
  assert.match(sin.texto, /al menos una especie/);
  assert.equal(await Lote.count(), antes);

  // Un id de catálogo inexistente tampoco crea el lote: la transacción se revierte.
  const malo = await admin.post("/lotes", {
    kilos: "10", numero_cajas: "1", precio_kilo_salida: "5", especies: "999999",
  });
  assert.equal(malo.status, 400);
  assert.match(malo.texto, /ya no existe en el catálogo/);
  assert.equal(await Lote.count(), antes);
});

test("al registrar un lote sus especies copian nombre, tipo e imagen del catálogo", async () => {
  huachi = await catalogo("Huachinango", 1);
  camaron = await catalogo("Camarón", 2);

  const r = await admin.post("/lotes", {
    kilos: "120.50",
    numero_cajas: "8",
    precio_kilo_salida: "45",
    // La lista separada por comas también se acepta (p. ej. desde el cliente).
    especies: `${huachi.id_cat},${camaron.id_cat}`,
  });
  assert.equal(r.status, 302);
  lote = await Lote.findOne({ order: [["id_lte", "DESC"]] });

  const especies = await Especie.findAll({ where: { id_lte: lote.id_lte }, order: [["id_epe", "ASC"]] });
  assert.equal(especies.length, 2);
  assert.deepEqual(especies.map((e) => e.nombre).sort(), ["Camarón", "Huachinango"]);
  const h = especies.find((e) => e.nombre === "Huachinango");
  assert.equal(h.id_cat, huachi.id_cat);
  assert.equal(h.id_tpo, 1);
  assert.equal(h.imagen, "/img/Huachinango.webp");

  const form = await admin.get(`/lotes/${lote.id_lte}/editar`);
  assert.equal(form.status, 200);
  assert.match(form.texto, new RegExp(`name="especies" value="${huachi.id_cat}" checked`));
  assert.match(form.texto, new RegExp(`name="especies" value="${camaron.id_cat}" checked`));
});

test("editar un lote agrega y quita especies sin tocar las demás", async () => {
  pulpo = await catalogo("Pulpo", 3);
  const r = await admin.post(`/lotes/${lote.id_lte}?_method=PUT`, {
    kilos: "130",
    numero_cajas: "9",
    precio_kilo_salida: "48",
    especies: [String(camaron.id_cat), String(pulpo.id_cat)],
  });
  assert.equal(r.status, 302);

  const nombres = (await Especie.findAll({ where: { id_lte: lote.id_lte } })).map((e) => e.nombre).sort();
  assert.deepEqual(nombres, ["Camarón", "Pulpo"]);

  const pulpoLote = await Especie.findOne({ where: { id_lte: lote.id_lte, id_cat: pulpo.id_cat } });
  assert.equal(pulpoLote.id_tpo, 3);
  assert.equal(pulpoLote.imagen, "/img/Pulpo.webp");
});

test("la especie de un lote se crea desde el catálogo y no se repite", async () => {
  const jaiba = await catalogo("Jaiba", 2);
  const alta = await admin.post("/especies", { id_lte: String(lote.id_lte), id_cat: String(jaiba.id_cat) });
  assert.equal(alta.status, 302);

  const creada = await Especie.findOne({ where: { id_lte: lote.id_lte, id_cat: jaiba.id_cat } });
  assert.ok(creada);
  assert.equal(creada.nombre, "Jaiba");
  assert.equal(creada.id_tpo, 2);
  assert.equal(creada.imagen, "/img/Jaiba.webp");

  const repetida = await admin.post("/especies", { id_lte: String(lote.id_lte), id_cat: String(jaiba.id_cat) });
  assert.equal(repetida.status, 400);
  assert.match(repetida.texto, /ya tiene registrada esta especie/);

  // El selector no ofrece lotes ya vendidos.
  const libre = await nuevoLote({ kilos: 20 });
  const form = await admin.get("/especies/crear");
  assert.equal(form.status, 200);
  assert.match(form.texto, new RegExp(`name="id_lte" value="${libre.id_lte}"`));
});

test("el catálogo desactivado no se ofrece en lotes nuevos pero se conserva al editar", async () => {
  await pulpo.update({ activo: false });

  const crear = await admin.get("/lotes/crear");
  assert.equal(crear.status, 200);
  assert.doesNotMatch(crear.texto, /Pulpo/);

  const editar = await admin.get(`/lotes/${lote.id_lte}/editar`);
  assert.equal(editar.status, 200);
  assert.match(editar.texto, /Pulpo/);
  assert.match(editar.texto, /inactiva/);

  // Aun así no se puede agregar una especie desactivada a otro lote.
  const otro = await nuevoLote();
  const r = await admin.post("/lotes", {
    kilos: "5", numero_cajas: "1", precio_kilo_salida: "5", especies: String(pulpo.id_cat),
  });
  assert.equal(r.status, 400);
  assert.match(r.texto, /está desactivada/);
  assert.equal(await Especie.count({ where: { id_lte: otro.id_lte } }), 0);
});

test("un lote vendido bloquea la edición y el borrado de sus especies", async () => {
  const cpr = await Comprador.create({ nombre: "Ana", apellido_paterno: "Ruiz", correo: "ana@example.com" });
  await Compra.create({
    id_cmp: lote.id_lte,
    codigo_cpr: cpr.codigo_cpr,
    precio_kilo_final: 60,
    precio_total: 7800,
  });

  const form = await admin.get(`/lotes/${lote.id_lte}/editar`);
  assert.equal(form.status, 302);
  assert.match(errorDe(form), /ya fue vendido/);

  const put = await admin.post(`/lotes/${lote.id_lte}?_method=PUT`, {
    kilos: "1", numero_cajas: "1", precio_kilo_salida: "1", especies: String(camaron.id_cat),
  });
  assert.equal(put.status, 302);
  assert.match(errorDe(put), /ya fue vendido/);

  const del = await admin.post(`/lotes/${lote.id_lte}?_method=DELETE`, {});
  assert.equal(del.status, 302);
  assert.match(errorDe(del), /ya fue vendido/);
  assert.ok(await Lote.findByPk(lote.id_lte), "el lote sigue existiendo");

  const especie = await Especie.findOne({ where: { id_lte: lote.id_lte } });
  const espForm = await admin.get(`/especies/${especie.id_epe}/editar`);
  assert.equal(espForm.status, 302);
  assert.match(errorDe(espForm), /ya fue vendido/);

  const espPut = await admin.post(`/especies/${especie.id_epe}?_method=PUT`, {
    id_lte: String(lote.id_lte), id_cat: String(camaron.id_cat),
  });
  assert.equal(espPut.status, 302);
  assert.match(errorDe(espPut), /ya fue vendido/);

  const espDel = await admin.post(`/especies/${especie.id_epe}?_method=DELETE`, {});
  assert.equal(espDel.status, 302);
  assert.match(errorDe(espDel), /ya fue vendido/);
  assert.ok(await Especie.findByPk(especie.id_epe), "la especie sigue existiendo");

  const nueva = await catalogo("Robalo", 1);
  const espAlta = await admin.post("/especies", { id_lte: String(lote.id_lte), id_cat: String(nueva.id_cat) });
  assert.equal(espAlta.status, 302);
  assert.match(errorDe(espAlta), /ya fue vendido/);

  const altaDesdeLote = await admin.get(`/especies/crear?lote=${lote.id_lte}`);
  assert.equal(altaDesdeLote.status, 302);
  assert.match(errorDe(altaDesdeLote), /ya fue vendido/);

  // El lote vendido desaparece del selector de lotes, pero los libres siguen.
  const libre = await nuevoLote({ kilos: 30 });
  const selector = await admin.get("/especies/crear");
  assert.equal(selector.status, 200);
  assert.doesNotMatch(selector.texto, new RegExp(`name="id_lte" value="${lote.id_lte}"`));
  assert.match(selector.texto, new RegExp(`name="id_lte" value="${libre.id_lte}"`));
});
