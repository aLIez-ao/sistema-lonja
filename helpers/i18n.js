// Diccionarios de traducción Español / English
export const traducciones = {
  es: {
    app_nombre: "Sistema Lonja",
    inicio: "Inicio",
    compras: "Compras",
    lotes: "Lotes",
    especies: "Especies",
    compradores: "Compradores",
    tipos: "Tipos",
    reporte_diario: "Reporte diario",
    usuarios: "Usuarios",
    cerrar_sesion: "Cerrar sesión",
    configuracion: "Configuración",
    configuracion_rapida: "Configuración rápida",
    mi_cuenta: "Mi cuenta",
    resumen_del_dia: "Resumen del día",
    compras_hoy: "Compras de hoy",
    importe_hoy: "Importe de hoy",
    lotes_libres: "Lotes sin comprar",
    registrar_compra: "Registrar compra",
    registrar_lote: "Registrar lote",
    ver_reporte_diario: "Ver reporte diario",
    tema: "Tema visual",
    idioma: "Idioma",
    moneda: "Moneda",
    tamano_fuente: "Tamaño de fuente",
    tipo_fuente: "Tipo de fuente",
    guardar: "Guardar",
    cancelar: "Cancelar",
    editar: "Editar",
    eliminar: "Eliminar",
    acciones: "Acciones",
    detalles: "Detalles",
    descargar_pdf: "Descargar PDF",
    compartir: "Compartir",
    enviar_correo: "Enviar por correo",
    factura: "Factura",
    fecha: "Fecha",
    hora: "Hora",
    lote: "Lote",
    cajas: "Cajas",
    kilos: "Kilos",
    precio_salida: "Precio salida",
    precio_final: "Precio final",
    total: "Total",
    comprador: "Comprador",
    estado: "Estado",
    disponible: "Disponible",
    comprado: "Comprado",
    buscar: "Buscar...",
    cookies_banner_titulo: "Uso de cookies y personalización",
    cookies_banner_desc: "Utilizamos cookies para recordar tus preferencias de tema, moneda, idioma y mantener tu sesión segura.",
    cookies_aceptar: "Aceptar todas",
    cookies_esenciales: "Solo esenciales",
    cookies_personalizar: "Personalizar",
    correo_verificado: "Correo verificado",
    correo_no_verificado: "Correo no verificado",
    vincular_correo: "Vincular correo",
  },
  en: {
    app_nombre: "Fish Market System",
    inicio: "Home",
    compras: "Purchases",
    lotes: "Batches",
    especies: "Species",
    compradores: "Buyers",
    tipos: "Types",
    reporte_diario: "Daily Report",
    usuarios: "Users",
    cerrar_sesion: "Log out",
    configuracion: "Settings",
    configuracion_rapida: "Quick Settings",
    mi_cuenta: "My Account",
    resumen_del_dia: "Daily Overview",
    compras_hoy: "Today's Purchases",
    importe_hoy: "Today's Revenue",
    lotes_libres: "Unsold Batches",
    registrar_compra: "Record Purchase",
    registrar_lote: "Register Batch",
    ver_reporte_diario: "View Daily Report",
    tema: "Visual Theme",
    idioma: "Language",
    moneda: "Currency",
    tamano_fuente: "Font Size",
    tipo_fuente: "Font Family",
    guardar: "Save",
    cancelar: "Cancel",
    editar: "Edit",
    eliminar: "Delete",
    acciones: "Actions",
    detalles: "Details",
    descargar_pdf: "Download PDF",
    compartir: "Share",
    enviar_correo: "Send by Email",
    factura: "Invoice",
    fecha: "Date",
    hora: "Time",
    lote: "Batch",
    cajas: "Boxes",
    kilos: "Kilograms",
    precio_salida: "Starting Price",
    precio_final: "Final Price",
    total: "Total",
    comprador: "Buyer",
    estado: "Status",
    disponible: "Available",
    comprado: "Sold",
    buscar: "Search...",
    cookies_banner_titulo: "Cookie Policy & Preferences",
    cookies_banner_desc: "We use cookies to remember your theme, currency, language preferences, and keep your session secure.",
    cookies_aceptar: "Accept All",
    cookies_esenciales: "Essential Only",
    cookies_personalizar: "Customize",
    correo_verificado: "Email verified",
    correo_no_verificado: "Email not verified",
    vincular_correo: "Link Email",
  },
};

// Tasas de cambio fijas representativas para multi-moneda (Base: MXN)
const TASAS_CAMBIO = {
  MXN: 1,
  USD: 1 / 20.0,
  EUR: 1 / 21.5,
};

/**
 * Formateador de moneda multi-divisa (MXN, USD, EUR)
 */
export function formatearMoneda(montoEnMxn, codigoMoneda = "MXN") {
  const moneda = ["MXN", "USD", "EUR"].includes(codigoMoneda) ? codigoMoneda : "MXN";
  const tasa = TASAS_CAMBIO[moneda] || 1;
  const valorConvertido = (Number(montoEnMxn) || 0) * tasa;

  const locale = moneda === "USD" ? "en-US" : moneda === "EUR" ? "de-DE" : "es-MX";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valorConvertido);
}

/**
 * Helper de traducción
 */
export function t(clave, lang = "es") {
  const idioma = traducciones[lang] ? lang : "es";
  return traducciones[idioma][clave] || traducciones.es[clave] || clave;
}
