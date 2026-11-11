// Filtros de búsqueda por entidad, chips y combinación con búsqueda/orden (Fase 4).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Compra, Lote, Comprador, Especie, Tipo, Usuario } = modelos;

let srv, c, pescado, marisco, molusco, ana, beto, carla, lotePulpo;

before(async () => {
  srv = await arrancar();
  c = cliente(srv.base);

  pescado = await Tipo.findOne({ where: { nombre: "Pescado" } });
  marisco = await Tipo.findOne({ where: { nombre: "Marisco" } });
  molusco = await Tipo.findOne({ where: { nombre: "Molusco" } });

  ana = await Comprador.create({ nombre: "Ana", apellido_paterno: "Perez", correo: "ana@example.com" });
  beto = await Comprador.create({ nombre: "Beto", apellido_paterno: "Ruiz", correo: "beto@example.com" });
  carla = await Comprador.create({ nombre: "Carla", apellido_paterno: "Sola", correo: "carla@example.com" });

  // 31 de octubre 23:30 en México = 1 de noviembre 05:30 UTC.
  const lote1 = await Lote.create({ kilos: 10, numero_cajas: 1, precio_kilo_salida: 50, fecha: new Date("2026-11-01T05:30:00Z") });
  await Especie.create({ nombre: "Huachinango", id_lte: lote1.id_lte, id_tpo: pescado.id_tpo });
  await Compra.create({ id_cmp: lote1.id_lte, codigo_cpr: ana.codigo_cpr, precio_kilo_final: 100, precio_total: 1000, fecha: new Date("2026-11-01T05:30:00Z") });

  const lote2 = await Lote.create({ kilos: 20, numero_cajas: 2, precio_kilo_salida: 60, fecha: new Date("2026-11-02T16:00:00Z") });
  await Especie.create({ nombre: "Camarón", id_lte: lote2.id_lte, id_tpo: marisco.id_tpo });
  await Compra.create({ id_cmp: lote2.id_lte, codigo_cpr: beto.codigo_cpr, precio_kilo_final: 100, precio_total: 2000, fecha: new Date("2026-11-02T16:00:00Z") });

  lotePulpo = await Lote.create({ kilos: 50, numero_cajas: 5, precio_kilo_salida: 40, fecha: new Date("2026-11-03T16:00:00Z") });
  await Especie.create({ nombre: "Pulpo", id_lte: lotePulpo.id_lte, id_tpo: molusco.id_tpo });

  const lote4 = await Lote.create({ kilos: 30, numero_cajas: 3, precio_kilo_salida: 70, fecha: new Date("2026-11-04T16:00:00Z") });
  await Especie.create({ nombre: "Sardina", id_lte: lote4.id_lte, id_tpo: pescado.id_tpo });
  await Compra.create({ id_cmp: lote4.id_lte, codigo_cpr: ana.codigo_cpr, precio_kilo_final: 100, precio_total: 3000, fecha: new Date("2026-11-04T16:00:00Z") });

  await c.entrar("admin", "AdminPrueba123");
});

after(() => srv.cerrar());

test("compras: 'desde' respeta la zona horaria de México", async () => {
  const r = await c.get("/compras?desde=2026-11-01");
  assert.equal(r.status, 200);
  assert.match(r.texto, /Camarón/);
  assert.match(r.texto, /Sardina/);
  // Compra del 31 de octubre a las 23:30 (hora de México): queda fuera.
  assert.doesNotMatch(r.texto, /Huachinango/);
  assert.match(r.texto, /Filtros · 1/);
  assert.match(r.texto, /Desde: 2026-11-01/);
});

test("compras: comprador + rango de total + orden", async () => {
  const r = await c.get(`/compras?comprador=${beto.codigo_cpr}&totalMin=1500&totalMax=2500&orden=total&dir=desc`);
  assert.match(r.texto, /Camarón/);
  assert.doesNotMatch(r.texto, /Huachinango/);
  assert.doesNotMatch(r.texto, /Sardina/);
  assert.match(r.texto, /Comprador: Beto Ruiz/);
  assert.match(r.texto, /Total mínimo: 1500/);
  assert.match(r.texto, /aria-sort="descending"/);
});

test("lotes: estado disponibles / vendidos", async () => {
  const disp = await c.get("/lotes?estado=disponibles");
  assert.match(disp.texto, /Pulpo/);
  assert.doesNotMatch(disp.texto, /Huachinango/);

  const vend = await c.get("/lotes?estado=vendidos");
  assert.match(vend.texto, /Huachinango/);
  assert.match(vend.texto, /Camarón/);
  assert.doesNotMatch(vend.texto, /Pulpo/);
});

