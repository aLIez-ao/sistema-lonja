// Fase 2: rol comprador, registro público, cuenta, direcciones de entrega y
// aislamiento de datos entre compradores.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { limiteRegistro } from "../controllers/registroController.js";

const { Usuario, Comprador, DireccionEntrega } = modelos;
let srv;

before(async () => { srv = await arrancar(); });
after(() => srv.cerrar());

const base = () => srv.base;
const nuevo = () => cliente(base());

const DATOS = {
  nombre: "Ana",
  apellido_paterno: "Ruiz",
  apellido_materno: "López",
  correo: "ana@example.com",
  telefono: "2291234567",
  password: "Clave1234",
  password_confirmar: "Clave1234",
  aviso_privacidad: "on",
};

const datosRegistro = (cambios = {}) => ({ ...DATOS, ...cambios });

/** Enlace de verificación que el simulador de correo deja en la página de registro. */
const enlaceVerificacion = (texto) => {
  const m = /\/verificar-email\/[0-9a-f]{24,}/.exec(String(texto));
  return m ? m[0] : null;
};

const usuarioPorCorreo = (correo) => Usuario.findOne({ where: { correo } });

/** Registra y devuelve la respuesta; no verifica el correo. */
const registrar = async (cambios = {}) => {
  const c = nuevo();
  const r = await c.post("/registro", datosRegistro(cambios));
  return { c, r };
};

/** Registra, abre el enlace de verificación y devuelve el cliente con sesión iniciada. */
async function compradorVerificado(correo, password = "Clave1234") {
  const { c, r } = await registrar({ correo });
  assert.equal(r.status, 200, "el registro debe responder la página genérica");
  const enlace = enlaceVerificacion(r.texto);
  assert.ok(enlace, `el registro debe incluir el enlace de verificación\n${r.texto.slice(0, 500)}`);

  const v = await c.get(enlace);
  assert.equal(v.status, 302, "la verificación redirige al acceso");

  const us = await usuarioPorCorreo(correo);
  assert.equal(us.email_verificado, true);

  const login = await c.entrar(us.usuario, password);
  assert.equal(login.status, 302, "el comprador verificado puede iniciar sesión");
  return { c, us };
}

test("registro feliz: crea Usuario comprador y su Comprador, y envía verificación", async () => {
  limiteRegistro.reiniciar();
  const { r } = await registrar();
  assert.equal(r.status, 200);
  assert.match(r.texto, /Revisa tu correo/);
  assert.ok(enlaceVerificacion(r.texto), "en modo simulador se muestra el enlace");

  const us = await usuarioPorCorreo("ana@example.com");
  assert.ok(us, "se creó la cuenta");
  assert.equal(us.rol, "comprador");
  assert.equal(us.email_verificado, false);
  assert.ok(us.codigo_cpr, "la cuenta queda vinculada a su comprador");
  assert.equal(us.usuario, "ana");

  const cpr = await Comprador.findByPk(us.codigo_cpr);
  assert.equal(cpr.correo, "ana@example.com");
  assert.equal(cpr.nombre, "Ana");
  assert.equal(cpr.apellido_paterno, "Ruiz");
  assert.equal(cpr.apellido_materno, "López");

  // El mismo nombre local en otro dominio recibe un sufijo numérico.
  const otro = await registrar({ correo: "ana@otro.com" });
  assert.equal(otro.r.status, 200);
  const us2 = await usuarioPorCorreo("ana@otro.com");
  assert.equal(us2.usuario, "ana1");
});

test("registro duplicado: respuesta uniforme, sin crear nada ni revelar la cuenta", async () => {
  limiteRegistro.reiniciar();
  const usuarios = await Usuario.count();
  const compradores = await Comprador.count();
  const { r } = await registrar({ password: "OtraClave99", password_confirmar: "OtraClave99" });
  assert.equal(r.status, 200);
  assert.match(r.texto, /Revisa tu correo/);
  assert.doesNotMatch(r.texto, /ya existe|ya está registrad|correo en uso/i);
  assert.equal(await Usuario.count(), usuarios, "no se crea otra cuenta");
  assert.equal(await Comprador.count(), compradores, "no se crea otro comprador");
});

test("registro: contraseñas distintas o sin aviso de privacidad se rechazan sin crear cuenta", async () => {
  limiteRegistro.reiniciar();
  const usuarios = await Usuario.count();

  const mismatch = await registrar({ correo: "mismatch@example.com", password_confirmar: "OtraClave99" });
  assert.equal(mismatch.r.status, 400);
  assert.match(mismatch.r.texto, /Las contraseñas no coinciden/);

  const sinAviso = await registrar({ correo: "sinaviso@example.com", aviso_privacidad: "" });
  assert.equal(sinAviso.r.status, 400);
  assert.match(sinAviso.r.texto, /aviso de privacidad/);

  assert.equal(await Usuario.count(), usuarios);
});

