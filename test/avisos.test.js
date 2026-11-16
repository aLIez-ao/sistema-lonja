import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { fijarTransporteParaPruebas } from "../helpers/email.js";
import { esperarColaTrabajos } from "../helpers/colaTrabajos.js";

const { Usuario, Comprador } = modelos;
let srv;
const enviados = [];
before(async () => {
  srv = await arrancar();
  fijarTransporteParaPruebas({ async sendMail(opciones) { enviados.push(opciones); return { messageId: "aviso-test" }; } });
});
after(async () => { fijarTransporteParaPruebas(null); await srv.cerrar(); });

test("los avisos solo llegan a compradores suscritos y el enlace permite confirmar la baja", async () => {
  const c = await Comprador.create({ nombre: "Suscrita", apellido_paterno: "Prueba", correo: "suscrita@example.com" });
  const suscrita = await Usuario.create({ usuario: "suscrita_aviso", nombre_completo: "Suscrita Prueba", correo: c.correo, password: "Clave1234", rol: "comprador", codigo_cpr: c.codigo_cpr, activo: true, email_verificado: true, recibir_avisos: true });
  const c2 = await Comprador.create({ nombre: "No", apellido_paterno: "Suscrita", correo: "nosuscrita@example.com" });
  await Usuario.create({ usuario: "no_suscrita_aviso", nombre_completo: "No Suscrita", correo: c2.correo, password: "Clave1234", rol: "comprador", codigo_cpr: c2.codigo_cpr, activo: true, email_verificado: true, recibir_avisos: false });
  const admin = cliente(srv.base); await admin.entrar("admin", "AdminPrueba123");

  const respuesta = await admin.post("/configuracion/enviar-aviso-clientes", { asunto: "Horario de subasta", titulo: "Cambio de horario", mensaje: "La subasta iniciará a las 9:00.", tipo: "evento" });
  assert.equal(respuesta.status, 302);
  assert.match(decodeURIComponent(respuesta.loc), /Aviso en cola para 1 suscriptores/);
  await esperarColaTrabajos();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, suscrita.correo);
  assert.match(enviados[0].html, /date de baja aquí/);
  const urlBaja = /href="(http:\/\/[^\"]+\/avisos\/baja\/[^\"]+)"/.exec(enviados[0].html)?.[1];
  assert.ok(urlBaja);

  const anonimo = cliente(srv.base);
  assert.equal((await anonimo.get("/avisos/baja/no-valido")).status, 400);
  const confirmacion = await anonimo.get(new URL(urlBaja).pathname);
  assert.equal(confirmacion.status, 200);
  assert.match(confirmacion.texto, /Confirmar baja de avisos/);
  const baja = await anonimo.post(new URL(urlBaja).pathname, {});
  assert.equal(baja.status, 200);
  await suscrita.reload();
  assert.equal(suscrita.recibir_avisos, false);
});

test("los avisos rechazan asuntos y mensajes fuera de los límites", async () => {
  const admin = cliente(srv.base); await admin.entrar("admin", "AdminPrueba123");
  const r = await admin.post("/configuracion/enviar-aviso-clientes", { asunto: "x".repeat(121), mensaje: "Mensaje válido", tipo: "evento" });
  assert.equal(r.status, 302);
  assert.match(decodeURIComponent(r.loc), /asunto es obligatorio/);
  assert.equal(enviados.length, 1);
});
