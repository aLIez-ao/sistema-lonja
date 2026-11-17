import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import db from '../config/db.js';
import { Usuario, Comprador } from '../models/index.js';
import { enviarEmailPasswordCambiada, estadoCorreo, enviarCorreoPrueba } from '../helpers/email.js';
import {
  enviarVerificacionCorreo,
  limiteVerificacion,
  segundosEsperaVerificacion,
  urlBase,
} from '../helpers/cuentas.js';
import { prepararFoto } from '../helpers/avatar.js';
import { problemasPassword } from '../helpers/seguridad.js';
import { JWTGenera, opcionesCookieSesion } from '../helpers/tokens.js';
import { aMensaje, ErrorImagen } from '../helpers/utiles.js';
import { compradorDe, compradorPorCorreo } from '../helpers/comprador.js';
import { encolarTrabajo } from '../helpers/colaTrabajos.js';
import { registro } from '../helpers/registro.js';
import { prefValida } from '../middleware/preferencias.js';
import { CATEGORIAS, COOKIE_DE_PREF, aplicarConsentimiento, guardarCookiePreferencia } from '../helpers/cookies.js';
import { correoValido, telefonoValido } from '../helpers/validacion.js';

const renderConfiguracion = async (req, res, adicionales = {}) => {
  const us = await Usuario.findByPk(req.usuario.id);
  const totalCompradores = await Usuario.count({
    where: {
      rol: 'comprador',
      activo: true,
      email_verificado: true,
      recibir_avisos: true,
      codigo_cpr: { [Op.ne]: null },
    },
  });
  res.render('configuracion/index', {
    us,
    totalCompradores,
    estadoCorreo: estadoCorreo(),
    appUrl: urlBase(req),
    mensaje: req.query.mensaje,
    error: req.query.error,
    ...adicionales,
  });
};

export const verConfiguracion = (req, res) => renderConfiguracion(req, res);

/** Guarda en la cuenta (siempre) y en cookies (solo las categorías aceptadas). */
async function persistirPreferencias(req, res, cambios) {
  const validas = {};
  for (const [clave, valor] of Object.entries(cambios)) {
    const v = prefValida(clave, valor);
    if (v) validas[clave] = v;
  }
  for (const [clave, valor] of Object.entries(validas)) guardarCookiePreferencia(req, res, clave, valor);

  if (req.usuario && Object.keys(validas).length) {
    const us = await Usuario.findByPk(req.usuario.id);
    let prefs = {};
    try {
      prefs = JSON.parse(us.preferencias || '{}') || {};
    } catch {
      /* se reemplaza */
    }
    us.preferencias = JSON.stringify({ ...prefs, ...validas });
    await us.save();
  }
  return validas;
}

export const guardarPreferencias = async (req, res) => {
  const { tema, idioma, moneda, tamanoFuente, tipoFuente } = req.body;
  await persistirPreferencias(req, res, { tema, idioma, moneda, tamanoFuente, tipoFuente });
  res.redirect(`/configuracion?${aMensaje('Preferencias guardadas correctamente')}`);
};

export const guardarRapido = async (req, res) => {
  const { clave, valor } = req.body;
  const guardadas = await persistirPreferencias(req, res, { [clave]: valor });
  if (!Object.keys(guardadas).length) return res.status(400).json({ ok: false });
  return res.json({ ok: true });
};

/** Consentimiento de cookies: desde el banner (JSON) o desde Configuración (formulario). */
export const guardarCookies = async (req, res) => {
  let categorias = req.body.categorias ?? [];
  if (req.body.nivel === 'all') categorias = CATEGORIAS.map((c) => c.id);
  else if (req.body.nivel === 'essential') categorias = [];
  if (!Array.isArray(categorias)) categorias = [categorias];

  const consentimiento = aplicarConsentimiento(req, res, categorias);

  // Las preferencias actuales se copian a las cookies recién permitidas
  for (const [clave, { cookie, categoria }] of Object.entries(COOKIE_DE_PREF)) {
    if (consentimiento.permite(categoria) && req.pref?.[clave]) {
      res.cookie(cookie, req.pref[clave], { maxAge: 365 * 24 * 60 * 60 * 1000, path: '/', sameSite: 'lax' });
    }
  }

  if (req.is('json')) return res.json({ ok: true, permitidas: consentimiento.permitidas });
  res.redirect(`/configuracion?${aMensaje('Preferencias de cookies actualizadas')}#pane-cookies`);
};

const aError = (texto) => `error=${encodeURIComponent(texto)}`;