test("honeypot: un bot que llena el campo trampa no crea cuentas", async () => {
  limiteRegistro.reiniciar();
  const usuarios = await Usuario.count();
  const { r } = await registrar({ correo: "bot@example.com", sitio_web: "https://spam.example" });
  assert.equal(r.status, 200);
  assert.match(r.texto, /Revisa tu correo/);
  assert.equal(await Usuario.count(), usuarios);
  assert.equal(await usuarioPorCorreo("bot@example.com"), null);
});

test("un comprador sin verificar puede entrar y ver su cuenta, pero la cuenta lo avisa", async () => {
  limiteRegistro.reiniciar();
  const { c, r } = await registrar({ correo: "pendiente@example.com" });
  assert.equal(r.status, 200);
  const us = await usuarioPorCorreo("pendiente@example.com");
  assert.equal(us.email_verificado, false);

  const login = await c.entrar(us.usuario, "Clave1234");
  assert.equal(login.status, 302);
  assert.equal(login.loc, "/");

  const portada = await c.get("/");
  assert.equal(portada.status, 200);
  assert.match(portada.texto, /tienda en línea está por abrir/i);

  const cuenta = await c.get("/cuenta");
  assert.equal(cuenta.status, 200);
  assert.match(cuenta.texto, /no está verificado/i);
  assert.match(cuenta.texto, /Reenviar verificación/);

  // La verificación es requisito para pagar: en la Fase 4 el checkout la exigirá.
  assert.equal((await usuarioPorCorreo("pendiente@example.com")).email_verificado, false);
});

test("un Comprador de mostrador se vincula solo después de verificar el correo", async () => {
  limiteRegistro.reiniciar();
  const cpr = await Comprador.create({
    nombre: "Luis",
    apellido_paterno: "Soto",
    correo: "mostrador@example.com",
  });
  const compradores = await Comprador.count();

  const { r } = await registrar({ correo: "mostrador@example.com", nombre: "Luis", apellido_paterno: "Soto" });
  assert.equal(r.status, 200);

  const us = await usuarioPorCorreo("mostrador@example.com");
  assert.equal(us.codigo_cpr, null, "todavía no se apropia del historial del mostrador");
  assert.equal(await Comprador.count(), compradores, "no se duplica el comprador");

  const enlace = enlaceVerificacion(r.texto);
  assert.ok(enlace);
  const v = await nuevo().get(enlace);
  assert.equal(v.status, 302);

  await us.reload();
  assert.equal(us.email_verificado, true);
  assert.equal(us.codigo_cpr, cpr.codigo_cpr, "al verificar hereda el comprador existente");
});

test("volver externo se ignora; la ruta interna pedida se respeta", async () => {
  const admin = nuevo();
  const mal1 = await admin.post("/credenciales", { usuario: "admin", password: "AdminPrueba123", volver: "//evil.com" });
  assert.equal(mal1.status, 302);
  assert.equal(mal1.loc, "/inicio");

  const mal2 = await admin.post("/credenciales", { usuario: "admin", password: "AdminPrueba123", volver: "https://evil.com" });
  assert.equal(mal2.loc, "/inicio");

  const interno = await admin.post("/credenciales", { usuario: "admin", password: "AdminPrueba123", volver: "/lotes?orden=kilos" });
  assert.equal(interno.loc, "/lotes?orden=kilos");

  const comprador = nuevo();
  const us = await usuarioPorCorreo("ana@example.com");
  const mal3 = await comprador.post("/credenciales", { usuario: us.usuario, password: "Clave1234", volver: "//evil.com" });
  assert.equal(mal3.loc, "/");

  const bien = await comprador.post("/credenciales", { usuario: us.usuario, password: "Clave1234", volver: "/cuenta" });
  assert.equal(bien.loc, "/cuenta");
});

test("matriz de permisos: el comprador no entra al personal y el personal no entra a /cuenta", async () => {
  const us = await usuarioPorCorreo("ana@example.com");
  const c = nuevo();
  assert.equal((await c.entrar(us.usuario, "Clave1234")).status, 302);

  const rutas = [
    "/inicio",
    "/compras",
    "/lotes",
    "/especies",
    "/catalogo",
    "/compradores",
    "/tipos",
    "/reportes/diario",
    "/usuarios",
    "/buscar?q=huachinango",
  ];
  for (const ruta of rutas) {
    const r = await c.get(ruta);
    assert.equal(r.status, 403, `${ruta} debe responder 403 al comprador`);
  }

  const admin = nuevo();
  assert.equal((await admin.entrar("admin", "AdminPrueba123")).status, 302);
  const cuenta = await admin.get("/cuenta");
  assert.equal(cuenta.status, 403, "el personal no tiene cuenta de comprador");
});

