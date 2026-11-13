// Fase 3: tienda pública en "/", detalle de lote, ficha de especie y
// sugerencias. Solo deben aparecer lotes disponibles y datos públicos.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { limiteSugerencias } from "../controllers/tiendaController.js";

const { Tipo, Lote, Especie, EspecieCatalogo, Comprador, Compra } = modelos;

let srv;
let pescado;
let marisco;
let loteBarato;
let loteCaro;
let loteVendido;

const base = () => srv.base;
const nuevo = () => cliente(base());

/** Trozo de la cuadrícula (sin héroes, filas ni filtros) para comprobar orden. */
const seccionCatalogo = (html) => {
  const inicio = html.indexOf('<div class="tienda-grid">');
  const fin = html.indexOf('class="tienda-toasts"');
  return inicio >= 0 && fin > inicio ? html.slice(inicio, fin) : "";
};

before(async () => {
  srv = await arrancar();

  [pescado, marisco] = await Promise.all([
    Tipo.findOne({ where: { nombre: "Pescado" } }),
    Tipo.findOne({ where: { nombre: "Marisco" } }),
  ]);

  const catHuachinango = await EspecieCatalogo.create({
    nombre: "Huachinango Test",
    descripcion: "Pescado de roca del Golfo de México, fresco del día.",
    id_tpo: pescado.id_tpo,
    activo: true,
  });
  const catCamaron = await EspecieCatalogo.create({
    nombre: "Camarón Test",
    descripcion: "Camarón de estero, ideal para cóctel.",
    id_tpo: marisco.id_tpo,
    activo: true,
  });

  loteBarato = await Lote.create({
    kilos: 100,
    numero_cajas: 8,
    precio_kilo_salida: 50,
    fecha: new Date(),
  });
  await Especie.create({
    nombre: catHuachinango.nombre,
    id_lte: loteBarato.id_lte,
    id_tpo: pescado.id_tpo,
    id_cat: catHuachinango.id_cat,
  });

  loteCaro = await Lote.create({
    kilos: 20,
    numero_cajas: 2,
    precio_kilo_salida: 200,
    fecha: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });
  await Especie.create({
    nombre: catCamaron.nombre,
    id_lte: loteCaro.id_lte,
    id_tpo: marisco.id_tpo,
    id_cat: catCamaron.id_cat,
  });

  // Lote vendido: ni él ni sus especies ni los datos del comprador deben salir.
  loteVendido = await Lote.create({
    kilos: 75,
    numero_cajas: 6,
    precio_kilo_salida: 90,
    fecha: new Date(),
  });
  await Especie.create({
    nombre: "Especie Secreta Test",
    id_lte: loteVendido.id_lte,
    id_tpo: pescado.id_tpo,
  });
  const comprador = await Comprador.create({
    nombre: "Secreto",
    apellido_paterno: "Apellido",
    correo: "secreto@example.com",
  });
  await Compra.create({
    id_cmp: loteVendido.id_lte,
    codigo_cpr: comprador.codigo_cpr,
    precio_kilo_final: 120,
    precio_total: 9000,
    fecha: new Date(),
  });
});

after(() => srv.cerrar());

test("la portada es pública y muestra solo lotes disponibles", async () => {
  limiteSugerencias.reiniciar();
  const c = nuevo();
  const r = await c.get("/");
  assert.equal(r.status, 200);
  assert.match(r.texto, /data-protegida="0"/);
  assert.match(r.texto, /Lotes disponibles/);
  assert.match(r.texto, /Explorar todos los lotes/);
  assert.match(r.texto, /Huachinango Test/);
  assert.match(r.texto, /Camarón Test/);

  // Enlaces de invitado
  assert.match(r.texto, /href="\/acceso"/);
  assert.match(r.texto, /href="\/registro"/);

  // Nada del lote vendido ni del comprador
  assert.doesNotMatch(r.texto, /Especie Secreta Test/);
  assert.doesNotMatch(r.texto, /Secreto Apellido/);
  assert.doesNotMatch(r.texto, /secreto@example\.com/);
  assert.doesNotMatch(r.texto, /9,000|9000/);
});

test("el acceso está en /acceso y ya no en la portada", async () => {
  const c = nuevo();
  const r = await c.get("/acceso");
  assert.equal(r.status, 200);
  assert.match(r.texto, /placeholder="Tu contraseña"/);
  assert.match(r.texto, /action="\/credenciales"/);
});

test("las rutas protegidas redirigen a /acceso con la ruta original", async () => {
  const c = nuevo();
  const r = await c.get("/lotes?orden=kilos");
  assert.equal(r.status, 302);
  assert.equal(r.loc, `/acceso?volver=${encodeURIComponent("/lotes?orden=kilos")}`);

  const post = await c.post("/compradores", {});
  assert.equal(post.status, 302);
  assert.equal(post.loc, "/acceso", "un POST no arrastra la ruta original");
});

test("filtros: precio, kilos, tipo y especie", async () => {
  const c = nuevo();

  const baratos = seccionCatalogo((await c.get("/?precioMax=100")).texto);
  assert.match(baratos, /Huachinango Test/);
  assert.doesNotMatch(baratos, /Camarón Test/);

  const grandes = seccionCatalogo((await c.get("/?kilosMin=50")).texto);
  assert.match(grandes, /Huachinango Test/);
  assert.doesNotMatch(grandes, /Camarón Test/);

  const mariscos = seccionCatalogo((await c.get(`/?tipo=${marisco.id_tpo}`)).texto);
  assert.match(mariscos, /Camarón Test/);
  assert.doesNotMatch(mariscos, /Huachinango Test/);

  const catHuachinango = await EspecieCatalogo.findOne({ where: { nombre: "Huachinango Test" } });
  const especie = seccionCatalogo((await c.get(`/?especie=${catHuachinango.id_cat}`)).texto);
  assert.match(especie, /Huachinango Test/);
  assert.doesNotMatch(especie, /Camarón Test/);
});

