// Fase 4: carrito, reserva, entrega y pago simulado.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { fijarTransporteParaPruebas } from "../helpers/email.js";

const { Usuario, Comprador, Tipo, Lote, Especie, DireccionEntrega, CarritoItem, Pedido, PedidoItem, Compra } = modelos;
let srv;
const medios = [];

before(async () => {
  srv = await arrancar();
  fijarTransporteParaPruebas({
    async verify() {},
    async sendMail(opciones) { medios.push(opciones); return { messageId: `pedido-prueba-${medios.length}` }; },
  });
});
after(async () => { fijarTransporteParaPruebas(null); await srv.cerrar(); });

async function comprador(correo) {
  const datos = correo.split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 30);
  const cpr = await Comprador.create({ nombre: "Ana", apellido_paterno: "Prueba", correo });
  const us = await Usuario.create({ usuario: datos, nombre_completo: "Ana Prueba", correo, password: "Clave1234", rol: "comprador", codigo_cpr: cpr.codigo_cpr, email_verificado: true });
  const web = cliente(srv.base);
  assert.equal((await web.entrar(us.usuario, "Clave1234")).status, 302);
  return { cpr, us, web };
}

async function lote({ nombre = "Pargo", kilos = 10, precio = 100 } = {}) {
  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  const l = await Lote.create({ kilos, numero_cajas: 2, precio_kilo_salida: precio });
  await Especie.create({ nombre, id_lte: l.id_lte, id_tpo: tipo.id_tpo });
  return l;
}

async function agregar(web, id) {
  return web.postJSON(`/carrito/agregar/${id}`, {});
}

test("carrito persistente por comprador y reserva al crear pedido", async () => {
  const a = await comprador("carrito.a@example.com");
  const b = await comprador("carrito.b@example.com");
  const l = await lote();
  const agregado = await agregar(a.web, l.id_lte);
  assert.equal(agregado.status, 200);
  assert.deepEqual(JSON.parse(agregado.texto), { ok: true, mensaje: `Lote #${l.id_lte} agregado al carrito.`, cantidad: 1 });
  assert.equal((await b.web.get("/carrito")).texto.includes("Pargo"), false, "el carrito de cada cuenta es privado");

  const creado = await a.web.post("/pedido", { entrega: "recoger", id_dir: "9999", subtotal: "0.01", total: "0.01" });
  assert.equal(creado.status, 302);
  assert.match(creado.loc, /^\/pedido\/\d+\/pago$/);
  const id = Number(/\/pedido\/(\d+)\/pago/.exec(creado.loc)[1]);
  const p = await Pedido.findByPk(id);
  assert.equal(p.estado, "pendiente_pago");
  assert.equal(Number(p.subtotal), 1000, "usa kilos y precio de la base, ignora el total del formulario");
  assert.equal(Number(p.total), 1000);
  assert.ok(new Date(p.reservado_hasta) > new Date());
  assert.equal(await CarritoItem.count({ where: { id_usuario: a.us.id } }), 0);
  assert.equal((await b.web.postJSON(`/carrito/agregar/${l.id_lte}`, {})).status, 409);
  assert.equal((await cliente(srv.base).get(`/tienda/lote/${l.id_lte}`)).status, 404, "el lote reservado no se publica a terceros");
  assert.equal((await b.web.get(`/pedido/${id}/pago`)).status, 404, "otro comprador no puede ver el pago");
});

test("checkout a domicilio copia la dirección y calcula envío en el servidor", async () => {
  const a = await comprador("domicilio@example.com");
  const l = await lote({ nombre: "Robalo", kilos: 5, precio: 200 });
  const d = await DireccionEntrega.create({
    id_usuario: a.us.id, alias: "Casa", destinatario: "Ana Prueba", telefono: "2291234567",
    calle: "Av. Mar", num_ext: "10", colonia: "Centro", cp: "91700", municipio: "Veracruz", estado: "Veracruz", principal: true,
  });
  await agregar(a.web, l.id_lte);
  const respuesta = await a.web.post("/pedido", { entrega: "domicilio", id_dir: d.id_dir, costo_envio: 0, total: 1 });
  const id = Number(/\/pedido\/(\d+)\/pago/.exec(respuesta.loc)[1]);
  const p = await Pedido.findByPk(id);
  assert.equal(p.entrega, "domicilio");
  assert.equal(p.id_dir, d.id_dir);
  assert.equal(p.dir_destinatario, "Ana Prueba");
  assert.match(p.dir_texto, /Av\. Mar 10, Centro/);
  assert.equal(Number(p.subtotal), 1000);
  assert.equal(Number(p.costo_envio), 150);
  assert.equal(Number(p.total), 1150);
  await d.update({ calle: "Calle cambiada" });
  assert.match((await Pedido.findByPk(id)).dir_texto, /Av\. Mar/, "el snapshot del pedido no cambia al editar la dirección");
});