test("direcciones: CP inválido, máximo 10 y una sola principal", async () => {
  limiteRegistro.reiniciar();
  const { c, us } = await compradorVerificado("direcciones@example.com");
  const dir = {
    alias: "Casa",
    destinatario: "Ana Ruiz",
    telefono: "2291234567",
    calle: "Calle Primera",
    num_ext: "10",
    num_int: "2",
    colonia: "Centro",
    cp: "91700",
    municipio: "Veracruz",
    estado: "Veracruz",
    referencias: "Portón azul",
  };

  const malCp = await c.post("/cuenta/direcciones", { ...dir, cp: "123" });
  assert.equal(malCp.status, 400);
  assert.match(malCp.texto, /código postal.*5 dígitos/i);
  assert.equal(await DireccionEntrega.count({ where: { id_usuario: us.id } }), 0);

  const primera = await c.post("/cuenta/direcciones", dir);
  assert.equal(primera.status, 302);
  let propias = await DireccionEntrega.findAll({ where: { id_usuario: us.id }, order: [["id_dir", "ASC"]] });
  assert.equal(propias.length, 1);
  assert.equal(propias[0].principal, true, "la primera dirección es la principal");

  for (let i = 1; i < 10; i += 1) {
    const r = await c.post("/cuenta/direcciones", { ...dir, alias: `Casa ${i + 1}` });
    assert.equal(r.status, 302, `la dirección ${i + 1} se guarda`);
  }
  propias = await DireccionEntrega.findAll({ where: { id_usuario: us.id }, order: [["id_dir", "ASC"]] });
  assert.equal(propias.length, 10);

  const once = await c.post("/cuenta/direcciones", { ...dir, alias: "Casa 11" });
  assert.equal(once.status, 400);
  assert.match(once.texto, /máximo 10 direcciones/i);
  assert.equal(await DireccionEntrega.count({ where: { id_usuario: us.id } }), 10);

  const ultima = propias[propias.length - 1];
  const marcar = await c.post(`/cuenta/direcciones/${ultima.id_dir}/principal`, {});
  assert.equal(marcar.status, 302);
  assert.equal(await DireccionEntrega.count({ where: { id_usuario: us.id, principal: true } }), 1);
  await ultima.reload();
  assert.equal(ultima.principal, true);
});

test("IDOR: un comprador no puede ver, editar ni borrar direcciones de otro", async () => {
  limiteRegistro.reiniciar();
  const a = await compradorVerificado("a@example.com");
  const b = await compradorVerificado("b@example.com");

  const creada = await a.c.post("/cuenta/direcciones", {
    alias: "Solo de A",
    destinatario: "A",
    telefono: "2291234567",
    calle: "Privada",
    num_ext: "1",
    colonia: "Centro",
    cp: "91700",
    municipio: "Veracruz",
    estado: "Veracruz",
  });
  assert.equal(creada.status, 302);
  const dirA = await DireccionEntrega.findOne({ where: { id_usuario: a.us.id } });
  assert.ok(dirA);

  const editar = await b.c.get(`/cuenta/direcciones/${dirA.id_dir}/editar`);
  assert.equal(editar.status, 404, "ver una dirección ajena responde 404, no 403");
  const actualizar = await b.c.post(`/cuenta/direcciones/${dirA.id_dir}?_method=PUT`, { ...dirA.toJSON(), alias: "Robada" });
  assert.equal(actualizar.status, 404);
  const borrar = await b.c.post(`/cuenta/direcciones/${dirA.id_dir}?_method=DELETE`, {});
  assert.equal(borrar.status, 404);

  await dirA.reload();
  assert.equal(dirA.alias, "Solo de A");

  const listaB = await b.c.get("/cuenta/direcciones");
  assert.equal(listaB.status, 200);
  assert.doesNotMatch(listaB.texto, /Solo de A/);
});

