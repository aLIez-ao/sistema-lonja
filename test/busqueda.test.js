// Buscador con sugerencias y filtrado de listados (Fase 3).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Compra, Lote, Comprador, Especie, Tipo } = modelos;

let srv, c, especieHuach, especiePorcentaje, comprador;

before(async () => {
  srv = await arrancar();
  c = cliente(srv.base);

  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  comprador = await Comprador.create({
    nombre: "Ana",
    apellido_paterno: "Huerta",
    correo: "ana.huerta@example.com",
  });

  const lote = await Lote.create({ kilos: 12.5, numero_cajas: 2, precio_kilo_salida: 90, fecha: new Date(2026, 10, 5, 8, 0, 0) });
  especieHuach = await Especie.create({ nombre: "Huachinango", id_lte: lote.id_lte, id_tpo: tipo.id_tpo });
  especiePorcentaje = await Especie.create({ nombre: "Pez 100%", id_lte: lote.id_lte, id_tpo: tipo.id_tpo });
  await Compra.create({ id_cmp: lote.id_lte, codigo_cpr: comprador.codigo_cpr, precio_kilo_final: 100, precio_total: 1250, fecha: new Date(2026, 10, 5, 9, 0, 0) });

  await c.entrar("admin", "AdminPrueba123");
});

after(() => srv.cerrar());

const json = (r) => JSON.parse(r.texto);

test("sugerencias de especies: 'huach' propone Huachinango con su enlace", async () => {
  const r = await c.get("/buscar/sugerencias?entidad=especies&q=huach");
  assert.equal(r.status, 200);
  const datos = json(r);
  assert.equal(datos.length, 1);
  assert.equal(datos[0].titulo, "Huachinango");
  assert.equal(datos[0].url, `/especies/${especieHuach.id_epe}/editar`);
  assert.match(datos[0].subtitulo, /Pescado · Lote #/);
});

test("sugerencias de compras: busca por nombre del comprador", async () => {
  const r = await c.get("/buscar/sugerencias?entidad=compras&q=huerta");
  const datos = json(r);
  assert.equal(datos.length, 1);
  assert.match(datos[0].titulo, /^Compra #\d+ · Ana Huerta$/);
  assert.match(datos[0].subtitulo, /\$1,250\.00/);
});

test("los comodines de LIKE se buscan literalmente", async () => {
  // "%" es de un solo carácter: el endpoint exige 2 y devuelve [].
  assert.deepEqual(json(await c.get("/buscar/sugerencias?entidad=especies&q=%25")), []);

  // "0%" solo coincide con el nombre que lo contiene, no con todo el catálogo.
  const r = await c.get("/buscar/sugerencias?entidad=especies&q=0%25");
  const datos = json(r);
  assert.equal(datos.length, 1);
  assert.equal(datos[0].titulo, "Pez 100%");
});

test("el listado aplica el mismo filtro que las sugerencias", async () => {
  const huach = await c.get("/especies?q=huach");
  assert.equal(huach.status, 200);
  assert.match(huach.texto, /Huachinango/);
  assert.doesNotMatch(huach.texto, /Pez 100%/);

  const pct = await c.get("/especies?q=0%25");
  assert.match(pct.texto, /Pez 100%/);
  assert.doesNotMatch(pct.texto, /Huachinango/);

  // Un texto sin coincidencias muestra la fila vacía, no la tabla completa.
  const nada = await c.get("/especies?q=zzzz");
  assert.match(nada.texto, /No hay registros que coincidan con la búsqueda\./);
  assert.doesNotMatch(nada.texto, /Huachinango/);
});

test("usuarios: solo el administrador puede pedir sugerencias", async () => {
  const alta = await c.post("/usuarios", {
    usuario: "capbusca",
    nombre_completo: "Capturista Busca",
    correo: "capbusca@example.com",
    rol: "capturista",
    acceso: "manual",
    password: "Captura1234",
    password_confirmar: "Captura1234",
  });
  assert.equal(alta.status, 302);

  const admin = await c.get("/buscar/sugerencias?entidad=usuarios&q=capbusca");
  assert.equal(admin.status, 200);
  assert.equal(json(admin).length, 1);

  const cap = cliente(srv.base);
  await cap.entrar("capbusca", "Captura1234");
  const prohibido = await cap.get("/buscar/sugerencias?entidad=usuarios&q=capbusca");
  assert.equal(prohibido.status, 403);

  // Otras entidades sí funcionan para un capturista.
  const especies = await cap.get("/buscar/sugerencias?entidad=especies&q=huach");
  assert.equal(especies.status, 200);
  assert.equal(json(especies).length, 1);
});

test("entidad desconocida o texto corto devuelven lista vacía", async () => {
  assert.deepEqual(json(await c.get("/buscar/sugerencias?entidad=nada&q=huach")), []);
  assert.deepEqual(json(await c.get("/buscar/sugerencias?entidad=especies&q=h")), []);
});