test("pago rechazado no vende; aprobado crea compras, factura y es idempotente", async () => {
  medios.length = 0;
  const a = await comprador("pago@example.com");
  const l = await lote({ nombre: "Cazón", kilos: 12.5, precio: 80 });
  await agregar(a.web, l.id_lte);
  const checkout = await a.web.post("/pedido", { entrega: "recoger" });
  const id = Number(/\/pedido\/(\d+)\/pago/.exec(checkout.loc)[1]);
  const pagoUrl = `/pedido/${id}/pagar`;

  const rechazado = await a.web.post(pagoUrl, { numero: "4000000000000002", mes: "12", anio: "2030", cvv: "123" });
  assert.equal(rechazado.status, 302);
  assert.match(decodeURIComponent(rechazado.loc), /Tarjeta rechazada/);
  assert.equal(await Compra.count({ where: { id_cmp: l.id_lte } }), 0);
  assert.equal((await Pedido.findByPk(id)).estado, "pendiente_pago");

  const aprobado = await a.web.post(pagoUrl, { numero: "4242424242424242", mes: "12", anio: "2030", cvv: "123" });
  assert.equal(aprobado.status, 302);
  assert.match(aprobado.loc, new RegExp(`/cuenta/pedidos/${id}`));
  const p = await Pedido.findByPk(id);
  assert.equal(p.estado, "pagado");
  assert.equal(p.pago_ultimos4, "4242");
  assert.match(p.pago_ref, /^SIM-/);
  const compra = await Compra.findOne({ where: { id_cmp: l.id_lte } });
  assert.equal(compra.id_ped, id);
  assert.equal(Number(compra.precio_total), 1000);
  assert.equal(await Compra.count({ where: { id_ped: id } }), 1);
  assert.equal(Number((await PedidoItem.findOne({ where: { id_ped: id } })).precio_kilo), 80);
  assert.equal(JSON.stringify(p.toJSON()).includes("4242424242424242"), false);
  assert.equal(JSON.stringify(p.toJSON()).includes("123"), false);
  assert.equal(medios.length, 1);
  assert.equal(medios[0].attachments.length, 1);
  assert.match(medios[0].attachments[0].content.toString("ascii", 0, 5), /^%PDF-/);

  await a.web.post(pagoUrl, { numero: "4242424242424242", mes: "12", anio: "2030", cvv: "123" });
  assert.equal(await Compra.count({ where: { id_ped: id } }), 1, "un segundo POST no repite el pago");
  assert.equal(medios.length, 1);
  assert.equal((await a.web.get(`/cuenta/pedidos/${id}`)).status, 200);
  assert.equal((await a.web.get(`/cuenta/pedidos/${id}/factura/${l.id_lte}`)).status, 200);
  assert.equal((await a.web.get(`/cuenta/pedidos/${id}/factura/${l.id_lte}.pdf`)).headers.get("content-type"), "application/pdf");

  const b = await comprador("ajeno@example.com");
  assert.equal((await b.web.get(`/cuenta/pedidos/${id}`)).status, 404);
  assert.equal((await b.web.get(`/cuenta/pedidos/${id}/factura/${l.id_lte}.pdf`)).status, 404);
});

test("cancelar y expirar pedidos libera los lotes; correo sin verificar no inicia checkout", async () => {
  const a = await comprador("liberar@example.com");
  const l = await lote({ nombre: "Sierra", kilos: 4, precio: 50 });
  await agregar(a.web, l.id_lte);
  const checkout = await a.web.post("/pedido", { entrega: "recoger" });
  const id = Number(/\/pedido\/(\d+)\/pago/.exec(checkout.loc)[1]);
  await a.web.post(`/pedido/${id}/cancelar`, {});
  assert.equal((await Pedido.findByPk(id)).estado, "cancelado");
  const b = await comprador("liberar.b@example.com");
  assert.equal((await agregar(b.web, l.id_lte)).status, 200);

  const l2 = await lote({ nombre: "Atún", kilos: 4, precio: 50 });
  await agregar(b.web, l2.id_lte);
  const checkout2 = await b.web.post("/pedido", { entrega: "recoger" });
  const id2 = Number(/\/pedido\/(\d+)\/pago/.exec(checkout2.loc)[1]);
  await Pedido.update({ reservado_hasta: new Date(Date.now() - 1000) }, { where: { id_ped: id2 } });
  const tercero = await comprador("liberar.c@example.com");
  assert.equal((await tercero.web.postJSON(`/carrito/agregar/${l2.id_lte}`, {})).status, 200);
  const vencido = await b.web.post(`/pedido/${id2}/pagar`, { numero: "4242424242424242", mes: "12", anio: "2030", cvv: "123" });
  assert.match(decodeURIComponent(vencido.loc), /reserva venció/);
  assert.equal((await Pedido.findByPk(id2)).estado, "expirado");

  const sinVerificar = await Usuario.create({ usuario: "sinverificar", nombre_completo: "Pendiente", correo: "sinverificar@example.com", password: "Clave1234", rol: "comprador", email_verificado: false });
  const sc = cliente(srv.base); await sc.entrar(sinVerificar.usuario, "Clave1234");
  const no = await sc.get("/pedido/nuevo");
  assert.equal(no.status, 302);
  assert.match(no.loc, /^\/cuenta\?/);
});