test("las pantallas de la cuenta del comprador y los avisos del personal renderizan", async () => {
  limiteRegistro.reiniciar();
  const { c, us } = await compradorVerificado("pantallas@example.com");

  for (const ruta of ["/cuenta", "/cuenta/datos", "/cuenta/direcciones", "/cuenta/direcciones/nueva", "/configuracion"]) {
    const r = await c.get(ruta);
    assert.equal(r.status, 200, `${ruta} debe renderizar para el comprador`);
  }
  const config = await c.get("/configuracion");
  assert.doesNotMatch(config.texto, /Avisos a compradores/, "el comprador no ve la pestaña de avisos");
  assert.doesNotMatch(config.texto, /id="tab-cuenta"/, "Mi cuenta vive en /cuenta, no en Configuración");

  const alta = await c.post("/cuenta/direcciones", {
    alias: "Oficina",
    destinatario: "Ana",
    telefono: "2291234567",
    calle: "Calle 2",
    num_ext: "5",
    colonia: "Centro",
    cp: "91700",
    municipio: "Veracruz",
    estado: "Veracruz",
  });
  assert.equal(alta.status, 302);
  const dir = await DireccionEntrega.findOne({ where: { id_usuario: us.id } });
  const editar = await c.get(`/cuenta/direcciones/${dir.id_dir}/editar`);
  assert.equal(editar.status, 200);
  assert.match(editar.texto, /Editar dirección/);

  const admin = nuevo();
  assert.equal((await admin.entrar("admin", "AdminPrueba123")).status, 302);

  const detalle = await admin.get(`/compradores/${us.codigo_cpr}`);
  assert.equal(detalle.status, 200);
  assert.match(detalle.texto, /Cuenta en línea/);
  assert.match(detalle.texto, new RegExp(`@${us.usuario}`));

  const formUs = await admin.get(`/usuarios/${us.id}/editar`);
  assert.equal(formUs.status, 200);
  assert.match(formUs.texto, /name="rol" value="comprador"/);
  assert.match(formUs.texto, /solo puedes desactivarla/);

  const crearUs = await admin.get("/usuarios/crear");
  assert.equal(crearUs.status, 200);
  assert.doesNotMatch(crearUs.texto, /<option value="comprador"/);
});

test("el administrador no puede crear ni convertir una cuenta en comprador a mano", async () => {
  const admin = nuevo();
  assert.equal((await admin.entrar("admin", "AdminPrueba123")).status, 302);
  const usuarios = await Usuario.count();

  const alta = await admin.post("/usuarios", {
    usuario: "comprador_manual",
    nombre_completo: "Comprador Manual",
    correo: "manual@example.com",
    rol: "comprador",
    acceso: "invitacion",
  });
  assert.equal(alta.status, 400);
  assert.match(alta.texto, /registro público/i);
  assert.equal(await Usuario.count(), usuarios);

  const cprComprador = await usuarioPorCorreo("pantallas@example.com");
  const ascender = await admin.post(`/usuarios/${cprComprador.id}?_method=PUT`, {
    usuario: cprComprador.usuario,
    nombre_completo: cprComprador.nombre_completo,
    correo: cprComprador.correo,
    rol: "admin",
    activo: "on",
  });
  assert.equal(ascender.status, 400);
  assert.match(ascender.texto, /rol de una cuenta de comprador no se puede cambiar/i);
  await cprComprador.reload();
  assert.equal(cprComprador.rol, "comprador");
});

test("el comprador edita sus datos y facturación; un RFC inválido se rechaza", async () => {
  limiteRegistro.reiniciar();
  const { c, us } = await compradorVerificado("edatos@example.com");

  const ok = await c.post("/cuenta/datos", {
    nombre: "Ana",
    apellido_paterno: "Ruiz",
    apellido_materno: "López",
    correo: us.correo,
    telefono: "2290000000",
    rfc: "XAXX010101000",
    razon_social: "Mariscos del Golfo SA de CV",
  });
  assert.equal(ok.status, 302);
  assert.match(decodeURIComponent(String(ok.loc).split("?")[1] || ""), /datos quedaron guardados/i);
  await us.reload();
  assert.equal(us.telefono, "2290000000");
  assert.equal(us.rfc, "XAXX010101000");
  assert.equal(us.razon_social, "Mariscos del Golfo SA de CV");

  const mal = await c.post("/cuenta/datos", {
    nombre: "Ana",
    apellido_paterno: "Ruiz",
    apellido_materno: "López",
    correo: us.correo,
    telefono: "2290000000",
    rfc: "123",
    razon_social: "",
  });
  assert.equal(mal.status, 400);
  assert.match(mal.texto, /RFC no tiene un formato válido/i);
  await us.reload();
  assert.equal(us.rfc, "XAXX010101000", "el dato anterior no se pierde");
});

test("el registro limita a 5 intentos por hora desde la misma IP", async () => {
  limiteRegistro.reiniciar();
  const estados = [];
  for (let i = 0; i < 6; i += 1) {
    const { r } = await registrar({ correo: `limite${i}@example.com` });
    estados.push(r.status);
  }
  assert.deepEqual(estados.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.equal(estados[5], 429, "el sexto intento queda bloqueado");
});