export const actualizarCuenta = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us) return res.redirect('/');
  const nombre = String(req.body.nombre_completo ?? '').trim();
  const correo = String(req.body.correo ?? '')
    .trim()
    .toLowerCase();
  const telefono = String(req.body.telefono ?? '').trim();

  if (!nombre || nombre.length > 80)
    return res.redirect(`/configuracion?${aError('El nombre es obligatorio (máximo 80 caracteres)')}#pane-cuenta`);
  if (!correoValido(correo) || correo.length > 80)
    return res.redirect(`/configuracion?${aError('Escribe un correo electrónico válido')}#pane-cuenta`);
  if (telefono && !telefonoValido(telefono))
    return res.redirect(`/configuracion?${aError('El teléfono no es válido')}#pane-cuenta`);

  let fotoPreparada = null;
  let transaccionConfirmada = false;
  try {
    const correoCambio = correo !== String(us.correo || '').toLowerCase();
    if (correoCambio && (await Usuario.findOne({ where: { correo } }))) {
      return res.redirect(`/configuracion?${aError('Ese correo ya está en uso por otro usuario')}#pane-cuenta`);
    }
    const comprador = await compradorDe(us);
    if (correoCambio && comprador) {
      const compradorExistente = await compradorPorCorreo(correo);
      if (compradorExistente && compradorExistente.codigo_cpr !== comprador.codigo_cpr) {
        return res.redirect(
          `/configuracion?${aError('Ese correo ya está asociado a otro cliente de la lonja')}#pane-cuenta`,
        );
      }
    }
    us.nombre_completo = nombre;
    us.telefono = telefono || null;
    if (correoCambio) {
      us.correo = correo;
      us.email_verificado = false; // un correo nuevo debe verificarse otra vez
      us.token_verificacion = null;
      us.token_verificacion_expira = null;
    }
    if (us.rol === 'comprador') us.recibir_avisos = req.body.recibir_avisos === 'on';
    fotoPreparada = await prepararFoto(us, { fotoData: req.body.foto_data, quitar: req.body.foto_quitar === 'on' });
    us.foto = fotoPreparada.foto;
    await db.transaction(async (transaction) => {
      await us.save({ transaction });
      if (correoCambio && comprador) await comprador.update({ correo }, { transaction });
    });
    transaccionConfirmada = true;
    try {
      await fotoPreparada.confirmar();
    } catch (error) {
      registro.warn('La cuenta se actualizó, pero no se pudo retirar la foto anterior:', error.message);
    }

    let aviso = 'Datos de la cuenta actualizados.';
    if (correoCambio) {
      const espera = segundosEsperaVerificacion(us);
      if (espera > 0) {
        aviso += ` Ya se envió un enlace de verificación hace poco; espera ${espera} s o reenvíalo desde Mi cuenta.`;
      } else {
        const envio = await enviarVerificacionCorreo(req, us);
        if (envio.ok) aviso += ` Te enviamos un enlace a ${correo} para verificarlo.`;
        else if (envio.simulado && process.env.NODE_ENV !== 'production') {
          return renderConfiguracion(req, res, {
            mensaje: aviso,
            enlaceVerificacion: envio.enlace,
            paneActiva: 'cuenta',
          });
        } else if (envio.simulado) aviso += ' No pudimos enviar el correo. Avisa al administrador.';
        else aviso += ' No pudimos enviar el correo; inténtalo más tarde.';
      }
    }
    res.redirect(`/configuracion?${aMensaje(aviso)}#pane-cuenta`);
  } catch (err) {
    if (!transaccionConfirmada) {
      try {
        await fotoPreparada?.revertir();
      } catch (error) {
        registro.warn('No se pudo limpiar la foto preparada:', error.message);
      }
    }
    registro.error('No se pudo actualizar la cuenta:', err);
    res.redirect(
      `/configuracion?${aError(err instanceof ErrorImagen ? err.message : 'No se pudieron guardar los datos. Revisa la información e inténtalo de nuevo.')}#pane-cuenta`,
    );
  }
};

export const solicitarVerificacionEmail = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us?.correo)
    return res.redirect(`/configuracion?${aError('Primero registra un correo en tu cuenta')}#pane-cuenta`);
  if (us.email_verificado)
    return res.redirect(`/configuracion?${aMensaje('Tu correo ya está verificado')}#pane-cuenta`);

  const espera = segundosEsperaVerificacion(us);
  if (espera > 0) {
    return res.redirect(`/configuracion?${aError(`Espera ${espera} segundos antes de pedir otro enlace`)}#pane-cuenta`);
  }
  const clave = `verificacion:${us.id}`;
  if (limiteVerificacion.bloqueado(clave)) {
    return res.status(429).render('error', {
      codigo: 429,
      mensaje: 'Se enviaron demasiados enlaces de verificación en la última hora. Inténtalo más tarde.',
    });
  }
  limiteVerificacion.fallo(clave);

  const envio = await enviarVerificacionCorreo(req, us);
  let aviso;
  if (envio.ok)
    aviso = `Se envió un enlace nuevo a ${us.correo}; los enlaces anteriores dejan de servir. Vence en 24 horas.`;
  else if (envio.simulado && process.env.NODE_ENV !== 'production') {
    return renderConfiguracion(req, res, {
      mensaje: `Modo desarrollo: correo no configurado para ${us.correo}.`,
      enlaceVerificacion: envio.enlace,
      paneActiva: 'cuenta',
    });
  } else if (envio.simulado) aviso = 'No pudimos enviar el correo. Avisa al administrador.';
  else aviso = 'No pudimos enviar el correo; inténtalo más tarde.';
  res.redirect(`/configuracion?${aMensaje(aviso)}#pane-cuenta`);
};

