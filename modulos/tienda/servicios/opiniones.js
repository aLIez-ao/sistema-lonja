import { Op } from 'sequelize';
import { Compra, Especie, EspecieCatalogo, Lote, Opinion, Pedido, Pregunta, Usuario } from '../../../models/index.js';
import { ESTADO_PEDIDO } from '../../../models/Pedido.js';
import { nombrePublico } from '../../../compartido/ayudantes/tiendaVista.js';

const texto = (valor, max) =>
  String(valor ?? '')
    .trim()
    .slice(0, max);

export async function guardarOpinionComprada({ usuario, idCatalogo, estrellas, titulo, textoOpinion }) {
  const ficha = await EspecieCatalogo.findByPk(idCatalogo);
  if (!ficha) return { ok: false, estado: 404, mensaje: 'No encontramos esa especie.' };
  let comprada = false;
  if (usuario.codigo_cpr) {
    const include = [
      {
        model: Lote,
        as: 'lote',
        required: true,
        include: [{ model: Especie, as: 'especies', required: true, where: { id_cat: idCatalogo } }],
      },
    ];
    comprada = Boolean(await Compra.findOne({ where: { codigo_cpr: usuario.codigo_cpr, id_ped: null }, include }));
    if (!comprada)
      comprada = Boolean(
        await Compra.findOne({
          where: { codigo_cpr: usuario.codigo_cpr },
          include: [
            ...include,
            {
              model: Pedido,
              as: 'pedido',
              required: true,
              where: {
                estado: {
                  [Op.in]: [
                    ESTADO_PEDIDO.PAGADO,
                    ESTADO_PEDIDO.PREPARANDO,
                    ESTADO_PEDIDO.ENVIADO,
                    ESTADO_PEDIDO.ENTREGADO,
                  ],
                },
              },
            },
          ],
        }),
      );
  }
  if (!comprada) return { ok: false, estado: 403, mensaje: 'Solo puedes opinar sobre especies que compraste.' };
  const valores = { estrellas, titulo: texto(titulo, 80), texto: texto(textoOpinion, 1000) };
  const [opinion] = await Opinion.findOrCreate({
    where: { id_usuario: usuario.id, id_cat: idCatalogo },
    defaults: { ...valores, visible: true },
  });
  if (opinion.estrellas !== estrellas || opinion.titulo !== valores.titulo || opinion.texto !== valores.texto)
    await opinion.update({ ...valores, visible: true, fecha: new Date() });
  return { ok: true };
}

export async function opinionesDeFicha(idCatalogo, idUsuario = null) {
  const opiniones = await Opinion.findAll({
    where: { id_cat: idCatalogo, visible: true },
    include: [{ model: Usuario, as: 'autor', attributes: ['nombre_completo'] }],
    order: [['fecha', 'DESC']],
  });
  const opinionesPublicas = opiniones.map((opinion) => ({
    id_op: opinion.id_op,
    estrellas: opinion.estrellas,
    titulo: opinion.titulo,
    texto: opinion.texto,
    fecha: opinion.fecha,
    autorPublico: nombrePublico(opinion.autor?.nombre_completo),
  }));
  const distribucion = [1, 2, 3, 4, 5].map((n) => opiniones.filter((opinion) => opinion.estrellas === n).length);
  const opinionPropia = idUsuario
    ? await Opinion.findOne({ where: { id_cat: idCatalogo, id_usuario: idUsuario } })
    : null;
  return {
    opiniones: opinionesPublicas,
    opinionPropia,
    resumenOpiniones: {
      total: opiniones.length,
      media: opiniones.length ? opiniones.reduce((suma, opinion) => suma + opinion.estrellas, 0) / opiniones.length : 0,
      distribucion,
    },
  };
}

export async function preguntasPublicas(condicion) {
  return Pregunta.findAll({
    where: { ...condicion, estado: 'respondida' },
    attributes: ['id_preg', 'texto', 'respuesta', 'fecha', 'fecha_resp'],
    order: [['fecha', 'DESC']],
  });
}
