import { Op } from "sequelize";
import { Lista, ListaItem, Pregunta, Opinion, EspecieCatalogo, Especie, Lote, Compra, Pedido, Usuario } from "../models/index.js";
import { crearLimite } from "../helpers/seguridad.js";
import { enviarEmailRespuestaPregunta } from "../helpers/email.js";
import { errorDeSitio, rutaReferer, volverA } from "../helpers/navegacion.js";
import { nombrePublico } from "../helpers/tienda.js";

const limitePreguntas = crearLimite({ max: 5, ventanaMs: 60 * 60 * 1000 });
const limpio = (v, max) => String(v ?? "").trim().slice(0, max);

export function protegerAccionComprador(req, res, next) {
  if (req.usuario?.rol === "comprador") return next();
  let porDefecto = "/";
  if (req.path === "/tienda/preguntas") {
    if (req.body.id_lte) porDefecto = `/tienda/lote/${encodeURIComponent(req.body.id_lte)}#preguntas`;
    else if (req.body.id_cat) porDefecto = `/tienda/especie/${encodeURIComponent(req.body.id_cat)}#preguntas`;
  } else if (req.params.id) porDefecto = `/tienda/especie/${encodeURIComponent(req.params.id)}#opiniones`;
  const volver = rutaReferer(req, porDefecto);
  if (!req.usuario) return res.redirect(`/acceso?volver=${encodeURIComponent(volver)}`);
  return errorDeSitio(req, res, 403, "Esta acción es solo para compradores con cuenta.", volver);
}

export async function listas(req, res) {
  let favoritas = await Lista.findOne({ where: { id_usuario: req.usuario.id, nombre: "Favoritos" } });
  if (!favoritas) favoritas = await Lista.create({ id_usuario: req.usuario.id, nombre: "Favoritos" });
  res.render("cuenta/listas", { listas: await Lista.findAll({ where: { id_usuario: req.usuario.id }, order: [["nombre", "ASC"]] }) });
}
export async function crearLista(req, res) {
  const nombre = limpio(req.body.nombre, 40);
  if (!nombre) return volverA(req, res, "/cuenta/listas", { error: "Escribe un nombre para la lista." });
  try { await Lista.create({ id_usuario: req.usuario.id, nombre }); }
  catch { return volverA(req, res, "/cuenta/listas", { error: "Ya existe una lista con ese nombre." }); }
  return volverA(req, res, "/cuenta/listas", { mensaje: "Lista creada." });
}
export async function guardarFavorito(req, res) {
  const tipo = req.body.tipo === "especie" ? "especie" : "lote";
  const id_ref = Number(req.body.id_ref);
  if (!Number.isInteger(id_ref) || id_ref < 1) return volverA(req, res, "/", { error: "No se encontró el elemento para guardar." });
  const entidad = tipo === "lote" ? await Lote.findByPk(id_ref) : await EspecieCatalogo.findByPk(id_ref);
  if (!entidad) return errorDeSitio(req, res, 404, "No encontramos ese lote o especie.", "/cuenta/listas");
  const [lista] = await Lista.findOrCreate({ where: { id_usuario: req.usuario.id, nombre: "Favoritos" }, defaults: { fecha: new Date() } });
  await ListaItem.findOrCreate({ where: { id_lista: lista.id_lista, tipo, id_ref }, defaults: { fecha: new Date() } });
  return volverA(req, res, "/cuenta/listas", { mensaje: "Se guardó en Favoritos." });
}
export async function detalleLista(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return errorDeSitio(req, res, 404, "No encontramos esa lista.", "/cuenta/listas");
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
  if (!lista) return errorDeSitio(req, res, 404, "No encontramos esa lista.", "/cuenta/listas");
  if (!existe) return volverA(req, res, `/cuenta/listas/${lista.id_lista}`, { error: "No encontramos el lote o especie para agregar." });
  await ListaItem.findOrCreate({ where: { id_lista: lista.id_lista, tipo, id_ref }, defaults: { fecha: new Date() } });
  return volverA(req, res, `/cuenta/listas/${lista.id_lista}`, { mensaje: "Elemento agregado a la lista." });
}
export async function renombrarLista(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return errorDeSitio(req, res, 404, "No encontramos esa lista.", "/cuenta/listas");
  const nombre = limpio(req.body.nombre, 40);
  if (!nombre) return volverA(req, res, `/cuenta/listas/${lista.id_lista}`, { error: "El nombre no puede quedar vacío." });
  await lista.update({ nombre });
  return volverA(req, res, `/cuenta/listas/${lista.id_lista}`, { mensaje: "Lista actualizada." });
}
export async function borrarLista(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return errorDeSitio(req, res, 404, "No encontramos esa lista.", "/cuenta/listas");
  await ListaItem.destroy({ where: { id_lista: lista.id_lista } }); await lista.destroy();
  return volverA(req, res, "/cuenta/listas", { mensaje: "Lista eliminada." });
}
export async function quitarItem(req, res) {
  const lista = await Lista.findOne({ where: { id_lista: req.params.id, id_usuario: req.usuario.id } });
  if (!lista) return errorDeSitio(req, res, 404, "No encontramos esa lista.", "/cuenta/listas");
  await ListaItem.destroy({ where: { id_lista: lista.id_lista, tipo: req.body.tipo, id_ref: req.body.id_ref } });
  return volverA(req, res, `/cuenta/listas/${lista.id_lista}`, { mensaje: "Elemento eliminado de la lista." });
}