/** Envía un correo de prueba al propio administrador (pestaña Correo). */
export const probarCorreo = async (req, res) => {
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us?.correo) return res.redirect(`/configuracion?${aError('Tu cuenta no tiene correo registrado')}#pane-correo`);
  const resultado = await enviarCorreoPrueba({ para: us.correo, usuario: us });
  if (resultado.ok)
    return res.redirect(`/configuracion?${aMensaje(`Correo de prueba enviado a ${us.correo}`)}#pane-correo`);
  const detalle = resultado.simulado
    ? 'El correo está en modo simulador: configura GMAIL_USER y GMAIL_PASS en .env'
    : resultado.error || 'No se pudo enviar el correo de prueba';
  res.redirect(`/configuracion?${aError(detalle)}#pane-correo`);
};

export const cambiarPasswordCuenta = async (req, res) => {
  const { password_actual, password_nuevo, password_confirmar } = req.body;
  const us = await Usuario.findByPk(req.usuario.id);
  if (!us) return res.redirect('/');

  const errores = [];
  if (!(await bcrypt.compare(String(password_actual ?? ''), us.password)))
    errores.push('La contraseña actual es incorrecta');
  else {
    errores.push(...problemasPassword(password_nuevo, { usuario: us.usuario }));
    if (password_nuevo !== password_confirmar) errores.push('Las contraseñas nuevas no coinciden');
    if (!errores.length && password_nuevo === password_actual)
      errores.push('La contraseña nueva debe ser distinta de la actual');
  }
  if (errores.length) return res.redirect(`/configuracion?${aError(errores.join('. '))}#pane-seguridad`);

  us.password = password_nuevo; // invalida todas las sesiones anteriores (sesion_version)
  await us.save();
  // Esta sesión continúa con un token nuevo; las demás quedan cerradas
  res.cookie('_token', JWTGenera(us), opcionesCookieSesion());
  if (us.correo) enviarEmailPasswordCambiada({ usuario: us, correo: us.correo }).catch(() => {});

  res.redirect(
    `/configuracion?${aMensaje('Contraseña actualizada. Se cerraron las demás sesiones abiertas.')}#pane-seguridad`,
  );
};

export const enviarAvisoClientes = async (req, res) => {
  const asunto = String(req.body.asunto ?? '').trim();
  const titulo = String(req.body.titulo ?? '').trim();
  const mensaje = String(req.body.mensaje ?? '').trim();
  const tipo = String(req.body.tipo ?? 'evento');
  if (!asunto || asunto.length > 120 || /[\r\n]/.test(asunto))
    return res.redirect(
      `/configuracion?${aError('El asunto es obligatorio y admite hasta 120 caracteres.')}#pane-avisos`,
    );
  if (titulo.length > 120)
    return res.redirect(`/configuracion?${aError('El título admite hasta 120 caracteres.')}#pane-avisos`);
  if (!mensaje || mensaje.length > 4000)
    return res.redirect(
      `/configuracion?${aError('El mensaje es obligatorio y admite hasta 4000 caracteres.')}#pane-avisos`,
    );
  if (!['evento', 'politica', 'urgente'].includes(tipo))
    return res.redirect(`/configuracion?${aError('El tipo de aviso no es válido.')}#pane-avisos`);

  const usuarios = await Usuario.findAll({
    where: { rol: 'comprador', activo: true, email_verificado: true, recibir_avisos: true },
    include: [{ model: Comprador, as: 'comprador', required: true }],
  });
  const baseUrl = urlBase(req);
  if (!usuarios.length)
    return res.redirect(
      `/configuracion?${aMensaje('No hay compradores suscritos con correo verificado.')}#pane-avisos`,
    );
  const encolado = await encolarTrabajo('aviso_masivo', {
    usuarioIds: usuarios.map((usuario) => usuario.id),
    asunto,
    titulo,
    mensaje,
    tipo,
    baseUrl,
    enviadosIds: [],
  });
  if (!encolado)
    return res.redirect(
      `/configuracion?${aError('La cola de correo está llena. Inténtalo de nuevo más tarde.')}#pane-avisos`,
    );
  res.redirect(`/configuracion?${aMensaje(`Aviso en cola para ${usuarios.length} suscriptores.`)}#pane-avisos`);
};
