import { Op } from "sequelize";
import { Lista, ListaItem, Pregunta, Opinion, EspecieCatalogo, Especie, Lote, Compra, Pedido, Usuario } from "../models/index.js";
import { crearLimite } from "../helpers/seguridad.js";
import { enviarEmailRespuestaPregunta } from "../helpers/email.js";

const limitePreguntas = crearLimite({ max: 5, ventanaMs: 60 * 60 * 1000 });
const limpio = (v, max) => String(v ?? "").trim().slice(0, max);
const noVacio = (v) => limpio(v, 500).length > 0;

export async function listas(req, res) {
  let favoritas = await Lista.findOne({ where: { id_usuario: req.usuario.id, nombre: "Favoritos" } });
  if (!favoritas) favoritas = await Lista.create({ id_usuario: req.usuario.id, nombre: "Favoritos" });
  res.render("cuenta/listas", { listas: await Lista.findAll({ where: { id_usuario: req.usuario.id }, order: [["nombre", "ASC"]] }) });
}
export async function crearLista(req, res) {
  const nombre = limpio(req.body.nombre, 40);
  if (!nombre) return res.status(400).redirect("/cuenta/listas");
  try { await Lista.create({ id_usuario: req.usuario.id, nombre }); } catch { /* nombre duplicado */ }
  res.redirect("/cuenta/listas");
}
export async function guardarFavorito(req, res) {
  const tipo = req.body.tipo === "especie" ? "especie" : "lote";
  const id_ref = Number(req.body.id_ref);
  if (!Number.isInteger(id_ref) || id_ref < 1) return res.status(400).redirect("/");
  const entidad = tipo === "lote" ? await Lote.findByPk(id_ref) : await EspecieCatalogo.findByPk(id_ref);
  if (!entidad) return res.sendStatus(404);
  const [lista] = await Lista.findOrCreate({ where: { id_usuario: req.usuario.id, nombre: "Favoritos" }, defaults: { fecha: new Date() } });
  await ListaItem.findOrCreate({ where: { id_lista: lista.id_lista, tipo, id_ref }, defaults: { fecha: new Date() } });
  res.redirect(req.get("referer") || "/cuenta/listas");
}
export async function detalleLista(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return res.sendStatus(404);
  const items = await ListaItem.findAll({ where: { id_lista: lista.id_lista }, order: [["fecha", "DESC"]] });
  const datos = await Promise.all(items.map(async (i) => {
    const elemento = i.tipo === "lote" ? await Lote.findByPk(i.id_ref, { include: [{ model: Especie, as: "especies" }, { model: Compra, as: "compra" }] }) : await EspecieCatalogo.findByPk(i.id_ref);
    return elemento ? { tipo: i.tipo, elemento, vendido: i.tipo === "lote" && Boolean(elemento.compra) } : null;
  }));
  res.render("cuenta/lista", { lista, items: datos.filter(Boolean) });
}
export async function agregarLista(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  const tipo = req.body.tipo === "especie" ? "especie" : "lote";
  const id_ref = Number(req.body.id_ref);
  const existe = lista && Number.isInteger(id_ref) && id_ref > 0 && (tipo === "lote" ? await Lote.findByPk(id_ref) : await EspecieCatalogo.findByPk(id_ref));
  if (!lista) return res.sendStatus(404);
  if (!existe) return res.status(400).redirect("back");
  await ListaItem.findOrCreate({ where: { id_lista: lista.id_lista, tipo, id_ref }, defaults: { fecha: new Date() } });
  res.redirect(req.get("referer") || `/cuenta/listas/${lista.id_lista}`);
}
export async function renombrarLista(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return res.sendStatus(404);
  const nombre = limpio(req.body.nombre, 40);
  if (nombre) await lista.update({ nombre });
  res.redirect(`/cuenta/listas/${lista.id_lista}`);
}
export async function borrarLista(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return res.sendStatus(404);
  await ListaItem.destroy({ where: { id_lista: lista.id_lista } }); await lista.destroy(); res.redirect("/cuenta/listas");
}
export async function quitarItem(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return res.sendStatus(404);
  await ListaItem.destroy({ where: { id_lista: lista.id_lista, tipo: req.body.tipo, id_ref: req.body.id_ref } });
  res.redirect(`/cuenta/listas/${lista.id_lista}`);
}

