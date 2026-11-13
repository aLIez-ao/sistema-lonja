import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { nombrePublico } from "../helpers/tienda.js";
import { rutaReferer } from "../helpers/navegacion.js";

const { Usuario, Comprador, Tipo, Lote, Especie, EspecieCatalogo, Compra, Lista, ListaItem, Pregunta, Opinion } = modelos;
let srv;
before(async () => { srv = await arrancar(); });
after(async () => srv.cerrar());

async function comprador(alias) {
  const correo = `${alias}@example.com`;
  const c = await Comprador.create({ nombre: "Ana", apellido_paterno: "Prueba", correo });
  const u = await Usuario.create({ usuario: alias, nombre_completo: "Ana Prueba", correo, password: "Clave1234", rol: "comprador", codigo_cpr: c.codigo_cpr, email_verificado: true });
  const web = cliente(srv.base); await web.entrar(alias, "Clave1234"); return { c, u, web };
}
async function articulo() {
  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  const catalogo = await EspecieCatalogo.create({ nombre: `Especie${Date.now()}${Math.random().toString(36).slice(2, 5)}`, id_tpo: tipo.id_tpo, activo: true });
  const lote = await Lote.create({ kilos: 5, numero_cajas: 1, precio_kilo_salida: 20 });
  await Especie.create({ nombre: catalogo.nombre, id_cat: catalogo.id_cat, id_lte: lote.id_lte, id_tpo: tipo.id_tpo });
  return { catalogo, lote };
}

test("listas privadas: creación, duplicados y control de acceso al detalle", async () => {
  const a = await comprador("lista_a"), b = await comprador("lista_b");
  const { lote, catalogo } = await articulo();
  assert.equal((await a.web.post("/cuenta/listas", { nombre: "Mariscos" })).status, 302);
  const lista = await Lista.findOne({ where: { id_usuario: a.u.id, nombre: "Mariscos" } });
  await a.web.post(`/cuenta/listas/${lista.id_lista}/items`, { tipo: "lote", id_ref: lote.id_lte });
  await a.web.post(`/cuenta/listas/${lista.id_lista}/items`, { tipo: "lote", id_ref: lote.id_lte });
  assert.equal(await ListaItem.count({ where: { id_lista: lista.id_lista } }), 1);
  assert.equal((await b.web.get(`/cuenta/listas/${lista.id_lista}`)).status, 404);
  const invalido = await a.web.post(`/cuenta/listas/${lista.id_lista}/items`, { tipo: "lote", id_ref: "999999" });
  assert.equal(invalido.status, 302);
  assert.ok(invalido.loc.startsWith(`/cuenta/listas/${lista.id_lista}?error=`));
  assert.notEqual(invalido.loc, "back");
  await a.web.post(`/cuenta/listas/${lista.id_lista}/items`, { tipo: "especie", id_ref: catalogo.id_cat });
  assert.equal(await ListaItem.count({ where: { id_lista: lista.id_lista } }), 2);
  const cookies = [...a.web.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  for (const referer of ["https://evil.example/x", "//evil.example/x"]) {
    const r = await fetch(`${srv.base}/cuenta/favoritos`, { method: "POST", redirect: "manual", headers: { cookie: cookies, referer, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ tipo: "lote", id_ref: String(lote.id_lte) }) });
    assert.equal(r.status, 302);
    assert.ok(r.headers.get("location").startsWith("/cuenta/listas"));
    assert.equal(r.headers.get("location").includes("evil"), false);
  }
});

test("las preguntas pendientes y ocultas nunca se publican; responder envía correo", async () => {
  const a = await comprador("pregunta_a");
  const { lote } = await articulo();
  await a.web.post("/tienda/preguntas", { id_lte: lote.id_lte, texto: "¿Cuándo se captura?" });
  const p = await Pregunta.findOne({ where: { id_usuario: a.u.id } });
  assert.equal((await a.web.get(`/tienda/lote/${lote.id_lte}`)).texto.includes("¿Cuándo se captura?"), false);
  const admin = cliente(srv.base); await admin.entrar("admin", "AdminPrueba123");
  await admin.post(`/preguntas/${p.id_preg}`, { respuesta: "Hoy temprano" });
  assert.equal((await a.web.get(`/tienda/lote/${lote.id_lte}`)).texto.includes("Hoy temprano"), true);
  assert.equal((await admin.get("/preguntas")).status, 200);
  const { lote: loteOculto } = await articulo();
  await a.web.post("/tienda/preguntas", { id_lte: loteOculto.id_lte, texto: "¿Está disponible?" });
  const segunda = await Pregunta.findOne({ where: { id_usuario: a.u.id, id_lte: loteOculto.id_lte } });
  await admin.post(`/preguntas/${segunda.id_preg}`, { estado: "oculta" });
  assert.equal((await a.web.get(`/tienda/lote/${loteOculto.id_lte}`)).texto.includes("¿Está disponible?"), false);
});

test("el límite de preguntas es cinco por hora por cuenta", async () => {
  const a = await comprador("limite_pregunta"); const { lote } = await articulo();
  for (let i = 0; i < 5; i += 1) assert.equal((await a.web.post("/tienda/preguntas", { id_lte: lote.id_lte, texto: `Pregunta ${i}` })).status, 302);
  assert.equal((await a.web.post("/tienda/preguntas", { id_lte: lote.id_lte, texto: "Pregunta excedente" })).status, 429);
});