export async function crearPregunta(req, res) {
  const key = String(req.usuario.id);
  const destino = req.body.id_lte ? `/tienda/lote/${encodeURIComponent(req.body.id_lte)}#preguntas` : req.body.id_cat ? `/tienda/especie/${encodeURIComponent(req.body.id_cat)}#preguntas` : "/";
  if (limitePreguntas.bloqueado(key)) return errorDeSitio(req, res, 429, "Alcanzaste el límite de cinco preguntas por hora. Inténtalo más tarde.", destino);
  const texto = limpio(req.body.texto, 500);
  const id_lte = req.body.id_lte ? Number(req.body.id_lte) : null;
  const id_cat = req.body.id_cat ? Number(req.body.id_cat) : null;
  if (!texto || Boolean(id_lte) === Boolean(id_cat) || (id_lte && !Number.isInteger(id_lte)) || (id_cat && !Number.isInteger(id_cat))) return errorDeSitio(req, res, 400, "Escribe una pregunta y elige un lote o una especie.", destino);
  const objeto = id_lte ? await Lote.findByPk(id_lte) : await EspecieCatalogo.findByPk(id_cat);
  if (!objeto) return errorDeSitio(req, res, 404, "No encontramos ese lote o especie.", destino);
  limitePreguntas.fallo(key);
  await Pregunta.create({ id_usuario: req.usuario.id, id_lte, id_cat, texto });
  return volverA(req, res, destino, { mensaje: "Pregunta enviada. La publicaremos después de responderla." });
}
export async function misPreguntas(req, res) {
  res.render("cuenta/preguntas", { preguntas: await Pregunta.findAll({ where: { id_usuario: req.usuario.id }, order: [["fecha", "DESC"]] }) });
}
export async function moderarPreguntas(req, res) {
  res.render("social/preguntas", { preguntas: await Pregunta.findAll({ include: [{ model: Usuario, as: "autor", attributes: ["nombre_completo"] }], order: [["estado", "ASC"], ["fecha", "ASC"]] }) });
}
export async function responderPregunta(req, res) {
  const pregunta = await Pregunta.findByPk(req.params.id, { include: [{ model: Usuario, as: "autor" }] });
  if (!pregunta) return errorDeSitio(req, res, 404, "No encontramos esa pregunta.", "/preguntas");
  const respuesta = limpio(req.body.respuesta, 500);
  if (req.body.estado === "oculta") await pregunta.update({ estado: "oculta" });
  else if (respuesta) {
    await pregunta.update({ respuesta, estado: "respondida", id_usuario_resp: req.usuario.id, fecha_resp: new Date() });
    if (pregunta.autor?.correo) await enviarEmailRespuestaPregunta({ usuario: pregunta.autor, respuesta, pregunta: pregunta.texto });
  }
  return volverA(req, res, "/preguntas", { mensaje: "La pregunta se actualizó." });
}

