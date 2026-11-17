import { EspecieCatalogo, Lote, Usuario, Pregunta } from '../../../models/index.js';
import { enviarEmailRespuestaPregunta } from '../../../compartido/ayudantes/email.js';

export async function registrarPregunta({ usuarioId, idLote, idEspecie, texto }) {
  const objeto = idLote ? await Lote.findByPk(idLote) : await EspecieCatalogo.findByPk(idEspecie);
  if (!objeto) return { ok: false, estado: 404, mensaje: 'No encontramos ese lote o especie.' };
  await Pregunta.create({ id_usuario: usuarioId, id_lte: idLote, id_cat: idEspecie, texto });
  return { ok: true };
}

export async function actualizarRespuestaPregunta({ preguntaId, estado, respuesta, usuarioId }) {
  const pregunta = await Pregunta.findByPk(preguntaId, { include: [{ model: Usuario, as: 'autor' }] });
  if (!pregunta) return false;
  if (estado === 'oculta') await pregunta.update({ estado: 'oculta' });
  else if (respuesta) {
    await pregunta.update({ respuesta, estado: 'respondida', id_usuario_resp: usuarioId, fecha_resp: new Date() });
    if (pregunta.autor?.correo)
      await enviarEmailRespuestaPregunta({ usuario: pregunta.autor, respuesta, pregunta: pregunta.texto });
  }
  return true;
}

export async function preguntasPublicas(condicion) {
  return Pregunta.findAll({
    where: { ...condicion, estado: 'respondida' },
    attributes: ['id_preg', 'texto', 'respuesta', 'fecha', 'fecha_resp'],
    order: [['fecha', 'DESC']],
  });
}
