import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import { arrancar, db, modelos } from "./ayuda.js";
import { cargarDemo } from "../scripts/demo.js";

let srv;
before(async () => { srv = await arrancar(); });
after(async () => srv.cerrar());

test("carga demo idempotente, con pedidos coherentes y opiniones verificadas", async () => {
  await cargarDemo(db);
  const contar = async () => Promise.all([modelos.Comprador.count(), modelos.Lote.count(), modelos.Compra.count(), modelos.Pedido.count(), modelos.Pregunta.count(), modelos.Opinion.count(), modelos.EspecieCatalogo.count()]);
  const primero = await contar();
  await cargarDemo(db);
  assert.deepEqual(await contar(), primero);
  await cargarDemo(db, { limpio: true });
  assert.deepEqual(await contar(), primero, "el modo limpio reemplaza solo los elementos marcados como demo");
  assert.ok(primero[1] >= 80, "conserva históricos y añade al menos 40 lotes disponibles");
  const pagados = await modelos.Pedido.findAll({ where: { estado: ["pagado", "preparando", "enviado", "entregado"] }, include: [{ model: modelos.Compra, as: "compras" }] });
  assert.ok(pagados.length >= 4);
  for (const pedido of pagados) {
    assert.ok(pedido.compras.length);
    assert.equal(Number(pedido.compras[0].precio_total), Number(pedido.total));
  }
  const opiniones = await modelos.Opinion.findAll({ include: [{ model: modelos.Usuario, as: "autor" }] });
  assert.ok(opiniones.length);
  for (const opinion of opiniones) {
    const compra = await modelos.Compra.findOne({ where: { codigo_cpr: opinion.autor.codigo_cpr, id_ped: { [Op.ne]: null } } });
    assert.ok(compra, `opinion ${opinion.id_op} debe tener una compra vinculada`);
  }
});
