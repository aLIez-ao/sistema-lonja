import { Usuario, Comprador } from '../../../models/index.js';
import { encolarTrabajo } from '../../../compartido/ayudantes/colaTrabajos.js';

export async function enviarAvisoMasivo({ asunto, titulo, mensaje, tipo, baseUrl }) {
  const usuarios = await Usuario.findAll({
    where: { rol: 'comprador', activo: true, email_verificado: true, recibir_avisos: true },
    include: [{ model: Comprador, as: 'comprador', required: true }],
  });
  if (!usuarios.length) return { ok: false, motivo: 'sin_suscriptores' };

  const encolado = await encolarTrabajo('aviso_masivo', {
    usuarioIds: usuarios.map((usuario) => usuario.id),
    asunto,
    titulo,
    mensaje,
    tipo,
    baseUrl,
    enviadosIds: [],
  });
  if (!encolado) return { ok: false, motivo: 'cola_llena' };
  return { ok: true, cantidad: usuarios.length };
}
