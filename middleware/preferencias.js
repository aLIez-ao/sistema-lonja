import { formatearMoneda, infoMoneda, t } from "../helpers/i18n.js";
import { CATEGORIAS, COOKIE_CONSENT, COOKIE_DE_PREF, leerConsentimiento } from "../helpers/cookies.js";

export const VALORES_PREF = {
  tema: ["ocean", "light", "dark"],
  idioma: ["es", "en"],
  moneda: ["MXN", "USD", "EUR"],
  tamanoFuente: ["sm", "md", "lg"],
  tipoFuente: ["sans", "roboto", "segoe", "serif"],
};

/** Devuelve el valor si es válido para esa preferencia; si no, undefined. */
export const prefValida = (clave, valor) => (VALORES_PREF[clave]?.includes(valor) ? valor : undefined);

/**
 * Resuelve las preferencias de la petición. Orden de prioridad:
 *   1. cookie del navegador (solo si su categoría fue aceptada)
 *   2. preferencias guardadas en la cuenta del usuario
 *   3. valor por defecto
 */
export function middlewarePreferencias(req, res, next) {
  const cookies = req.cookies || {};
  const consentimiento = leerConsentimiento(cookies[COOKIE_CONSENT]);

  let deCuenta = {};
  if (req.usuario?.preferencias) {
    try { deCuenta = JSON.parse(req.usuario.preferencias) || {}; } catch { /* preferencias corruptas: se ignoran */ }
  }

  const pref = {};
  for (const [clave, validos] of Object.entries(VALORES_PREF)) {
    const { cookie, categoria } = COOKIE_DE_PREF[clave];
    const deCookie = consentimiento.permite(categoria) ? prefValida(clave, cookies[cookie]) : undefined;
    pref[clave] = deCookie ?? prefValida(clave, deCuenta[clave]) ?? validos[0];
  }

  pref.cookiesRespondidas = consentimiento.respondido;
  pref.cookiesConsentidas = consentimiento.todas;
  pref.cookiesPermitidas = consentimiento.permitidas;
  pref.permiteCookies = consentimiento.permite;

  res.locals.pref = pref;
  res.locals.cookiesCatalogo = CATEGORIAS;
  res.locals.t = (clave) => t(clave, pref.idioma);
  res.locals.dinero = (monto) => formatearMoneda(monto, pref.moneda);
  res.locals.monedaInfo = infoMoneda(pref.moneda);
  // JSON seguro para incrustar en <script type="application/json">
  res.locals.jsonSeguro = (dato) => JSON.stringify(dato).replace(/</g, "\\u003c");
  req.pref = pref;

  next();
}