test("lotes: tipo de especie y rango de kilos", async () => {
  const r = await c.get(`/lotes?tipo=${marisco.id_tpo}&kilosMin=15&kilosMax=25`);
  assert.match(r.texto, /Camarón/);
  assert.doesNotMatch(r.texto, /Huachinango/);
  assert.doesNotMatch(r.texto, /Pulpo/);
});

test("especies: tipo y estado del lote", async () => {
  const mol = await c.get(`/especies?tipo=${molusco.id_tpo}`);
  assert.match(mol.texto, /Pulpo/);
  assert.doesNotMatch(mol.texto, /Huachinango/);

  const vend = await c.get("/especies?estado=vendidos");
  assert.match(vend.texto, /Huachinango/);
  assert.match(vend.texto, /Camarón/);
  assert.doesNotMatch(vend.texto, /Pulpo/);
});

test("compradores: con compras / sin compras", async () => {
  const con = await c.get("/compradores?compras=con");
  assert.match(con.texto, /Ana Perez/);
  assert.match(con.texto, /Beto Ruiz/);
  assert.doesNotMatch(con.texto, /Carla Sola/);

  const sin = await c.get("/compradores?compras=sin");
  assert.match(sin.texto, /Carla Sola/);
  assert.doesNotMatch(sin.texto, /Ana Perez/);
});

test("usuarios: rol y correo verificado", async () => {
  const alta = await c.post("/usuarios", {
    usuario: "capfiltro",
    nombre_completo: "Cap Filtro",
    correo: "capfiltro@example.com",
    rol: "capturista",
    acceso: "manual",
    password: "Captura1234",
    password_confirmar: "Captura1234",
  });
  assert.equal(alta.status, 302);

  const cap = await c.get("/usuarios?rol=capturista");
  assert.match(cap.texto, /@capfiltro/);

  const adm = await c.get("/usuarios?rol=admin");
  assert.doesNotMatch(adm.texto, /@capfiltro/);

  await Usuario.update({ email_verificado: true }, { where: { usuario: "capfiltro" } });
  const ver = await c.get("/usuarios?verificado=verificado");
  assert.match(ver.texto, /@capfiltro/);
  const sin = await c.get("/usuarios?verificado=sin");
  assert.doesNotMatch(sin.texto, /@capfiltro/);
});

test("búsqueda + filtro + orden se combinan", async () => {
  const r = await c.get(`/compras?q=ana&tipo=${pescado.id_tpo}&orden=total&dir=asc&tam=10`);
  assert.match(r.texto, /Huachinango/);
  assert.match(r.texto, /Sardina/);
  assert.doesNotMatch(r.texto, /Camarón/);
  assert.match(r.texto, /aria-sort="ascending"/);
  // El orden ascendente deja primero el total de 1000.
  assert.ok(r.texto.indexOf("$1,000.00") < r.texto.indexOf("$3,000.00"));
});

test("los filtros se conservan en los enlaces de paginación", async () => {
  // 12 compras más en noviembre para superar una página con tam=10.
  for (let i = 0; i < 12; i++) {
    const lote = await Lote.create({ kilos: 1, numero_cajas: 1, precio_kilo_salida: 1, fecha: new Date("2026-11-05T16:00:00Z") });
    await Especie.create({ nombre: `Extra ${i}`, id_lte: lote.id_lte, id_tpo: pescado.id_tpo });
    await Compra.create({ id_cmp: lote.id_lte, codigo_cpr: carla.codigo_cpr, precio_kilo_final: 1, precio_total: 10 + i, fecha: new Date("2026-11-05T16:00:00Z") });
  }

  const r = await c.get("/compras?desde=2026-11-01&tam=10");
  assert.match(r.texto, /Mostrando 1–10 de 14 compras/);
  assert.match(r.texto, /href="\/compras\?[^"]*desde=2026-11-01[^"]*pagina=2/);
  assert.match(r.texto, /href="\/compras\?[^"]*tam=10[^"]*pagina=2/);
});

test("valores inválidos se ignoran sin romper", async () => {
  const r = await c.get("/compras?desde=2026-13-99&tipo=abc&totalMin=-5");
  assert.equal(r.status, 200);
  assert.match(r.texto, /Huachinango/);
  assert.match(r.texto, /Camarón/);
  assert.doesNotMatch(r.texto, /Filtros ·/);
});
