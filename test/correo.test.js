// Fase 0: enlaces de verificación estables, diagnóstico del correo y APP_URL.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { fijarTransporteParaPruebas } from "../helpers/email.js";
import { limiteVerificacion } from "../helpers/cuentas.js";

const { Usuario } = modelos;
let srv, admin;

function transporteFalso({ falla } = {}) {
  const enviados = [];
  return {
    enviados,
    async verify() { if (falla) throw falla; },
    async sendMail(opciones) {
      if (falla) throw falla;
      enviados.push(opciones);
      return { messageId: `prueba-${enviados.length}` };
    },
  };
}

const enlaceDe = (mensaje) => {
  const m = /https?:\/\/[^\s]+\/verificar-email\/[0-9a-f]+/.exec(String(mensaje));
  return m ? new URL(m[0]).pathname + new URL(m[0]).search : null;
};

const mensajeDe = (loc) => decodeURIComponent(String(loc || "").split("?")[1] || "");

async function prepararCorreo() {
  await Usuario.update({ correo: "admin@example.com", email_verificado: false, token_verificacion: null, token_verificacion_expira: null, token_verificacion_envio: null }, { where: { usuario: "admin" } });
  limiteVerificacion.reiniciar();
}

before(async () => {
  srv = await arrancar();
  admin = cliente(srv.base);
  await admin.entrar("admin", "AdminPrueba123");
});
after(() => srv.cerrar());
beforeEach(async () => { await prepararCorreo(); delete process.env.NODE_ENV; });

test("el último enlace verifica; el anterior responde que fue reemplazado", async () => {
  const t = transporteFalso();
  fijarTransporteParaPruebas(t);

  assert.equal((await admin.post("/configuracion/solicitar-verificacion")).status, 302);
  await Usuario.update({ token_verificacion_envio: new Date(0) }, { where: { usuario: "admin" } });
  assert.equal((await admin.post("/configuracion/solicitar-verificacion")).status, 302);

  const primero = enlaceDe(t.enviados[0].text);
  const ultimo = enlaceDe(t.enviados[1].text);
  assert.ok(primero && ultimo && primero !== ultimo);

  const viejo = await admin.get(primero);
  assert.equal(viejo.status, 400);
  assert.match(viejo.texto, /reemplaza a todos los anteriores/);

  const bueno = await admin.get(ultimo);
  assert.equal(bueno.status, 302);
  assert.equal((await Usuario.findOne({ where: { usuario: "admin" } })).email_verificado, true);
});

test("un enlace caducado se distingue de uno inexistente y ofrece reenviar con sesión", async () => {
  const t = transporteFalso();
  fijarTransporteParaPruebas(t);
  await admin.post("/configuracion/solicitar-verificacion");
  const enlace = enlaceDe(t.enviados[0].text);
  await Usuario.update({ token_verificacion_expira: new Date(Date.now() - 1000) }, { where: { usuario: "admin" } });

  const r = await admin.get(enlace);
  assert.equal(r.status, 400);
  assert.match(r.texto, /caducó/);
  assert.match(r.texto, /Enviar un enlace nuevo/);

  const inventado = await admin.get("/verificar-email/0000000000000000000000000000000000000000000000000000000000000000");
  assert.equal(inventado.status, 400);
  assert.match(inventado.texto, /no existe o ya se usó/);
});

test("reenvío con enfriamiento de 60 s y máximo de 5 por hora", async () => {
  const t = transporteFalso();
  fijarTransporteParaPruebas(t);
  await admin.post("/configuracion/solicitar-verificacion");

  const seguido = await admin.post("/configuracion/solicitar-verificacion");
  assert.equal(seguido.status, 302);
  assert.match(mensajeDe(seguido.loc), /Espera \d+ segundos/);
  assert.equal(t.enviados.length, 1, "el segundo envío no ocurrió");

  limiteVerificacion.reiniciar();
  for (let i = 0; i < 5; i++) {
    await Usuario.update({ token_verificacion_envio: new Date(0) }, { where: { usuario: "admin" } });
    await admin.post("/configuracion/solicitar-verificacion");
  }
  await Usuario.update({ token_verificacion_envio: new Date(0) }, { where: { usuario: "admin" } });
  const bloqueado = await admin.post("/configuracion/solicitar-verificacion");
  assert.equal(bloqueado.status, 429);
  assert.match(bloqueado.texto, /demasiados enlaces/i);
});

