// Fase 1: catálogo de especies, migración de las existentes y alta desde el formulario.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { rellenarCatalogoEspecies } from "../helpers/migraciones.js";

const { Lote, Especie, EspecieCatalogo } = modelos;
let srv, admin;

before(async () => {
  srv = await arrancar();
  admin = cliente(srv.base);
  await admin.entrar("admin", "AdminPrueba123");
});
after(() => srv.cerrar());

const loteDePrueba = (kilos = 100) => Lote.create({ kilos, numero_cajas: 10, precio_kilo_salida: 50 });

test("la migración crea el catálogo desde las especies existentes y es idempotente", async () => {
  const lote = await loteDePrueba(80);
  await Especie.bulkCreate([
    { nombre: "Huachinango", id_lte: lote.id_lte, id_tpo: 1, imagen: "/img/Huachinango.webp" },
    { nombre: "huachinango", id_lte: lote.id_lte, id_tpo: 1, imagen: null },
    { nombre: "Camarón", id_lte: lote.id_lte, id_tpo: 2, imagen: "/img/Camaron.webp" },
  ]);

  const primera = await rellenarCatalogoEspecies();
  assert.equal(primera.creados, 2);
  assert.equal(primera.asignados, 3);

  const segunda = await rellenarCatalogoEspecies();
  assert.equal(segunda.creados, 0);
  assert.equal(segunda.asignados, 0);

  assert.equal(await EspecieCatalogo.count(), 2);
  const huachi = await EspecieCatalogo.findOne({ where: { nombre: "Huachinango" } });
  assert.equal(huachi.id_tpo, 1);
  assert.equal(huachi.imagen, "/img/Huachinango.webp");
  assert.equal(await Especie.count({ where: { id_cat: huachi.id_cat } }), 2);
  assert.equal(await Especie.count({ where: { id_cat: null } }), 0);
});

test("el catálogo se lista, se busca y rechaza nombres duplicados sin distinguir mayúsculas", async () => {
  assert.equal((await admin.get("/catalogo")).status, 200);

  const alta = await admin.post("/catalogo", { nombre: "Corvina", id_tpo: "1", descripcion: "Pescado blanco de estero" });
  assert.equal(alta.status, 302);
  const corvina = await EspecieCatalogo.findOne({ where: { nombre: "Corvina" } });
  assert.ok(corvina);

  const dup = await admin.post("/catalogo", { nombre: "corvina", id_tpo: "1", descripcion: "" });
  assert.equal(dup.status, 400);
  assert.match(dup.texto, /Ya existe una especie con ese nombre/);

  const busqueda = await admin.get("/catalogo?q=corv");
  assert.equal(busqueda.status, 200);
  assert.match(busqueda.texto, /Corvina/);

  const filtro = await admin.get("/catalogo?activo=inactivo");
  assert.equal(filtro.status, 200);
  assert.doesNotMatch(filtro.texto, /Corvina/);
});

test("el alta por fetch devuelve JSON y la desactivación conserva el catálogo", async () => {
  const r = await fetch(srv.base + "/catalogo", {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: [...admin.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({ nombre: "Sierra", id_tpo: "1", descripcion: "" }).toString(),
  });
  assert.equal(r.status, 201);
  const cuerpo = await r.json();
  assert.equal(cuerpo.ok, true);
  assert.equal(cuerpo.especie.nombre, "Sierra");
  assert.equal(cuerpo.especie.tipo, "Pescado");

  const corvina = await EspecieCatalogo.findOne({ where: { nombre: "Corvina" } });
  const lote = await loteDePrueba(50);
  await Especie.create({ nombre: corvina.nombre, id_lte: lote.id_lte, id_tpo: corvina.id_tpo, id_cat: corvina.id_cat });

  const baja = await admin.post(`/catalogo/${corvina.id_cat}?_method=DELETE`, {});
  assert.equal(baja.status, 302);
  assert.equal((await EspecieCatalogo.findByPk(corvina.id_cat)).activo, false);
  assert.equal(await Especie.count({ where: { id_cat: corvina.id_cat } }), 1, "las especies capturadas se conservan");

  const reactivar = await admin.post(`/catalogo/${corvina.id_cat}/activar`, {});
  assert.equal(reactivar.status, 302);
  assert.equal((await EspecieCatalogo.findByPk(corvina.id_cat)).activo, true);
});

test("el catálogo está protegido y el capturista no puede desactivarlo", async () => {
  assert.equal((await cliente(srv.base).get("/catalogo")).status, 302);

  const alta = await admin.post("/usuarios", { usuario: "cat1", nombre_completo: "Catálogo Uno", correo: "cat1@example.com", rol: "capturista", acceso: "manual", password: "Captura1234", password_confirmar: "Captura1234" });
  assert.equal(alta.status, 302);
  const capt = cliente(srv.base);
  await capt.entrar("cat1", "Captura1234");
  assert.equal((await capt.get("/catalogo")).status, 200);

  const cuerpo = await capt.get("/catalogo");
  assert.doesNotMatch(cuerpo.texto, /_method=DELETE/, "los botones de desactivar son solo del admin");

  const sierra = await EspecieCatalogo.findOne({ where: { nombre: "Sierra" } });
  const r = await capt.post(`/catalogo/${sierra.id_cat}?_method=DELETE`, {});
  assert.equal(r.status, 403);
});
