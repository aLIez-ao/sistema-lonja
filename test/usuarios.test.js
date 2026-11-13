import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Usuario, Comprador, Pedido } = modelos;
let srv;
before(async () => { srv = await arrancar(); });
after(async () => srv.cerrar());

test("usuarios separa trabajadores y clientes con búsquedas y páginas independientes", async () => {
  const admin = cliente(srv.base); await admin.entrar("admin", "AdminPrueba123");
  const capturista = await Usuario.create({ usuario: "trabajadorbase", nombre_completo: "Trabajador Base", correo: "trabajadorbase@example.com", password: "Captura1234", rol: "capturista", email_verificado: true });
  for (let i = 0; i < 21; i += 1) {
    await Usuario.create({ usuario: `trabajador${i}`, nombre_completo: `Trabajador ${i}`, correo: `trabajador${i}@example.com`, password: "Captura1234", rol: i % 2 ? "admin" : "capturista", email_verificado: true });
    const comprador = await Comprador.create({ nombre: `Cliente${i}`, apellido_paterno: "Prueba", correo: `cliente${i}@example.com` });
    await Usuario.create({ usuario: `cliente${i}`, nombre_completo: `Cliente ${i}`, correo: `cliente${i}@example.com`, password: "Cliente1234", rol: "comprador", codigo_cpr: comprador.codigo_cpr, email_verificado: i % 2 === 0 });
  }
  const clienteConPedidos = await Usuario.findOne({ where: { usuario: "cliente0" } });
  await Pedido.create({ id_usuario: clienteConPedidos.id, codigo_cpr: clienteConPedidos.codigo_cpr, estado: "cancelado", entrega: "recoger", subtotal: 10, costo_envio: 0, total: 10 });
  await Pedido.create({ id_usuario: clienteConPedidos.id, codigo_cpr: clienteConPedidos.codigo_cpr, estado: "pagado", entrega: "recoger", subtotal: 20, costo_envio: 0, total: 20 });

  const primera = await admin.get("/usuarios?qT=Trabajador&qC=Cliente&paginaT=1");
  assert.equal(primera.status, 200);
  const trabajadores = primera.texto.split('data-seccion-usuarios="trabajadores"')[1].split("</section>")[0];
  const clientes = primera.texto.split('data-seccion-usuarios="clientes"')[1].split("</section>")[0];
  assert.match(trabajadores, /@trabajador0/); assert.doesNotMatch(trabajadores, /@cliente0/);
  assert.match(clientes, /@cliente0/); assert.doesNotMatch(clientes, /@trabajador0/);
  assert.match(trabajadores, /Nuevo usuario/); assert.doesNotMatch(clientes, /Nuevo usuario/);
  assert.match(clientes, /Cliente #/); assert.match(clientes, />2</);
  assert.match(primera.texto, /qT=Trabajador[^\"]*&amp;?qC=Cliente/);

  const segunda = await admin.get("/usuarios?qT=Trabajador&qC=Cliente&paginaT=2");
  assert.match(segunda.texto, /Página 2 de 2/);
  const seccionClientes = segunda.texto.split('data-seccion-usuarios="clientes"')[1].split("</section>")[0];
  assert.match(seccionClientes, /@cliente0/);

  const capt = cliente(srv.base); await capt.entrar(capturista.usuario, "Captura1234");
  assert.equal((await capt.get("/usuarios")).status, 403);
});