test("si Gmail falla, el usuario no ve detalles técnicos; el admin sí en la pestaña Correo", async () => {
  const error = Object.assign(new Error("Invalid login: 535-5.7.8 Username and Password not accepted"), { code: "EAUTH" });
  fijarTransporteParaPruebas(transporteFalso({ falla: error }));

  const r = await admin.post("/configuracion/solicitar-verificacion");
  assert.equal(r.status, 302);
  const mensaje = mensajeDe(r.loc);
  assert.match(mensaje, /No pudimos enviar el correo/);
  assert.doesNotMatch(mensaje, /Gmail rechazó|EAUTH|535/);

  const config = await admin.get("/configuracion");
  assert.match(config.texto, /Gmail rechazó el usuario o la contraseña/);
  assert.match(config.texto, /contraseña de aplicación/);
});

test("modo simulador: en desarrollo muestra el enlace; en producción no", async () => {
  fijarTransporteParaPruebas(null);
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_PASS;

  const dev = await admin.post("/configuracion/solicitar-verificacion");
  assert.equal(dev.status, 200);
  assert.match(dev.texto, /Modo desarrollo/);
  assert.ok(enlaceDe(dev.texto), "el enlace se muestra directamente en la respuesta");
  assert.equal(dev.loc, null, "el enlace no viaja en la URL");

  await Usuario.update({ token_verificacion_envio: new Date(0) }, { where: { usuario: "admin" } });
  process.env.NODE_ENV = "production";
  const prod = await admin.post("/configuracion/solicitar-verificacion");
  assert.equal(prod.status, 302);
  assert.doesNotMatch(mensajeDe(prod.loc), /verificar-email/);
  assert.match(mensajeDe(prod.loc), /Avisa al administrador/);
  delete process.env.NODE_ENV;
});

test("cambiar correo invalida de inmediato el enlace anterior aunque siga el enfriamiento", async () => {
  const t = transporteFalso();
  fijarTransporteParaPruebas(t);
  await admin.post("/configuracion/solicitar-verificacion");
  const enlaceAnterior = enlaceDe(t.enviados[0].text);
  assert.ok(enlaceAnterior);

  const cambio = await admin.post("/configuracion/actualizar-cuenta", {
    nombre_completo: "Administrador",
    correo: "nuevo-admin@example.com",
  });
  assert.equal(cambio.status, 302);
  assert.match(mensajeDe(cambio.loc), /espera \d+ s/i);
  assert.doesNotMatch(mensajeDe(cambio.loc), /sigue vigente/i);

  const u = await Usuario.findOne({ where: { usuario: "admin" } });
  assert.equal(u.correo, "nuevo-admin@example.com");
  assert.equal(u.email_verificado, false);
  assert.equal(u.token_verificacion, null);
  assert.equal(u.token_verificacion_expira, null);
  assert.equal((await admin.get(enlaceAnterior)).status, 400);
});

test("el simulador también muestra el enlace de cambio de correo en el cuerpo, no en la URL", async () => {
  fijarTransporteParaPruebas(null);
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_PASS;
  await Usuario.update({ token_verificacion_envio: new Date(0) }, { where: { usuario: "admin" } });
  const r = await admin.post("/configuracion/actualizar-cuenta", {
    nombre_completo: "Administrador",
    correo: "cambio@example.com",
  });
  assert.equal(r.status, 200);
  assert.match(r.texto, /href="http:\/\/127\.0\.0\.1:[0-9]+\/verificar-email\//);
  assert.doesNotMatch(r.loc || "", /verificar-email/);
});

test("APP_URL se usa en los enlaces si está definida", async () => {
  process.env.APP_URL = "https://lonja.example";
  const t = transporteFalso();
  fijarTransporteParaPruebas(t);
  await admin.post("/configuracion/solicitar-verificacion");
  assert.match(t.enviados[0].text, /https:\/\/lonja\.example\/verificar-email\//);
  delete process.env.APP_URL;
});
