// Cuentas de usuario: alta con invitación, contraseñas, recuperación, sesiones, foto y límites.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Usuario } = modelos;
let srv, admin;
const ADMIN = ["admin", "AdminPrueba123"];
const enlaceDe = (loc) => new URL(/https?:\/\/\S+\/recuperar-password\/[0-9a-f]+/.exec(decodeURIComponent(loc))[0]).pathname;
// PNG válido de 1x1
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

before(async () => {
  srv = await arrancar();
  admin = cliente(srv.base);
  await admin.entrar(...ADMIN);
});
after(() => srv.cerrar());

test("el alta exige correo válido y valida teléfono", async () => {
  const sinCorreo = await admin.post("/usuarios", { usuario: "ana", nombre_completo: "Ana Ruiz", rol: "capturista" });
  assert.equal(sinCorreo.status, 400);
  assert.match(sinCorreo.texto, /correo electrónico válido/);
  const telMalo = await admin.post("/usuarios", { usuario: "ana", nombre_completo: "Ana Ruiz", correo: "ana@example.com", telefono: "abc", rol: "capturista" });
  assert.equal(telMalo.status, 400);
});

let enlace;
test("alta por invitación: guarda los campos nuevos y nadie puede entrar hasta crear la contraseña", async () => {
  const r = await admin.post("/usuarios", { usuario: "ana", nombre_completo: "Ana Ruiz", correo: "ana@example.com", telefono: "229 123 4567", puesto: "Encargada de subasta", rol: "capturista", acceso: "invitacion", foto_data: PNG });
  assert.equal(r.status, 302);
  enlace = enlaceDe(r.loc); // sin correo configurado, el enlace se muestra al administrador

  const u = await Usuario.findOne({ where: { usuario: "ana" } });
  assert.equal(u.telefono, "229 123 4567");
  assert.equal(u.puesto, "Encargada de subasta");
  assert.match(u.foto, /^\/uploads\/avatares\/u\d+-[0-9a-f]+\.png$/);
  assert.equal(u.email_verificado, false);
  assert.notEqual(u.token_recuperacion, enlace.split("/").pop(), "en la BD solo se guarda el hash del token");

  const lista = (await admin.get("/usuarios")).texto;
  assert.match(lista, /Encargada de subasta/);
  assert.match(lista, /Sin verificar/);
});

test("el enlace de invitación permite crear la contraseña una sola vez y verifica el correo", async () => {
  const ana = cliente(srv.base);
  assert.equal((await ana.get(enlace)).status, 200);
  const debil = await ana.post(enlace, { password: "soloLetras", password_confirmar: "soloLetras" });
  assert.equal(debil.status, 400);
  assert.match(debil.texto, /una letra y un número/);
  const distinta = await ana.post(enlace, { password: "Segura1234", password_confirmar: "Otra12345" });
  assert.equal(distinta.status, 400);

  assert.equal((await ana.post(enlace, { password: "Segura1234", password_confirmar: "Segura1234" })).status, 302);
  assert.equal((await ana.get(enlace)).status, 400, "el enlace ya no sirve");
  assert.equal((await ana.entrar("ana", "Segura1234")).loc, "/inicio");
  assert.equal((await Usuario.findOne({ where: { usuario: "ana" } })).email_verificado, true);
});

test("cambiar la contraseña cierra las demás sesiones y conserva la actual", async () => {
  const a = cliente(srv.base), b = cliente(srv.base);
  await a.entrar("ana", "Segura1234");
  await b.entrar("ana", "Segura1234");

  const mal = await a.post("/configuracion/cambiar-password", { password_actual: "incorrecta", password_nuevo: "Nueva12345", password_confirmar: "Nueva12345" });
  assert.match(decodeURIComponent(mal.loc), /actual es incorrecta/);
  const ok = await a.post("/configuracion/cambiar-password", { password_actual: "Segura1234", password_nuevo: "Nueva12345", password_confirmar: "Nueva12345" });
  assert.match(decodeURIComponent(ok.loc), /Contraseña actualizada/);

  assert.equal((await a.get("/inicio")).status, 200, "la sesión que hizo el cambio sigue abierta");
  assert.equal((await b.get("/inicio")).status, 302, "la otra sesión quedó cerrada");
  assert.equal((await cliente(srv.base).entrar("ana", "Segura1234")).status, 401);
});

