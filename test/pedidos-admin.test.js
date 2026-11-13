import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";
import { fijarTransporteParaPruebas } from "../helpers/email.js";

const { Usuario, Comprador, Tipo, Lote, Especie, Pedido, PedidoItem, Compra } = modelos;
let srv; const correos = [];
before(async () => { srv = await arrancar(); fijarTransporteParaPruebas({ async sendMail(m) { correos.push(m); return { messageId: "admin-test" }; } }); });
after(async () => { fijarTransporteParaPruebas(null); await srv.cerrar(); });

test("administración de pedidos filtra, avanza estado y notifica enviado/entregado", async () => {
  const c = await Comprador.create({ nombre: "María", apellido_paterno: "Pérez", correo: "maria.perez@example.com" });
  const u = await Usuario.create({ usuario: "pedido_cliente", nombre_completo: "María Pérez", correo: c.correo, password: "Clave1234", rol: "comprador", codigo_cpr: c.codigo_cpr, email_verificado: true });
  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  const lote = await Lote.create({ kilos: 10, numero_cajas: 2, precio_kilo_salida: 50 });
  await Especie.create({ nombre: "Pargo", id_tpo: tipo.id_tpo, id_lte: lote.id_lte });
  const pedido = await Pedido.create({ id_usuario: u.id, codigo_cpr: c.codigo_cpr, estado: "pagado", entrega: "recoger", subtotal: 500, costo_envio: 0, total: 500, pago_ref: "SIM-1" });
  await PedidoItem.create({ id_ped: pedido.id_ped, id_lte: lote.id_lte, kilos: 10, precio_kilo: 50, subtotal: 500 });
  await Compra.create({ id_cmp: lote.id_lte, codigo_cpr: c.codigo_cpr, id_ped: pedido.id_ped, precio_kilo_final: 50, precio_total: 500 });
  const admin = cliente(srv.base); await admin.entrar("admin", "AdminPrueba123");
  assert.equal((await admin.get("/pedidos?q=maria")).status, 200);
  assert.equal((await admin.post(`/pedidos/${pedido.id_ped}/estado`, { estado: "enviado" })).status, 302, "salta preparando y no permite avanzar más de una etapa");
  assert.equal((await Pedido.findByPk(pedido.id_ped)).estado, "pagado");
  await admin.post(`/pedidos/${pedido.id_ped}/estado`, { estado: "preparando" });
  await admin.post(`/pedidos/${pedido.id_ped}/estado`, { estado: "enviado" });
  await admin.post(`/pedidos/${pedido.id_ped}/estado`, { estado: "entregado" });
  assert.equal((await Pedido.findByPk(pedido.id_ped)).estado, "entregado");
  assert.equal(correos.length, 2);
  const inicio = await admin.get("/inicio");
  assert.equal(inicio.status, 200); assert.match(inicio.texto, /Ventas en línea|Origen de compras/);
  const comprador = cliente(srv.base); await comprador.entrar(u.usuario, "Clave1234");
  assert.notEqual((await comprador.get("/pedidos")).status, 200);
  assert.equal((await comprador.get("/cuenta/pedidos")).status, 200);
});
