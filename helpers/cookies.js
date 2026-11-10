// Catálogo de cookies del sistema y reglas de consentimiento.
// El consentimiento se guarda en la cookie lonja_cookies_consent con uno de estos valores:
//   "all"                      -> todas las categorías
//   "essential"                -> solo las esenciales
//   "custom:cat1,cat2"         -> esenciales + las categorías indicadas
export const COOKIE_CONSENT = "lonja_cookies_consent";
const UN_ANIO = 365 * 24 * 60 * 60 * 1000;

export const CATEGORIAS = [
  {
    id: "esenciales",
    nombre: "Esenciales",
    obligatoria: true,
    descripcion: "Necesarias para iniciar sesión y recordar esta decisión. No se pueden desactivar.",
    cookies: [
      { nombre: "_token", proposito: "Mantiene tu sesión iniciada (JWT firmado, HttpOnly, SameSite=Strict).", duracion: "Lo que dura la sesión (8 h)" },
      { nombre: COOKIE_CONSENT, proposito: "Recuerda qué categorías de cookies aceptaste para no volver a preguntar.", duracion: "1 año" },
    ],
  },
  {
    id: "personalizacion",
    nombre: "Personalización",
    descripcion: "Recuerdan el aspecto e idioma en este navegador aunque no hayas iniciado sesión.",
    siDesactivas: "El tema y el idioma se toman de tu cuenta al iniciar sesión; la pantalla de acceso usa los valores por defecto.",
    cookies: [
      { nombre: "lonja_theme", pref: "tema", proposito: "Tema visual elegido (Océano, Claro u Oscuro).", duracion: "1 año" },
      { nombre: "lonja_lang", pref: "idioma", proposito: "Idioma de la interfaz (Español o English).", duracion: "1 año" },
    ],
  },
  {
    id: "funcionales",
    nombre: "Funcionales",
    descripcion: "Guardan opciones de trabajo para mostrar los importes como prefieres.",
    siDesactivas: "La moneda se toma de tu cuenta; sin sesión se muestra en pesos mexicanos.",
    cookies: [{ nombre: "lonja_currency", pref: "moneda", proposito: "Moneda en la que se muestran los precios (MXN, USD, EUR).", duracion: "1 año" }],
  },
  {
    id: "accesibilidad",
    nombre: "Accesibilidad",
    descripcion: "Conservan el tamaño y tipo de letra que te resultan más cómodos.",
    siDesactivas: "El tamaño y tipo de letra se toman de tu cuenta al iniciar sesión.",
    cookies: [
      { nombre: "lonja_font_size", pref: "tamanoFuente", proposito: "Tamaño del texto (pequeño, normal, grande).", duracion: "1 año" },
      { nombre: "lonja_font_family", pref: "tipoFuente", proposito: "Tipografía de la interfaz.", duracion: "1 año" },
    ],
  },
];

const OPCIONALES = CATEGORIAS.filter((c) => !c.obligatoria).map((c) => c.id);

/** Preferencia -> { cookie, categoria } */
export const COOKIE_DE_PREF = Object.fromEntries(
  CATEGORIAS.flatMap((cat) => cat.cookies.filter((c) => c.pref).map((c) => [c.pref, { cookie: c.nombre, categoria: cat.id }])),
);

/** Interpreta el valor de la cookie de consentimiento. */
export function leerConsentimiento(valor) {
  let permitidas = [];
  const respondido = typeof valor === "string" && valor.length > 0;
  if (valor === "all" || valor === "true") permitidas = [...OPCIONALES];
  else if (respondido && valor.startsWith("custom:")) {
    permitidas = valor.slice(7).split(",").filter((c) => OPCIONALES.includes(c));
  }
  return {
    respondido,
    permitidas,
    todas: permitidas.length === OPCIONALES.length,
    permite: (categoria) => categoria === "esenciales" || permitidas.includes(categoria),
  };
}

/** Normaliza una selección (array de ids de categoría) al valor que se guarda en la cookie. */
export function valorConsentimiento(categorias = []) {
  const validas = OPCIONALES.filter((c) => categorias.includes(c));
  if (validas.length === OPCIONALES.length) return "all";
  if (validas.length === 0) return "essential";
  return `custom:${validas.join(",")}`;
}

const opciones = () => ({ maxAge: UN_ANIO, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });

/** Guarda la decisión y borra de inmediato las cookies de las categorías rechazadas. */
export function aplicarConsentimiento(req, res, categorias) {
  const valor = valorConsentimiento(categorias);
  res.cookie(COOKIE_CONSENT, valor, opciones());
  const consentimiento = leerConsentimiento(valor);
  for (const { cookie, categoria } of Object.values(COOKIE_DE_PREF)) {
    if (!consentimiento.permite(categoria)) res.clearCookie(cookie, { path: "/" });
  }
  res.clearCookie("lonja_last_report_date", { path: "/" }); // cookie retirada del sistema
  return consentimiento;
}

/** Escribe la cookie de una preferencia solo si su categoría fue aceptada. Devuelve si se escribió. */
export function guardarCookiePreferencia(req, res, pref, valor) {
  const def = COOKIE_DE_PREF[pref];
  if (!def) return false;
  const consentimiento = leerConsentimiento(req.cookies?.[COOKIE_CONSENT]);
  if (!consentimiento.permite(def.categoria)) {
    if (req.cookies?.[def.cookie]) res.clearCookie(def.cookie, { path: "/" });
    return false;
  }
  res.cookie(def.cookie, valor, opciones());
  return true;
}