export async function crearPregunta(req, res) {
  const key = String(req.usuario.id);
  if (limitePreguntas.bloqueado(key)) return res.status(429).send("Alcanzaste el límite de preguntas por ahora.");
  const texto = limpio(req.body.texto, 500);
  const id_lte = req.body.id_lte ? Number(req.body.id_lte) : null;
  const id_cat = req.body.id_cat ? Number(req.body.id_cat) : null;
  if (!texto || Boolean(id_lte) === Boolean(id_cat)) return res.status(400).send("Escribe una pregunta y elige un lote o una especie.");
  const objeto = id_lte ? await Lote.findByPk(id_lte) : await EspecieCatalogo.findByPk(id_cat);
  if (!objeto) return res.sendStatus(404);
  limitePreguntas.fallo(key);
  await Pregunta.create({ id_usuario: req.usuario.id, id_lte, id_cat, texto });
  res.redirect(req.get("referer") || "/cuenta/preguntas");
}
export async function misPreguntas(req, res) {
  res.render("cuenta/preguntas", { preguntas: await Pregunta.findAll({ where: { id_usuario: req.usuario.id }, order: [["fecha", "DESC"]] }) });
}
export async function moderarPreguntas(req, res) {
  res.render("social/preguntas", { preguntas: await Pregunta.findAll({ include: [{ model: Usuario, as: "autor", attributes: ["nombre_completo"] }], order: [["estado", "ASC"], ["fecha", "ASC"]] }) });
}
export async function responderPregunta(req, res) {
  const pregunta = await Pregunta.findByPk(req.params.id, { include: [{ model: Usuario, as: "autor" }] });
  if (!pregunta) return res.sendStatus(404);
  const respuesta = limpio(req.body.respuesta, 500);
  if (req.body.estado === "oculta") await pregunta.update({ estado: "oculta" });
  else if (respuesta) {
    await pregunta.update({ respuesta, estado: "respondida", id_usuario_resp: req.usuario.id, fecha_resp: new Date() });
    if (pregunta.autor?.correo) await enviarEmailRespuestaPregunta({ usuario: pregunta.autor, respuesta, pregunta: pregunta.texto });
  }
  res.redirect("/preguntas");
}

export async function guardarOpinion(req, res) {
  const id_cat = Number(req.params.id);
  const estrellas = Number(req.body.estrellas);
  if (!(estrellas >= 1 && estrellas <= 5) || !Number.isInteger(estrellas)) return res.status(400).send("Elige de una a cinco estrellas.");
  let comprada = false;
  if (req.usuario.codigo_cpr) {
    const include = [{ model: Lote, as: "lote", required: true, include: [{ model: Especie, as: "especies", required: true, where: { id_cat } }] }];
    comprada = Boolean(await Compra.findOne({ where: { codigo_cpr: req.usuario.codigo_cpr, id_ped: null }, include }));
    if (!comprada) comprada = Boolean(await Compra.findOne({
      where: { codigo_cpr: req.usuario.codigo_cpr },
      include: [...include, { model: Pedido, as: "pedido", required: true, where: { estado: { [Op.in]: ["pagado", "preparando", "enviado", "entregado"] } } }],
    }));
  }
  if (!comprada) return res.status(403).send("Solo puedes opinar sobre especies que compraste.");
  const [opinion] = await Opinion.findOrCreate({ where: { id_usuario: req.usuario.id, id_cat }, defaults: { estrellas, titulo: limpio(req.body.titulo, 80), texto: limpio(req.body.texto, 1000), visible: true } });
  if (opinion.estrellas !== estrellas || opinion.titulo !== limpio(req.body.titulo, 80) || opinion.texto !== limpio(req.body.texto, 1000)) await opinion.update({ estrellas, titulo: limpio(req.body.titulo, 80), texto: limpio(req.body.texto, 1000), visible: true, fecha: new Date() });
  res.redirect(`/tienda/especie/${id_cat}`);
}
export async function moderarOpiniones(req, res) { res.render("social/opiniones", { opiniones: await Opinion.findAll({ include: [{ model: Usuario, as: "autor", attributes: ["nombre_completo"] }, { model: EspecieCatalogo, as: "especie" }], order: [["fecha", "DESC"]] }) }); }
export async function cambiarVisibilidadOpinion(req, res) { const opinion = await Opinion.findByPk(req.params.id); if (!opinion) return res.sendStatus(404); await opinion.update({ visible: req.body.visible === "true" }); res.redirect("/opiniones"); }

export async function ponerOpinionesEnFicha(id_cat) {
  const opiniones = await Opinion.findAll({ where: { id_cat, visible: true }, include: [{ model: Usuario, as: "autor", attributes: ["nombre_completo"] }], order: [["fecha", "DESC"]] });
  const distribucion = [1, 2, 3, 4, 5].map((n) => opiniones.filter((o) => o.estrellas === n).length);
  return { opiniones, resumenOpiniones: { total: opiniones.length, media: opiniones.length ? opiniones.reduce((s, o) => s + o.estrellas, 0) / opiniones.length : 0, distribucion } };
}

export async function preguntasPublicas(condicion) {
  return Pregunta.findAll({ where: { ...condicion, estado: "respondida" }, attributes: ["id_preg", "texto", "respuesta", "fecha", "fecha_resp"], order: [["fecha", "DESC"]] });
}