export async function guardarOpinion(req, res) {
  const id_cat = Number(req.params.id);
  const estrellas = Number(req.body.estrellas);
  const destino = `/tienda/especie/${encodeURIComponent(id_cat)}#opiniones`;
  if (!Number.isInteger(id_cat) || id_cat < 1 || !(estrellas >= 1 && estrellas <= 5) || !Number.isInteger(estrellas)) return errorDeSitio(req, res, 400, "Elige una especie y una calificación de una a cinco estrellas.", "/");
  if (!await EspecieCatalogo.findByPk(id_cat)) return errorDeSitio(req, res, 404, "No encontramos esa especie.", "/");
  let comprada = false;
  if (req.usuario.codigo_cpr) {
    const include = [{ model: Lote, as: "lote", required: true, include: [{ model: Especie, as: "especies", required: true, where: { id_cat } }] }];
    comprada = Boolean(await Compra.findOne({ where: { codigo_cpr: req.usuario.codigo_cpr, id_ped: null }, include }));
    if (!comprada) comprada = Boolean(await Compra.findOne({
      where: { codigo_cpr: req.usuario.codigo_cpr },
      include: [...include, { model: Pedido, as: "pedido", required: true, where: { estado: { [Op.in]: ["pagado", "preparando", "enviado", "entregado"] } } }],
    }));
  }
  if (!comprada) return errorDeSitio(req, res, 403, "Solo puedes opinar sobre especies que compraste.", destino);
  const [opinion] = await Opinion.findOrCreate({ where: { id_usuario: req.usuario.id, id_cat }, defaults: { estrellas, titulo: limpio(req.body.titulo, 80), texto: limpio(req.body.texto, 1000), visible: true } });
  if (opinion.estrellas !== estrellas || opinion.titulo !== limpio(req.body.titulo, 80) || opinion.texto !== limpio(req.body.texto, 1000)) await opinion.update({ estrellas, titulo: limpio(req.body.titulo, 80), texto: limpio(req.body.texto, 1000), visible: true, fecha: new Date() });
  return volverA(req, res, destino, { mensaje: "Tu opinión se guardó correctamente." });
}
export async function misOpiniones(req, res) {
  const opiniones = await Opinion.findAll({
    where: { id_usuario: req.usuario.id },
    include: [{ model: EspecieCatalogo, as: "especie", attributes: ["id_cat", "nombre", "imagen"] }],
    order: [["fecha", "DESC"]],
  });
  const compras = req.usuario.codigo_cpr ? await Compra.findAll({
    where: { codigo_cpr: req.usuario.codigo_cpr },
    include: [
      { model: Lote, as: "lote", required: true, include: [{ model: Especie, as: "especies", required: true, where: { id_cat: { [Op.ne]: null } }, include: [{ model: EspecieCatalogo, as: "catalogo", attributes: ["id_cat", "nombre", "imagen"] }] }] },
      { model: Pedido, as: "pedido", required: false, attributes: ["id_ped", "estado"] },
    ],
    order: [["fecha", "DESC"]],
  }) : [];
  const estadosPagados = new Set(["pagado", "preparando", "enviado", "entregado"]);
  const yaOpino = new Set(opiniones.map((o) => Number(o.id_cat)));
  const pendientes = new Map();
  for (const compra of compras) {
    if (compra.id_ped && !estadosPagados.has(compra.pedido?.estado)) continue;
    for (const especie of compra.lote?.especies || []) {
      const ficha = especie.catalogo;
      if (ficha && !yaOpino.has(Number(ficha.id_cat))) pendientes.set(Number(ficha.id_cat), ficha);
    }
  }
  res.render("cuenta/opiniones", { opiniones, pendientes: [...pendientes.values()] });
}

export async function borrarMiOpinion(req, res) {
  const opinion = await Opinion.findOne({ where: { id_op: req.params.id, id_usuario: req.usuario.id } });
  if (!opinion) return errorDeSitio(req, res, 404, "No encontramos esa opinión en tu cuenta.", "/cuenta/opiniones");
  await opinion.destroy();
  return volverA(req, res, "/cuenta/opiniones", { mensaje: "Opinión eliminada." });
}
export async function moderarOpiniones(req, res) { res.render("social/opiniones", { opiniones: await Opinion.findAll({ include: [{ model: Usuario, as: "autor", attributes: ["nombre_completo"] }, { model: EspecieCatalogo, as: "especie" }], order: [["fecha", "DESC"]] }) }); }
export async function cambiarVisibilidadOpinion(req, res) {
  const opinion = await Opinion.findByPk(req.params.id);
  if (!opinion) return errorDeSitio(req, res, 404, "No encontramos esa opinión.", "/opiniones");
  await opinion.update({ visible: req.body.visible === "true" });
  return volverA(req, res, "/opiniones", { mensaje: "Visibilidad de opinión actualizada." });
}

export async function ponerOpinionesEnFicha(id_cat, id_usuario = null) {
  const opiniones = await Opinion.findAll({ where: { id_cat, visible: true }, include: [{ model: Usuario, as: "autor", attributes: ["nombre_completo"] }], order: [["fecha", "DESC"]] });
  const opinionesPublicas = opiniones.map((opinion) => ({
    id_op: opinion.id_op, estrellas: opinion.estrellas, titulo: opinion.titulo, texto: opinion.texto, fecha: opinion.fecha,
    autorPublico: nombrePublico(opinion.autor?.nombre_completo),
  }));
  const distribucion = [1, 2, 3, 4, 5].map((n) => opiniones.filter((o) => o.estrellas === n).length);
  const opinionPropia = id_usuario ? await Opinion.findOne({ where: { id_cat, id_usuario } }) : null;
  return { opiniones: opinionesPublicas, opinionPropia, resumenOpiniones: { total: opiniones.length, media: opiniones.length ? opiniones.reduce((s, o) => s + o.estrellas, 0) / opiniones.length : 0, distribucion } };
}

export async function preguntasPublicas(condicion) {
  return Pregunta.findAll({ where: { ...condicion, estado: "respondida" }, attributes: ["id_preg", "texto", "respuesta", "fecha", "fecha_resp"], order: [["fecha", "DESC"]] });
}
