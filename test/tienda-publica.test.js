import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { arrancar, cliente, modelos } from "./ayuda.js";

const { Usuario, Comprador, Tipo, Lote, Especie, EspecieCatalogo, Compra, Pedido, PedidoItem, Pregunta, Opinion } = modelos;
let srv;
before(async () => { srv = await arrancar(); });
after(async () => srv.cerrar());

test("portada y fichas públicas no filtran datos privados del comprador", async () => {
  const tipo = await Tipo.findOne({ where: { nombre: "Pescado" } });
  const correoPrivado = "audit-privado@example.test";
  const nombrePrivado = "Identidad Reservada";
  const telefonoPrivado = "2299876543";
  const direccionPrivada = "Calle Confidencial 884, Colonia Cerrada";
  const comprador = await Comprador.create({ nombre: "Cliente", apellido_paterno: "Reservado", correo: correoPrivado, direccion: direccionPrivada });
  const usuario = await Usuario.create({ usuario: "comprador_confidencial", nombre_completo: nombrePrivado, correo: correoPrivado, telefono: telefonoPrivado, password: "Clave1234", rol: "comprador", codigo_cpr: comprador.codigo_cpr, email_verificado: true });
  const catalogo = await EspecieCatalogo.create({ nombre: "EspecieAuditoriaPublica", id_tpo: tipo.id_tpo, descripcion: "Ficha pública de auditoría", activo: true });
  const lote = await Lote.create({ kilos: 3, numero_cajas: 1, precio_kilo_salida: 17.11 });
  await Especie.create({ nombre: catalogo.nombre, id_cat: catalogo.id_cat, id_tpo: tipo.id_tpo, id_lte: lote.id_lte });
  for (const kilos of [4, 5]) {
    const disponible = await Lote.create({ kilos, numero_cajas: 1, precio_kilo_salida: 18, fecha: new Date() });
    await Especie.create({ nombre: catalogo.nombre, id_cat: catalogo.id_cat, id_tpo: tipo.id_tpo, id_lte: disponible.id_lte });
  }
  const pedido = await Pedido.create({ id_usuario: usuario.id, codigo_cpr: comprador.codigo_cpr, estado: "pagado", entrega: "domicilio", dir_destinatario: nombrePrivado, dir_telefono: telefonoPrivado, dir_texto: direccionPrivada, subtotal: 51.33, costo_envio: 0, total: 51.33, pago_ref: "SIM-PRIVADO-REFERENCIA", pago_ultimos4: "4242" });
  await PedidoItem.create({ id_ped: pedido.id_ped, id_lte: lote.id_lte, kilos: 3, precio_kilo: 17.11, subtotal: 51.33 });
  await Compra.create({ id_cmp: lote.id_lte, codigo_cpr: comprador.codigo_cpr, id_ped: pedido.id_ped, precio_kilo_final: 32921.81, precio_total: 98765.43 });
  await Opinion.create({ id_usuario: usuario.id, id_cat: catalogo.id_cat, estrellas: 5, titulo: "Opinión pública", texto: "Calidad excelente", visible: true });
  await Pregunta.create({ id_usuario: usuario.id, id_lte: lote.id_lte, texto: "Pregunta pública aprobada", estado: "respondida", respuesta: "La respuesta pública no tiene datos personales" });

  const web = cliente(srv.base);
  const respuestas = [
    (await web.get("/")).texto,
    (await web.get(`/tienda/lote/${lote.id_lte}`)).texto,
    (await web.get(`/tienda/especie/${catalogo.id_cat}`)).texto,
    (await web.get(`/tienda/sugerencias?q=EspecieAuditoriaPublica`)).texto,
  ];
  const portada = respuestas[0];
  assert.equal((portada.match(/data-buscador-tienda/g) || []).length, 1);
  assert.match(portada, /data-buscador-tienda[\s\S]*href="\/acceso"/);
  assert.doesNotMatch(portada.slice(portada.indexOf('class="tienda-barra"'), portada.indexOf('<!-- ===================== FILAS POR TEMA')), /data-buscador-tienda/);
  const numeroSlides = (portada.match(/tienda-heroe__slide/g) || []).length;
  if (numeroSlides >= 2) {
    assert.match(portada, /data-heroe-prev/);
    assert.match(portada, /data-heroe-next/);
    assert.match(portada, /data-heroe-punto="0"/);
  }
  assert.match(portada, /data-fila-prev/);
  assert.match(portada, /data-fila-next/);
  for (const contenido of respuestas) {
    for (const dato of [correoPrivado, nombrePrivado, telefonoPrivado, direccionPrivada, "SIM-PRIVADO-REFERENCIA", "98,765.43"]) {
      assert.equal(contenido.includes(dato), false, `no debe exponer ${dato}`);
    }
  }
  assert.match(respuestas[2], /Identidad R\./);
  assert.match(respuestas[2], /Calidad excelente/);
  assert.match(respuestas[1], /Pregunta pública aprobada/);
  assert.doesNotMatch(respuestas[3], /@example|telefono|direccion/i);

  const sesion = cliente(srv.base);
  assert.equal((await sesion.entrar(usuario.usuario, "Clave1234")).status, 302);
  const cuenta = await sesion.get("/cuenta");
  assert.match(cuenta.texto, /data-buscador-tienda/);
});