test("orden por precio ascendente y descendente dentro de la cuadrícula", async () => {
  const c = nuevo();
  const asc = seccionCatalogo((await c.get("/?orden=precio&dir=asc")).texto);
  assert.ok(asc.indexOf("Huachinango Test") < asc.indexOf("Camarón Test"));

  const desc = seccionCatalogo((await c.get("/?orden=precio&dir=desc")).texto);
  assert.ok(desc.indexOf("Camarón Test") < desc.indexOf("Huachinango Test"));
});

test("búsqueda pública por especie y por número de lote", async () => {
  const c = nuevo();
  const porEspecie = await c.get("/?q=Huachinango");
  assert.equal(porEspecie.status, 200);
  const seccion = seccionCatalogo(porEspecie.texto);
  assert.match(seccion, /Huachinango Test/);
  assert.doesNotMatch(seccion, /Camarón Test/);

  const porNumero = seccionCatalogo((await c.get(`/?q=${loteCaro.id_lte}`)).texto);
  assert.match(porNumero, /Camarón Test/);
  assert.doesNotMatch(porNumero, /Huachinango Test/);
});

test("detalle de un lote disponible y de uno vendido", async () => {
  const c = nuevo();

  const disponible = await c.get(`/tienda/lote/${loteBarato.id_lte}`);
  assert.equal(disponible.status, 200);
  assert.match(disponible.texto, /Huachinango Test/);
  assert.match(disponible.texto, /Agregar al carrito/);
  assert.match(disponible.texto, /Recoger en la lonja/);

  const vendido = await c.get(`/tienda/lote/${loteVendido.id_lte}`);
  assert.equal(vendido.status, 200);
  assert.match(vendido.texto, /ya fue vendido/i);
  assert.match(vendido.texto, /Lote vendido/);
  assert.doesNotMatch(vendido.texto, /Secreto Apellido/);
  assert.doesNotMatch(vendido.texto, /secreto@example\.com/);

  const inexistente = await c.get("/tienda/lote/99999");
  assert.equal(inexistente.status, 404);
});

test("ficha de especie con descripción y lotes disponibles", async () => {
  const c = nuevo();
  const catalogo = await EspecieCatalogo.findOne({ where: { nombre: "Huachinango Test" } });
  const r = await c.get(`/tienda/especie/${catalogo.id_cat}`);
  assert.equal(r.status, 200);
  assert.match(r.texto, /Huachinango Test/);
  assert.match(r.texto, /Pescado de roca del Golfo de México/);
  assert.match(r.texto, /Lotes disponibles/);
  assert.match(r.texto, /Sin opiniones todavía/);

  const noExiste = await c.get("/tienda/especie/99999");
  assert.equal(noExiste.status, 404);
});

test("sugerencias públicas: solo lotes disponibles y máximo 30 por minuto", async () => {
  limiteSugerencias.reiniciar();
  const c = nuevo();

  const r = await c.get("/tienda/sugerencias?q=Huachinango");
  assert.equal(r.status, 200);
  const datos = JSON.parse(r.texto);
  assert.equal(datos.length, 1);
  assert.equal(datos[0].id, loteBarato.id_lte);
  assert.match(datos[0].titulo, /Huachinango Test/);
  assert.equal(datos[0].url, `/tienda/lote/${loteBarato.id_lte}`);

  const secreto = JSON.parse((await c.get("/tienda/sugerencias?q=Secreta")).texto);
  assert.deepEqual(secreto, [], "un lote vendido no se sugiere");

  const corto = JSON.parse((await c.get("/tienda/sugerencias?q=H")).texto);
  assert.deepEqual(corto, [], "menos de 2 caracteres no busca");

  let ultimo = null;
  for (let i = 0; i < 27; i += 1) ultimo = await c.get("/tienda/sugerencias?q=Huachinango");
  assert.equal(ultimo.status, 200, "la petición 30 todavía se atiende");
  const bloqueado = await c.get("/tienda/sugerencias?q=Huachinango");
  assert.equal(bloqueado.status, 429);
});

test("un comprador con sesión puede ver la tienda sin dejar de ser privado su panel", async () => {
  const c = nuevo();
  const alta = await c.post("/registro", {
    nombre: "Compra",
    apellido_paterno: "Tienda",
    correo: "compra.tienda@example.com",
    password: "Clave1234",
    password_confirmar: "Clave1234",
    aviso_privacidad: "on",
  });
  assert.equal(alta.status, 200);
  const enlace = /\/verificar-email\/[0-9a-f]{24,}/.exec(alta.texto)?.[0];
  assert.ok(enlace);
  assert.equal((await c.get(enlace)).status, 302);

  const us = await modelos.Usuario.findOne({ where: { correo: "compra.tienda@example.com" } });
  assert.equal((await c.entrar(us.usuario, "Clave1234")).status, 302);

  const portada = await c.get("/");
  assert.equal(portada.status, 200);
  assert.match(portada.texto, /Huachinango Test/);
  assert.match(portada.texto, /Mi cuenta/);

  const panel = await c.get("/inicio");
  assert.equal(panel.status, 403, "el comprador no entra al tablero del personal");
});