test("opiniones requieren compra vinculada, se editan y el público muestra promedio escapado", async () => {
  const a = await comprador("opinion_a"); const { catalogo, lote } = await articulo();
  const sinCompra = await a.web.post(`/tienda/especie/${catalogo.id_cat}/opiniones`, { estrellas: "5", titulo: "Bueno", texto: "Excelente" });
  assert.equal(sinCompra.status, 403);
  await Compra.create({ id_cmp: lote.id_lte, codigo_cpr: a.c.codigo_cpr, precio_kilo_final: 20, precio_total: 100 });
  await a.web.post(`/tienda/especie/${catalogo.id_cat}/opiniones`, { estrellas: "4", titulo: "Fresco", texto: "Pargo <script>alert(1)</script>" });
  await a.web.post(`/tienda/especie/${catalogo.id_cat}/opiniones`, { estrellas: "5", titulo: "Muy fresco <b>hoy</b>", texto: "Buen producto <b>fresco</b> <script>alert(1)</script>" });
  assert.equal(await Opinion.count({ where: { id_usuario: a.u.id, id_cat: catalogo.id_cat } }), 1);
  const ficha = await cliente(srv.base).get(`/tienda/especie/${catalogo.id_cat}`);
  assert.match(ficha.texto, /5\.0 de 5/);
  assert.equal(ficha.texto.includes("<script>alert(1)</script>"), false);
  assert.match(ficha.texto, /Ana P\./);
  assert.equal(ficha.texto.includes("Ana Prueba"), false);
  assert.equal(ficha.texto.includes(a.u.correo), false);
  assert.match(ficha.texto, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(ficha.texto, /&lt;b&gt;fresco&lt;\/b&gt;/);
});

test("anónimo al preguntar conserva volver a la ficha y errores de comunidad usan la plantilla", async () => {
  const { lote, catalogo } = await articulo();
  const anon = cliente(srv.base);
  const pregunta = await anon.post("/tienda/preguntas", { id_lte: lote.id_lte, texto: "¿Disponible?" });
  assert.equal(pregunta.status, 302);
  assert.ok(pregunta.loc.startsWith("/acceso?volver="));
  assert.equal(decodeURIComponent(pregunta.loc).includes(`/tienda/lote/${lote.id_lte}`), true);
  const opinionAnonima = await anon.post(`/tienda/especie/${catalogo.id_cat}/opiniones`, { estrellas: "5", titulo: "Bien", texto: "Producto" });
  assert.ok(opinionAnonima.loc.startsWith("/acceso?volver="));
  const a = await comprador("error_opinion");
  const error = await a.web.post(`/tienda/especie/${catalogo.id_cat}/opiniones`, { estrellas: "9" });
  assert.equal(error.status, 400);
  assert.match(error.texto, /Elige una especie y una calificación/);
  assert.match(error.texto, /Volver/);
});

test("nombres públicos abreviados y Referer remoto no pueden abrir redirecciones", () => {
  assert.equal(nombrePublico("  Ana   Pérez  "), "Ana P.");
  assert.equal(nombrePublico(""), "Comprador");
  const req = { protocol: "http", get: (h) => h === "host" ? "lonja.local" : "https://evil.example/x" };
  assert.equal(rutaReferer(req, "/cuenta/listas"), "/cuenta/listas");
  req.get = (h) => h === "host" ? "lonja.local" : "//evil.example/x";
  assert.equal(rutaReferer(req, "/tienda/lote/1"), "/tienda/lote/1");
});

test("mi cuenta muestra, edita y elimina solo mis opiniones y propone compras sin calificar", async () => {
  const a = await comprador("mis_opiniones_a"), b = await comprador("mis_opiniones_b");
  const x = await articulo(), y = await articulo(), z = await articulo();
  for (const item of [x, y]) await Compra.create({ id_cmp: item.lote.id_lte, codigo_cpr: a.c.codigo_cpr, precio_kilo_final: 20, precio_total: 100 });
  await Compra.create({ id_cmp: z.lote.id_lte, codigo_cpr: b.c.codigo_cpr, precio_kilo_final: 20, precio_total: 100 });
  const propia = await Opinion.create({ id_usuario: a.u.id, id_cat: x.catalogo.id_cat, estrellas: 4, titulo: "Anterior", texto: "Reseña propia", visible: false });
  const ajena = await Opinion.create({ id_usuario: b.u.id, id_cat: z.catalogo.id_cat, estrellas: 5, titulo: "Privada", texto: "No es mía", visible: true });
  const lista = await a.web.get("/cuenta/opiniones");
  assert.equal(lista.status, 200);
  assert.match(lista.texto, /Oculta por moderación/);
  assert.match(lista.texto, /Especies que compraste y aún no calificaste/);
  assert.match(lista.texto, new RegExp(`/tienda/especie/${y.catalogo.id_cat}#opiniones`));
  assert.equal(lista.texto.includes(`/tienda/especie/${z.catalogo.id_cat}#opiniones`), false);
  assert.equal(lista.texto.includes("No es mía"), false);
  await a.web.post(`/tienda/especie/${x.catalogo.id_cat}/opiniones`, { estrellas: "5", titulo: "Actualizada", texto: "Mi versión nueva" });
  assert.equal((await Opinion.findByPk(propia.id_op)).titulo, "Actualizada");
  assert.equal((await a.web.get("/cuenta/opiniones")).texto.includes("Actualizada"), true);
  assert.equal((await a.web.post(`/cuenta/opiniones/${ajena.id_op}?_method=DELETE`)).status, 404);
  assert.equal((await a.web.post(`/cuenta/opiniones/${propia.id_op}?_method=DELETE`)).status, 302);
  assert.equal(await Opinion.findByPk(propia.id_op), null);
  const empleado = await Usuario.create({ usuario: "opinion_personal", nombre_completo: "Personal", password: "Clave1234", rol: "capturista" });
  const personal = cliente(srv.base); await personal.entrar(empleado.usuario, "Clave1234");
  assert.equal((await personal.get("/cuenta/opiniones")).status, 403);
});
