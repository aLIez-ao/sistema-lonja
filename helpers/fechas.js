// Manejo de "el día" de la lonja en la zona horaria configurada (sin horario de verano en CDMX).
const tz = () => process.env.APP_TZ || "America/Mexico_City";
const offset = () => process.env.BD_TIMEZONE || "-06:00";

/** Fecha de hoy como YYYY-MM-DD en la zona horaria de la lonja. */
export const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());

export const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f ?? "") && !Number.isNaN(Date.parse(f));

/** Inicio (incluido) y fin (excluido) del día YYYY-MM-DD. */
export const rangoDelDia = (f) => {
  const inicio = new Date(`${f}T00:00:00${offset()}`);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio, fin };
};

export const formatoFechaHora = (d) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: tz(), dateStyle: "short", timeStyle: "short" }).format(new Date(d));

export const formatoHora = (d) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: tz(), timeStyle: "short" }).format(new Date(d));

export const dinero = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n) || 0);

export const redondea = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Año, mes (1-12) y día de una fecha en la zona horaria de la lonja. */
export const partesFecha = (d) => {
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date(d)).split("-").map(Number);
  return { anio, mes, dia };
};

/** Inicio (incluido) y fin (excluido) de un año en la zona horaria de la lonja. */
export const rangoDelAnio = (anio) => ({
  inicio: new Date(`${anio}-01-01T00:00:00${offset()}`),
  fin: new Date(`${Number(anio) + 1}-01-01T00:00:00${offset()}`),
});

export const formatoFecha = (d) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: tz(), day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));

export const NOMBRES_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
