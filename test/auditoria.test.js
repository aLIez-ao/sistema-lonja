// Correcciones A2, A5, A6 y A7 del plan 03.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { hashToken } from "../helpers/seguridad.js";
import { limiteRegistro } from "../controllers/registroController.js";

const { Usuario, Comprador, Tipo, Lote, Especie, EspecieCatalogo } = modelos;
let srv;

before(async () => { srv = await arrancar(); });
after(() => srv.cerrar());
beforeEach(() => limiteRegistro.reiniciar());

test("verificar correo explica y registra cuando el comprador ya está ligado a otra cuenta", async () => {
  const cpr = await Comprador.create({ nombre: "Cliente", apellido_paterno: "Existente", correo: "ocupado@example.com" });
  await Usuario.create({ usuario: "otra-cuenta", nombre_completo: "Otra cuenta", correo: "otra@example.com", password: "Clave1234", rol: "comprador", codigo_cpr: cpr.codigo_cpr });
  const comprador = await Usuario.create({ usuario: "cuenta-nueva", nombre_completo: "Cliente Existente", correo: "ocupado@example.com", password: "Clave1234", rol: "comprador" });
  const token = "token-colision-comprador";
  await comprador.update({ token_verificacion: hashToken(token), token_verificacion_expira: new Date(Date.now() + 60_000) });

  const advertencias = [];
  const avisoOriginal = console.warn;
  console.warn = (mensaje) => advertencias.push(mensaje);
  try {
    const r = await cliente(srv.base).get(`/verificar-email/${token}`);
    assert.equal(r.status, 302);
    assert.match(decodeURIComponent(r.loc), /ya está vinculado a otra cuenta/i);
  } finally {
    console.warn = avisoOriginal;
  }
  await comprador.reload();
  assert.equal(comprador.email_verificado, true);
  assert.equal(comprador.codigo_cpr, null);
  assert.equal(advertencias.length, 1);
});

test("cambiar correo del comprador sincroniza su ficha y rechaza un correo de cliente ajeno", async () => {
  const cpr = await Comprador.create({ nombre: "Ana", apellido_paterno: "Ruiz", correo: "ana-original@example.com" });
  const us = await Usuario.create({ usuario: "ana-link", nombre_completo: "Ana Ruiz", correo: "ana-original@example.com", password: "Clave1234", rol: "comprador", codigo_cpr: cpr.codigo_cpr, email_verificado: true });
  await us.update({ token_verificacion: hashToken("correo-anterior"), token_verificacion_expira: new Date(Date.now() + 60_000), token_verificacion_envio: new Date() });
  const admin = cliente(srv.base);
  await admin.entrar("admin", "AdminPrueba123");
  const sesion = cliente(srv.base);
  await sesion.entrar(us.usuario, "Clave1234");

  const cambio = await sesion.post("/cuenta/datos", { nombre: "Ana", apellido_paterno: "Ruiz", correo: "ana-nueva@example.com" });
  assert.equal(cambio.status, 302);
  assert.equal((await Comprador.findByPk(cpr.codigo_cpr)).correo, "ana-nueva@example.com");
  await us.reload();
  assert.equal(us.token_verificacion, null);
  assert.equal(us.token_verificacion_expira, null);
  assert.equal((await sesion.get("/verificar-email/correo-anterior")).status, 400);

  await Comprador.create({ nombre: "Otro", apellido_paterno: "Cliente", correo: "ocupado2@example.com" });
  const choque = await sesion.post("/cuenta/datos", { nombre: "Ana", apellido_paterno: "Ruiz", correo: "ocupado2@example.com" });
  assert.equal(choque.status, 400);
  assert.match(choque.texto, /asociado a otro cliente/i);
  assert.equal((await Usuario.findByPk(us.id)).correo, "ana-nueva@example.com");
});

test("las altas inválidas no consumen el límite de registro", async () => {
  const c = cliente(srv.base);
  const usuarios = await Usuario.count();
  for (let i = 0; i < 7; i += 1) {
    const invalido = await c.post("/registro", { nombre: "", correo: `invalido${i}@example.com` });
    assert.equal(invalido.status, 400);
  }
  assert.equal(await Usuario.count(), usuarios);

  for (let i = 0; i < 5; i += 1) {
    const valido = await c.post("/registro", {
      nombre: "Persona", apellido_paterno: "Prueba", correo: `valido${i}@example.com`,
      password: "Clave1234", password_confirmar: "Clave1234", aviso_privacidad: "on",
    });
    assert.equal(valido.status, 200);
  }
  const sexto = await c.post("/registro", {
    nombre: "Persona", apellido_paterno: "Prueba", correo: "valido5@example.com",
    password: "Clave1234", password_confirmar: "Clave1234", aviso_privacidad: "on",
  });
  assert.equal(sexto.status, 429);
});

test("ficha pública usa solo id de catálogo y las especies retiradas sin lotes devuelven 404", async () => {
  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  const catalogo = await EspecieCatalogo.create({ nombre: "Catalogada", id_tpo: tipo.id_tpo, activo: false });
  const loteSuelto = await Lote.create({ kilos: 5, numero_cajas: 1, precio_kilo_salida: 10 });
  await Especie.create({ id_epe: 4000, nombre: "Especie suelta", id_tpo: tipo.id_tpo, id_lte: loteSuelto.id_lte, id_cat: null });
  assert.equal((await cliente(srv.base).get("/tienda/especie/4000")).status, 404);
  assert.equal((await cliente(srv.base).get(`/tienda/especie/${catalogo.id_cat}`)).status, 404);

  const activaConLote = await EspecieCatalogo.create({ nombre: "Retirada con lote", id_tpo: tipo.id_tpo, activo: false });
  const lote = await Lote.create({ kilos: 10, numero_cajas: 1, precio_kilo_salida: 20 });
  await Especie.create({ nombre: activaConLote.nombre, id_tpo: tipo.id_tpo, id_lte: lote.id_lte, id_cat: activaConLote.id_cat });
  const disponible = await cliente(srv.base).get(`/tienda/especie/${activaConLote.id_cat}`);
  assert.equal(disponible.status, 200, "un artículo retirado sigue visible si tiene lotes disponibles");
});
