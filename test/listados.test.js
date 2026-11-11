// Listados uniformes: paginación numerada, orden en el servidor y
// normalización de parámetros (Fase 2).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Compra, Lote, Comprador, Especie, Tipo } = modelos;

let srv, c;

before(async () => {
  srv = await arrancar();
  c = cliente(srv.base);

  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });

  // 30 compradores con correo conocido para probar el orden de otra entidad
  await Comprador.bulkCreate(
    Array.from({ length: 30 }, (_, i) => ({
      nombre: `Cliente ${i + 1}`,
      apellido_paterno: `Apellido ${i + 1}`,
      correo: `c${i + 1}@example.com`,
    })),
  );
  const comprador = await Comprador.findOne({ where: { correo: "c1@example.com" } });

  // 30 lotes con kilos 10..39 y una compra por lote con total conocido 100..3000
  const lotes = await Lote.bulkCreate(
    Array.from({ length: 30 }, (_, i) => ({
      kilos: 10 + i,
      numero_cajas: 1 + (i % 5),
      precio_kilo_salida: 10 + i,
      fecha: new Date(2026, 0, i + 1, 6, 0, 0),
    })),
  );
  await Especie.bulkCreate(
    lotes.map((lote) => ({ nombre: `Especie ${lote.id_lte}`, id_lte: lote.id_lte, id_tpo: tipo.id_tpo })),
  );
  await Compra.bulkCreate(
    lotes.map((lote, i) => ({
      id_cmp: lote.id_lte,
      codigo_cpr: comprador.codigo_cpr,
      precio_kilo_final: 10,
      precio_total: (i + 1) * 100,
      fecha: new Date(2026, 0, i + 1, 6, 30, 0),
    })),
  );

  await c.entrar("admin", "AdminPrueba123");
});

after(() => srv.cerrar());

test("compras: ordenar por total ordena todo el registro, no solo la página", async () => {
  const r = await c.get("/compras?orden=total&dir=desc&tam=10");
  assert.equal(r.status, 200);
  // Página 1 descendente: los mayores totales globales (3000..2100)
  assert.match(r.texto, /\$3,000\.00/);
  assert.match(r.texto, /\$2,100\.00/);
  assert.doesNotMatch(r.texto, /\$2,000\.00/); // pertenece a la página 2
  assert.match(r.texto, /aria-sort="descending"/);

  const r2 = await c.get("/compras?orden=total&dir=desc&tam=10&pagina=2");
  assert.match(r2.texto, /\$2,000\.00/);
  assert.match(r2.texto, /\$1,100\.00/);
  assert.doesNotMatch(r2.texto, /\$3,000\.00/);
});

test("compras: paginador numerado y resumen", async () => {
  const r = await c.get("/compras?tam=10");
  assert.match(r.texto, /Mostrando 1–10 de 30 compras/);
  assert.match(r.texto, /aria-label="Primera página"/);
  assert.match(r.texto, /aria-label="Última página"/);
  assert.match(r.texto, /aria-current="page">1</);
  // 3 páginas: ventana 1..3 (no hay «…»)
  assert.match(r.texto, /aria-label="Página 2"/);
  assert.match(r.texto, /aria-label="Página 3"/);

  const ultima = await c.get("/compras?tam=10&pagina=3");
  assert.match(ultima.texto, /Mostrando 21–30 de 30 compras/);
  assert.match(ultima.texto, /aria-current="page">3</);
});

test("parámetros inválidos se normalizan sin romper", async () => {
  const r = await c.get("/compras?pagina=999&tam=7&orden=DROP&dir=lol");
  assert.equal(r.status, 200);
  // tam=7 no está permitido -> 25; orden inválido -> fecha desc; página 999 -> última
  assert.match(r.texto, /value="25" selected/);
  assert.match(r.texto, /Mostrando 26–30 de 30 compras/);
  assert.match(r.texto, /aria-current="page">2</);
});

test("otra entidad: compradores ordenados por código en el servidor", async () => {
  const desc = await c.get("/compradores?orden=codigo&dir=desc&tam=10");
  assert.equal(desc.status, 200);
  assert.match(desc.texto, />#30<\/span>/);
  assert.match(desc.texto, />#21<\/span>/);
  assert.doesNotMatch(desc.texto, />#20<\/span>/);

  const asc = await c.get("/compradores?orden=codigo&dir=asc&tam=10");
  assert.match(asc.texto, />#1<\/span>/);
  assert.match(asc.texto, />#10<\/span>/);
  assert.doesNotMatch(asc.texto, />#11<\/span>/);
});

test("el tamaño de página se conserva en los enlaces del paginador", async () => {
  const r = await c.get("/compras?tam=10");
  assert.match(r.texto, /href="\/compras\?[^"]*tam=10[^"]*pagina=2/);
});
