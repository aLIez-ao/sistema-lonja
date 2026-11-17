import { Usuario } from '../../../models/index.js';
import { idUsuarioDeTokenBajaAvisos } from '../../../compartido/ayudantes/tokens.js';

const resolverUsuario = async (token) => {
  const id = idUsuarioDeTokenBajaAvisos(token);
  return id ? Usuario.findOne({ where: { id, rol: 'comprador' } }) : null;
};

export async function confirmarBajaAvisos(req, res) {
  if (!(await resolverUsuario(req.params.token))) {
    return res.status(400).render('error', {
      codigo: 400,
      mensaje: 'El enlace de baja no es válido o ya caducó.',
      accion: { texto: 'Ir a la tienda', url: '/' },
    });
  }
  return res.render('avisos/baja', { token: req.params.token });
}

export async function bajaAvisos(req, res) {
  const usuario = await resolverUsuario(req.params.token);
  if (!usuario) {
    return res.status(400).render('error', {
      codigo: 400,
      mensaje: 'El enlace de baja no es válido o ya caducó.',
      accion: { texto: 'Ir a la tienda', url: '/' },
    });
  }
  await usuario.update({ recibir_avisos: false });
  return res.render('error', {
    codigo: 200,
    mensaje: 'Listo. Ya no recibirás avisos de subastas y novedades por correo.',
    accion: { texto: 'Ir a la tienda', url: '/' },
  });
}

export async function descartarAvisoSuscripcion(req, res) {
  await req.usuario.update({ aviso_suscripcion_descartado: true });
  return res.json({ ok: true });
}