test("recuperación: misma respuesta exista o no la cuenta; por usuario o correo; no aplica a inactivos", async () => {
  const c = cliente(srv.base);
  const inexistente = await c.post("/olvide-password", { identificador: "nadie@example.com" });
  const existente = await c.post("/olvide-password", { identificador: "ana" });
  assert.equal(inexistente.status, 200);
  assert.match(inexistente.texto, /Si los datos coinciden/);
  assert.match(existente.texto, /Si los datos coinciden/);
  assert.ok((await Usuario.findOne({ where: { usuario: "ana" } })).token_recuperacion);

  const u = await Usuario.findOne({ where: { usuario: "ana" } });
  await u.update({ activo: false, token_recuperacion: null });
  await c.post("/olvide-password", { identificador: "ana@example.com" });
  assert.equal((await Usuario.findOne({ where: { usuario: "ana" } })).token_recuperacion, null);
  await u.update({ activo: true });
});

test("el administrador puede enviar un enlace de restablecimiento", async () => {
  const u = await Usuario.findOne({ where: { usuario: "ana" } });
  const r = await admin.post(`/usuarios/${u.id}/restablecer`);
  const ruta = enlaceDe(r.loc);
  const c = cliente(srv.base);
  assert.equal((await c.post(ruta, { password: "Tercera123", password_confirmar: "Tercera123" })).status, 302);
  assert.equal((await c.entrar("ana", "Tercera123")).loc, "/inicio");
});

test("mi cuenta: cambiar el correo exige verificarlo de nuevo; la foto debe ser una imagen real", async () => {
  const a = cliente(srv.base);
  await a.entrar("ana", "Tercera123");
  const falsa = await a.post("/configuracion/actualizar-cuenta", { nombre_completo: "Ana Ruiz", correo: "ana@example.com", foto_data: "data:image/png;base64," + Buffer.from("<script>alert(1)</script>").toString("base64") });
  assert.match(decodeURIComponent(falsa.loc), /no es una imagen válida/);
  const r = await a.post("/configuracion/actualizar-cuenta", { nombre_completo: "Ana Ruiz Gómez", correo: "ana.nueva@example.com", telefono: "2291112233" });
  assert.equal(r.status, 200, "en modo simulador el enlace de verificación se muestra en la respuesta");
  assert.match(r.texto, /verificar-email\//);
  const u = await Usuario.findOne({ where: { usuario: "ana" } });
  assert.equal(u.correo, "ana.nueva@example.com");
  assert.equal(u.email_verificado, false);
  const duplicado = await a.post("/configuracion/actualizar-cuenta", { nombre_completo: "Ana", correo: "ana.nueva@example.com" });
  assert.match(decodeURIComponent(duplicado.loc), /actualizados/, "su propio correo no cuenta como duplicado");
});

test("un capturista no puede enviar avisos masivos a compradores", async () => {
  const a = cliente(srv.base);
  await a.entrar("ana", "Tercera123");
  assert.equal((await a.post("/configuracion/enviar-aviso-clientes", { asunto: "x", mensaje: "y" })).status, 403);
  assert.doesNotMatch((await a.get("/configuracion")).texto, /pane-avisos/);
});

test("cinco intentos fallidos bloquean temporalmente el inicio de sesión de ese usuario", async () => {
  const c = cliente(srv.base);
  for (let i = 0; i < 5; i++) assert.equal((await c.entrar("ana", "mala" + i)).status, 401);
  const bloqueado = await c.entrar("ana", "Tercera123");
  assert.equal(bloqueado.status, 429);
  assert.match(bloqueado.texto, /Demasiados intentos/);
  assert.equal((await cliente(srv.base).entrar(...ADMIN)).loc, "/inicio", "otros usuarios no se ven afectados");
});
