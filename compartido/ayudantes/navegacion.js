// Navegación segura: evitar redirecciones abiertas y escoger el inicio por rol.
import { aError, aMensaje } from './utiles.js';

export const inicioSegun = (usuario) => (usuario?.rol === 'comprador' ? '/' : '/dashboard');

/** Solo rutas internas que empiecen con "/" y no con "//" ni "/\". */
export function rutaVolver(valor) {
  const ruta = String(valor ?? '');
  if (!ruta.startsWith('/') || /[\\\s\u0000-\u001f\u007f]/.test(ruta)) return null;
  try {
    const url = new URL(ruta, 'http://lonja.local');
    if (url.origin !== 'http://lonja.local') return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Destino tras iniciar sesión: la ruta pedida si es segura, o el inicio del rol. */
export const destinoTrasEntrar = (usuario, volver) => rutaVolver(volver) ?? inicioSegun(usuario);

/** Devuelve solo un path de la misma aplicación; un Referer remoto cae al destino conocido. */
export function rutaReferer(req, porDefecto = '/') {
  const defecto = rutaVolver(porDefecto) || '/';
  const referer = String(req.get?.('referer') || '').trim();
  if (!referer) return defecto;
  try {
    const origen = `${req.protocol || 'http'}://${req.get('host')}`;
    const url = new URL(referer, origen);
    if (url.origin !== new URL(origen).origin) return defecto;
    return rutaVolver(`${url.pathname}${url.search}${url.hash}`) || defecto;
  } catch {
    return rutaVolver(referer) || defecto;
  }
}

/** Valida que un método con efectos venga del mismo host y tenga origen explícito. */
export function origenDePeticionValido(req) {
  const appUrl = String(process.env.APP_URL || '').trim();
  const host = String(req.get?.('host') || '').toLowerCase();
  if (!host && !appUrl) return false;
  const fuentes = [req.get?.('origin'), req.get?.('referer')].filter(Boolean);
  if (!fuentes.length) return false;
  try {
    const origenEsperado = appUrl ? new URL(appUrl).origin.toLowerCase() : null;
    if (appUrl && !['http:', 'https:'].includes(new URL(appUrl).protocol)) return false;
    return fuentes.every((fuente) => {
      const url = new URL(fuente);
      if (!['http:', 'https:'].includes(url.protocol)) return false;
      return origenEsperado ? url.origin.toLowerCase() === origenEsperado : url.host.toLowerCase() === host;
    });
  } catch {
    return false;
  }
}

/** Redirige a una ruta interna y añade un aviso de éxito o error legible. */
export function volverA(req, res, porDefecto = '/', { mensaje, error } = {}) {
  const destino = rutaReferer(req, porDefecto);
  let url;
  try {
    url = new URL(destino, 'http://lonja.local');
  } catch {
    url = new URL('/', 'http://lonja.local');
  }
  for (const [clave, valor] of new URLSearchParams(mensaje ? aMensaje(mensaje) : error ? aError(error) : '')) {
    url.searchParams.set(clave, valor);
  }
  return res.redirect(`${url.pathname}${url.search}${url.hash}`);
}

/** Error en la plantilla común con acción de retorno siempre interna. */
export function errorDeSitio(req, res, codigo, mensaje, porDefecto = '/') {
  return res.status(codigo).render('error', {
    codigo,
    mensaje,
    accion: { texto: 'Volver', url: rutaReferer(req, porDefecto) },
  });
}
