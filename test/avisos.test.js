import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, cliente, modelos } from './ayuda.js';
import { fijarTransporteParaPruebas } from '../compartido/ayudantes/email.js';
import { esperarColaTrabajos } from '../compartido/ayudantes/colaTrabajos.js';

const { Usuario, Comprador } = modelos;
let srv;
const enviados = [];
before(async () => {
  srv = await arrancar();
  fijarTransporteParaPruebas({
    async sendMail(opciones) {
      enviados.push(opciones);
      return { messageId: 'aviso-test' };
    },
  });
});
after(async () => {
  fijarTransporteParaPruebas(null);
  await srv.cerrar();
});

test('los avisos solo llegan a compradores suscritos y el enlace permite confirmar la baja', async () => {
  const c = await Comprador.create({ nombre: 'Suscrita', apellido_paterno: 'Prueba', correo: 'suscrita@example.com' });
  const suscrita = await Usuario.create({
    usuario: 'suscrita_aviso',
    nombre_completo: 'Suscrita Prueba',
    correo: c.correo,
    password: 'Clave1234',
    rol: 'comprador',
    codigo_cpr: c.codigo_cpr,
    activo: true,
    email_verificado: true,
    recibir_avisos: true,
  });
  const c2 = await Comprador.create({ nombre: 'No', apellido_paterno: 'Suscrita', correo: 'nosuscrita@example.com' });
  await Usuario.create({
    usuario: 'no_suscrita_aviso',
    nombre_completo: 'No Suscrita',
    correo: c2.correo,
    password: 'Clave1234',
    rol: 'comprador',
    codigo_cpr: c2.codigo_cpr,
    activo: true,
    email_verificado: true,
    recibir_avisos: false,
  });
  const admin = cliente(srv.base);
  await admin.entrar('admin', 'AdminPrueba123');

  const respuesta = await admin.post('/configuracion/enviar-aviso-clientes', {
    asunto: 'Horario de subasta',
    titulo: 'Cambio de horario',
    mensaje: 'La subasta iniciará a las 9:00.',
    tipo: 'evento',
  });
  assert.equal(respuesta.status, 302);
  assert.match(decodeURIComponent(respuesta.loc), /Aviso en cola para 1 suscriptores/);
  await esperarColaTrabajos();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, suscrita.correo);
  assert.match(enviados[0].html, /date de baja aquí/);
  const urlBaja = /href="(http:\/\/[^"]+\/avisos\/baja\/[^"]+)"/.exec(enviados[0].html)?.[1];
  assert.ok(urlBaja);

  const anonimo = cliente(srv.base);
  assert.equal((await anonimo.get('/avisos/baja/no-valido')).status, 400);
  const confirmacion = await anonimo.get(new URL(urlBaja).pathname);
  assert.equal(confirmacion.status, 200);
  assert.match(confirmacion.texto, /Confirmar baja de avisos/);
  const baja = await anonimo.post(new URL(urlBaja).pathname, {});
  assert.equal(baja.status, 200);
  await suscrita.reload();
  assert.equal(suscrita.recibir_avisos, false);
});

test('la tienda informa a compradores sin suscripción y omite el aviso a quienes ya aceptaron', async () => {
  const c1 = await Comprador.create({ nombre: 'Sin', apellido_paterno: 'Avisos', correo: 'sinavisos@example.com' });
  const sinAvisos = await Usuario.create({
    usuario: 'cliente_sin_avisos',
    nombre_completo: 'Cliente Sin Avisos',
    correo: c1.correo,
    password: 'Clave1234',
    rol: 'comprador',
    codigo_cpr: c1.codigo_cpr,
    activo: true,
    email_verificado: true,
    recibir_avisos: false,
  });
  const c2 = await Comprador.create({ nombre: 'Con', apellido_paterno: 'Avisos', correo: 'conavisos@example.com' });
  const conAvisos = await Usuario.create({
    usuario: 'cliente_con_avisos',
    nombre_completo: 'Cliente Con Avisos',
    correo: c2.correo,
    password: 'Clave1234',
    rol: 'comprador',
    codigo_cpr: c2.codigo_cpr,
    activo: true,
    email_verificado: true,
    recibir_avisos: true,
  });

  const clienteSin = cliente(srv.base);
  await clienteSin.entrar(sinAvisos.usuario, 'Clave1234');
  const paginaSin = await clienteSin.get('/');
  assert.match(paginaSin.texto, /data-aviso-suscripcion/);
  assert.match(paginaSin.texto, /href="\/configuracion"/);

  const clienteCon = cliente(srv.base);
  await clienteCon.entrar(conAvisos.usuario, 'Clave1234');
  assert.doesNotMatch((await clienteCon.get('/')).texto, /data-aviso-suscripcion/);
});

test('cerrar el aviso de suscripción lo guarda en la cuenta y no reaparece en otra sesión', async () => {
  const c = await Comprador.create({
    nombre: 'Aviso',
    apellido_paterno: 'Persistente',
    correo: 'persistente@example.com',
  });
  const usuario = await Usuario.create({
    usuario: 'aviso_persistente',
    nombre_completo: 'Aviso Persistente',
    correo: c.correo,
    password: 'Clave1234',
    rol: 'comprador',
    codigo_cpr: c.codigo_cpr,
    activo: true,
    email_verificado: true,
    recibir_avisos: false,
  });
  const sesion = cliente(srv.base);
  await sesion.entrar(usuario.usuario, 'Clave1234');
  assert.match((await sesion.get('/')).texto, /data-aviso-suscripcion/);
  assert.equal((await sesion.postJSON('/avisos/descartar-suscripcion', {})).status, 200);
  assert.equal((await Usuario.findByPk(usuario.id)).aviso_suscripcion_descartado, true);

  const otraSesion = cliente(srv.base);
  await otraSesion.entrar(usuario.usuario, 'Clave1234');
  assert.doesNotMatch((await otraSesion.get('/')).texto, /data-aviso-suscripcion/);
});

test('los avisos rechazan asuntos y mensajes fuera de los límites', async () => {
  const admin = cliente(srv.base);
  await admin.entrar('admin', 'AdminPrueba123');
  const r = await admin.post('/configuracion/enviar-aviso-clientes', {
    asunto: 'x'.repeat(121),
    mensaje: 'Mensaje válido',
    tipo: 'evento',
  });
  assert.equal(r.status, 302);
  assert.match(decodeURIComponent(r.loc), /asunto es obligatorio/);
  assert.equal(enviados.length, 1);
});
