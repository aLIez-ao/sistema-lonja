// Pruebas de extremo a extremo con SQLite en memoria (no requieren MariaDB).
// Ejecutar: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.BD_DIALEC = "sqlite";
process.env.BD_STORAGE = ":memory:";
process.env.SC_JWT = "clave_de_pruebas";
process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASSWORD = "AdminPrueba123";

const { default: db } = await import("../config/db.js");
await import("../models/index.js");
const { default: app } = await import("../app.js");
const { crearAdministradorInicial, crearTiposIniciales } = await import("../helpers/semillas.js");
const { Compra, Lote, Especie, EspecieCatalogo } = await import("../models/index.js");

let server, base;
const sesion = (cookie = "") => ({
  cookie,
  async req(metodo, ruta, datos) {
    const r = await fetch(base + ruta, {
      method: metodo,
      redirect: "manual",
      headers: { cookie: this.cookie, ...(datos ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
      body: datos ? new URLSearchParams(datos).toString() : undefined,
    });
    const set = r.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0].startsWith("_token=;") ? "" : set.split(";")[0];
    return { status: r.status, loc: r.headers.get("location"), texto: await r.text(), headers: r.headers };
  },
  get: function (ruta) { return this.req("GET", ruta); },
  post: function (ruta, datos) { return this.req("POST", ruta, datos); },
});

before(async () => {
  await db.sync({ force: true });
  await crearAdministradorInicial();
  await crearTiposIniciales();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.close(); await db.close(); });

const admin = sesion();
const capt = sesion();

test("sin sesión se redirige al login", async () => {
  for (const ruta of ["/dashboard", "/compras", "/lotes", "/reportes/diario", "/usuarios"]) {
    const r = await sesion().get(ruta);
    assert.equal(r.status, 302, ruta);
    assert.equal(r.loc, `/acceso?volver=${encodeURIComponent(ruta)}`, ruta);
  }
});

test("login: credenciales malas rechazadas, buenas entran con cookie httpOnly", async () => {
  const mal = await sesion().post("/credenciales", { usuario: "admin", password: "incorrecta" });
  assert.equal(mal.status, 401);
  assert.match(mal.texto, /Revisa las credenciales/);
  const vacio = await sesion().post("/credenciales", { usuario: "", password: "" });
  assert.equal(vacio.status, 401);

  const ok = await admin.post("/credenciales", { usuario: "admin", password: "AdminPrueba123" });
  assert.equal(ok.status, 302);
  assert.equal(ok.loc, "/dashboard");
  const cookie = ok.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.equal((await admin.get("/dashboard")).status, 200);
});

test("token falso es rechazado", async () => {
  const r = await sesion("_token=abc.def.ghi").get("/dashboard");
  assert.equal(r.status, 302);
});

test("admin crea capturista; capturista entra pero no administra usuarios ni borra", async () => {
  const corto = await admin.post("/usuarios", { usuario: "cap1", nombre_completo: "Capturista Uno", correo: "cap1@example.com", rol: "capturista", acceso: "manual", password: "123", password_confirmar: "123" });
  assert.equal(corto.status, 400);
  const c = await admin.post("/usuarios", { usuario: "cap1", nombre_completo: "Capturista Uno", correo: "cap1@example.com", rol: "capturista", acceso: "manual", password: "Captura1234", password_confirmar: "Captura1234" });
  assert.equal(c.status, 302);

  await capt.post("/credenciales", { usuario: "cap1", password: "Captura1234" });
  assert.equal((await capt.get("/compras")).status, 200);
  assert.equal((await capt.get("/usuarios")).status, 403);
  assert.equal((await capt.post("/tipos/1?_method=DELETE", {})).status, 403);
});

let loteId, catalogoHuachi;
test("flujo de captura: comprador, lote, especie, compra con total calculado", async () => {
  // validaciones
  const malComp = await capt.post("/compradores", { nombre: "", apellido_paterno: "X", correo: "no-es-correo" });
  assert.equal(malComp.status, 400);

  const comp = await capt.post("/compradores", { nombre: "Ana", apellido_paterno: "López", apellido_materno: "Ruiz", direccion: "Veracruz", correo: "ana@example.com" });
  assert.equal(comp.status, 302);
  const dup = await capt.post("/compradores", { nombre: "Ana", apellido_paterno: "López", correo: "ana@example.com" });
  assert.equal(dup.status, 400);
  assert.match(dup.texto, /Ya existe/);

  catalogoHuachi = await EspecieCatalogo.create({ nombre: "Huachinango", id_tpo: 1, imagen: "" });

  const malLote = await capt.post("/lotes", { kilos: "-3", numero_cajas: "2", precio_kilo_salida: "10" });
  assert.equal(malLote.status, 400);
  const lote = await capt.post("/lotes", { kilos: "120.50", numero_cajas: "10", precio_kilo_salida: "45.00", especies: String(catalogoHuachi.id_cat) });
  assert.equal(lote.status, 302);
  loteId = (await Lote.findOne({ order: [["id_lte", "DESC"]] })).id_lte;
  assert.match(lote.loc, /^\/lotes\?/);

  const malCompra = await capt.post("/compras", { id_cmp: String(loteId), codigo_cpr: "1", precio_kilo_final: "0" });
  assert.equal(malCompra.status, 400);

  const compra = await capt.post("/compras", { id_cmp: String(loteId), codigo_cpr: "1", precio_kilo_final: "60.25" });
  assert.equal(compra.status, 302);
  const c = await Compra.findOne({ where: { id_cmp: loteId } });
  assert.equal(Number(c.precio_total), 7260.13); // 120.50 * 60.25 = 7260.125 -> 7260.13
  assert.equal(c.codigo_cpr, 1);

  // el mismo lote no se vende dos veces
  const otra = await capt.post("/compras", { id_cmp: String(loteId), codigo_cpr: "1", precio_kilo_final: "70" });
  assert.equal(otra.status, 400);
  assert.match(otra.texto, /ya fue comprado/);
  assert.equal(await Compra.count(), 1);
});

test("un lote comprado no se edita; no se puede borrar el comprador con compras", async () => {
  const ed = await capt.post(`/lotes/${loteId}?_method=PUT`, { kilos: "1", numero_cajas: "1", precio_kilo_salida: "1", especies: String(catalogoHuachi.id_cat) });
  assert.equal(ed.status, 302);
  assert.match(decodeURIComponent(ed.loc).replace(/\+/g, " "), /ya fue vendido/);

  const form = await capt.get(`/lotes/${loteId}/editar`);
  assert.equal(form.status, 302);
  assert.match(decodeURIComponent(form.loc).replace(/\+/g, " "), /ya fue vendido/);
  const del = await admin.post("/compradores/1?_method=DELETE", {});
  assert.equal(del.status, 302);
  assert.match(decodeURIComponent(del.loc), /No se puede eliminar/);
});

test("editar la compra cambia el total", async () => {
  const r = await capt.post(`/compras/${loteId}?_method=PUT`, { codigo_cpr: "1", precio_kilo_final: "50" });
  assert.equal(r.status, 302);
  assert.equal(Number((await Compra.findOne({ where: { id_cmp: loteId } })).precio_total), 6025);
});

test("reporte por año: tablero, compras por mes con enlace a su compra, CSV y PDF", async () => {
  const r = await capt.get("/reportes/diario");
  assert.equal(r.status, 200);
  assert.match(r.texto, /id="selectorAnio"/);
  assert.match(r.texto, /Huachinango/);
  assert.match(r.texto, /Ana López Ruiz/);
  assert.match(r.texto, /6,025\.00/);
  const compra = await Compra.findOne();
  assert.match(r.texto, new RegExp(`href="/compras/${compra.id_cmp}/factura"`));

  // un año sin compras cae al más reciente disponible en vez de romper
  assert.equal((await capt.get("/reportes/diario?anio=1990")).status, 200);
  assert.equal((await capt.get("/reportes/diario?anio=basura")).status, 200);

  const csv = await capt.get("/reportes/diario.csv");
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  assert.match(csv.texto, /Huachinango \(Pescado\)/);
  assert.match(csv.texto, /TOTAL/);
  const csvAnual = await capt.get(`/reportes/diario.csv?anio=${new Date().getFullYear()}`);
  assert.match(csvAnual.texto, /"Mes","Fecha"/);

  const pdf = await fetch(base + "/reportes/anual.pdf", { headers: { cookie: capt.cookie } });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type"), /application\/pdf/);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
});

test("XSS: los datos se escapan en las vistas", async () => {
  await capt.post("/tipos", { nombre: "<script>alert(1)</script>" });
  const r = await capt.get("/tipos");
  assert.ok(!r.texto.includes("<script>alert(1)</script>"));
  assert.match(r.texto, /&lt;script&gt;/);
});

test("usuario desactivado pierde el acceso aunque tenga token vigente", async () => {
  const { Usuario } = await import("../models/index.js");
  const u = await Usuario.findOne({ where: { usuario: "cap1" } });
  const r = await admin.post(`/usuarios/${u.id}?_method=PUT`, { usuario: "cap1", nombre_completo: "Capturista Uno", correo: "cap1@example.com", rol: "capturista" }); // sin 'activo' = desactivar
  assert.equal(r.status, 302);
  assert.equal((await capt.get("/compras")).status, 302);
  const re = await sesion().post("/credenciales", { usuario: "cap1", password: "Captura1234" });
  assert.equal(re.status, 401);
});

test("el administrador no puede desactivarse ni borrarse a sí mismo; 404 amigable", async () => {
  const r = await admin.post("/usuarios/1?_method=PUT", { usuario: "admin", nombre_completo: "Administrador", rol: "admin" });
  assert.equal(r.status, 400);
  const d = await admin.post("/usuarios/1?_method=DELETE", {});
  assert.match(decodeURIComponent(d.loc), /propio usuario/);
  assert.equal((await admin.get("/no-existe")).status, 404);
});

test("todas las pantallas del administrador renderizan (200)", async () => {
  // La especie del lote vendido ya no es editable; se crea un lote libre para esa pantalla.
  const libre = await Lote.create({ kilos: 5, numero_cajas: 1, precio_kilo_salida: 10 });
  const espLibre = await Especie.create({ nombre: "Libre", id_lte: libre.id_lte, id_tpo: 1 });
  const rutas = ["/dashboard", "/tipos", "/tipos/crear", "/tipos/1/editar", "/compradores", "/compradores/crear", "/compradores/1/editar",
    "/lotes", "/lotes/crear", "/especies", "/especies/crear", `/especies/${espLibre.id_epe}/editar`, "/compras", "/compras/crear", `/compras/${loteId}/editar`,
    "/reportes/diario", "/usuarios", "/usuarios/crear", "/usuarios/1/editar"];
  for (const ruta of rutas) assert.equal((await admin.get(ruta)).status, 200, ruta);
});

test("cerrar sesión borra la cookie y las páginas privadas no quedan en caché (botón atrás)", async () => {
  const privada = await admin.get("/compras");
  assert.match(privada.headers.get("cache-control"), /no-store/);
  const r = await admin.post("/cerrarsesion", {});
  assert.equal(r.status, 302);
  assert.equal((await admin.get("/dashboard")).status, 302);
});
