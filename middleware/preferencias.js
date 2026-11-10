import { formatearMoneda, t } from "../helpers/i18n.js";

export function middlewarePreferencias(req, res, next) {
  // 1. Leer preferencias desde cookies
  const cookies = req.cookies || {};

  let tema = cookies.lonja_theme || "ocean";
  let idioma = cookies.lonja_lang || "es";
  let moneda = cookies.lonja_currency || "MXN";
  let tamanoFuente = cookies.lonja_font_size || "md";
  let tipoFuente = cookies.lonja_font_family || "sans";
  const cookiesConsent = cookies.lonja_cookies_consent;

  // 2. Si el usuario está autenticado y tiene preferencias en BD, sincronizarlas si la cookie no estaba definida
  if (req.usuario && req.usuario.preferencias) {
    try {
      const prefsBD = JSON.parse(req.usuario.preferencias);
      if (!cookies.lonja_theme && prefsBD.tema) tema = prefsBD.tema;
      if (!cookies.lonja_lang && prefsBD.idioma) idioma = prefsBD.idioma;
      if (!cookies.lonja_currency && prefsBD.moneda) moneda = prefsBD.moneda;
      if (!cookies.lonja_font_size && prefsBD.tamanoFuente) tamanoFuente = prefsBD.tamanoFuente;
      if (!cookies.lonja_font_family && prefsBD.tipoFuente) tipoFuente = prefsBD.tipoFuente;
    } catch {
      // Ignorar error de parseo
    }
  }

  // Validaciones
  if (!["ocean", "light", "dark"].includes(tema)) tema = "ocean";
  if (!["es", "en"].includes(idioma)) idioma = "es";
  if (!["MXN", "USD", "EUR"].includes(moneda)) moneda = "MXN";
  if (!["sm", "md", "lg"].includes(tamanoFuente)) tamanoFuente = "md";
  if (!["sans", "roboto", "segoe", "serif"].includes(tipoFuente)) tipoFuente = "sans";

  const preferencias = {
    tema,
    idioma,
    moneda,
    tamanoFuente,
    tipoFuente,
    cookiesConsentidas: cookiesConsent === "all" || cookiesConsent === "true",
    cookiesRespondidas: typeof cookiesConsent !== "undefined",
    consentNivel: cookiesConsent || "none",
  };

  res.locals.pref = preferencias;
  res.locals.t = (clave) => t(clave, idioma);
  res.locals.dinero = (monto) => formatearMoneda(monto, moneda);

  next();
}
