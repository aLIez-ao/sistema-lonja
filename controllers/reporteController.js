import { Op } from "sequelize";
import { Compra, Lote, Comprador, Especie, Tipo } from "../models/index.js";
import { hoy, fechaValida, rangoDelDia, rangoDelAnio, partesFecha, formatoHora, formatoFecha, redondea, NOMBRES_MESES } from "../helpers/fechas.js";
import { generarReporteAnualPDF } from "../helpers/reportePdf.js";

const incluye = [
  { model: Comprador, as: "comprador" },
  { model: Lote, as: "lote", include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }] },
];

const aFila = (c) => ({
  id_cmp: c.id_cmp,
  fecha: formatoFecha(c.fecha),
  hora: formatoHora(c.fecha),
  marca: new Date(c.fecha).getTime(),
  lote: c.lote.id_lte,
  especies: c.lote.especies.map((e) => `${e.nombre} (${e.tipo.nombre})`).join(", ") || "—",
  nombresEspecies: c.lote.especies.map((e) => e.nombre),
  comprador: `${c.comprador.nombre} ${c.comprador.apellido_paterno} ${c.comprador.apellido_materno ?? ""}`.trim(),
  codigo_cpr: c.comprador.codigo_cpr,
  cajas: c.lote.numero_cajas,
  kilos: Number(c.lote.kilos),
  precio_salida: Number(c.lote.precio_kilo_salida),
  precio_final: Number(c.precio_kilo_final),
  total: Number(c.precio_total),
});

const sumar = (filas) => {
  const t = filas.reduce(
    (a, f) => ({ compras: a.compras + 1, cajas: a.cajas + f.cajas, kilos: a.kilos + f.kilos, total: a.total + f.total }),
    { compras: 0, cajas: 0, kilos: 0, total: 0 },
  );
  return { ...t, kilos: redondea(t.kilos), total: redondea(t.total), precioPromedio: t.kilos ? redondea(t.total / t.kilos) : 0 };
};

/** Agrupa por una llave y devuelve el ranking por importe. */
const ranking = (filas, llaves, limite = 5, orden = "total") => {
  const mapa = new Map();
  for (const f of filas) {
    for (const [llave, nombre] of llaves(f)) {
      const acc = mapa.get(llave) ?? { nombre, compras: 0, kilos: 0, total: 0 };
      acc.compras += 1;
      acc.kilos += f.kilos;
      acc.total += f.total;
      mapa.set(llave, acc);
    }
  }
  return [...mapa.values()]
    .map((r) => ({ ...r, kilos: redondea(r.kilos), total: redondea(r.total) }))
    .sort((a, b) => b[orden] - a[orden])
    .slice(0, limite);
};

/** Compras de un día (se conserva para el CSV diario). */
async function datosReporte(fecha) {
  const { inicio, fin } = rangoDelDia(fecha);
  const compras = await Compra.findAll({ where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } }, order: [["fecha", "ASC"]], include: incluye });
  const filas = compras.map(aFila);
  return { filas, totales: sumar(filas), resumen: ranking(filas, (f) => [[f.codigo_cpr, f.comprador]], Infinity).map((r) => ({ ...r, comprador: r.nombre })) };
}

/** Años que tienen compras (más el actual), del más reciente al más antiguo. */
async function aniosConCompras() {
  const actual = partesFecha(new Date()).anio;
  const [primera, ultima] = await Promise.all([Compra.min("fecha"), Compra.max("fecha")]);
  if (!primera) return [actual];
  const desde = Math.min(partesFecha(primera).anio, actual);
  const hasta = Math.max(partesFecha(ultima).anio, actual);
  const anios = [];
  for (let a = hasta; a >= desde; a--) anios.push(a);
  return anios;
}

/** Reporte de un año: totales, desglose por mes con sus compras y rankings. */
async function datosReporteAnual(anioPedido) {
  const aniosDisponibles = await aniosConCompras();
  const anio = aniosDisponibles.includes(Number(anioPedido)) ? Number(anioPedido) : aniosDisponibles[0];
  const { inicio, fin } = rangoDelAnio(anio);

  const compras = await Compra.findAll({ where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } }, order: [["fecha", "ASC"]], include: incluye });
  const filas = compras.map(aFila);

  const meses = NOMBRES_MESES.map((nombreMes, i) => {
    const delMes = filas.filter((f) => partesFecha(f.marca).mes === i + 1);
    return { numeroMes: i + 1, nombreMes, filas: delMes, ...sumar(delMes) };
  });

  const totalesAnio = sumar(filas);
  const mesesConCompras = meses.filter((m) => m.compras > 0);
  const mejorMes = mesesConCompras.length ? mesesConCompras.reduce((a, b) => (b.total > a.total ? b : a)) : null;

  return {
    anio,
    aniosDisponibles,
    meses,
    totalesAnio,
    mejorMes,
    topCompradores: ranking(filas, (f) => [[f.codigo_cpr, f.comprador]]),
    topEspecies: ranking(filas, (f) => [...new Set(f.nombresEspecies)].map((n) => [n, n]), 5, "kilos"),
  };
}

/** Pantalla: selector de año, tablero y compras por mes (cada una enlaza a su factura). */
const anual = async (req, res) => {
  const datos = await datosReporteAnual(req.query.anio);
  res.render("reportes/anual", {
    ...datos,
    graficas: {
      meses: datos.meses.map((m) => m.nombreMes.slice(0, 3)),
      importes: datos.meses.map((m) => m.total),
      kilos: datos.meses.map((m) => m.kilos),
      compradores: datos.topCompradores.map((c) => ({ nombre: c.nombre, total: c.total })),
      especies: datos.topEspecies.map((e) => ({ nombre: e.nombre, kilos: e.kilos })),
    },
  });
};

/** Documento oficial en PDF del ejercicio. */
const anualPdf = async (req, res) => {
  const datos = await datosReporteAnual(req.query.anio);
  try {
    const pdf = await generarReporteAnualPDF({ ...datos, emitidoPor: req.usuario?.nombre_completo || req.usuario?.usuario });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Reporte-Anual-Lonja-${datos.anio}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    console.error("Error al generar PDF de reporte anual:", err);
    res.status(500).render("error", { codigo: 500, mensaje: "No se pudo generar el reporte en PDF." });
  }
};

const csvCelda = (v) => `"${String(v).replaceAll('"', '""')}"`;
const enviarCsv = (res, nombre, lineas) => {
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre}"` });
  res.send("﻿" + lineas.map((l) => l.map(csvCelda).join(",")).join("\r\n"));
};
const ENCABEZADO = ["Hora", "Lote", "Especies", "Comprador", "Cajas", "Kilos", "Precio salida/kg", "Precio final/kg", "Total"];
const celdas = (f) => [f.hora, f.lote, f.especies, f.comprador, f.cajas, f.kilos, f.precio_salida, f.precio_final, f.total.toFixed(2)];

/** CSV: con ?anio= el detalle del año; con ?fecha= (o sin parámetros) el del día. */
const reporteCsv = async (req, res) => {
  if (req.query.anio) {
    const { anio, meses, totalesAnio } = await datosReporteAnual(req.query.anio);
    const lineas = [["Mes", "Fecha", ...ENCABEZADO]];
    for (const m of meses) for (const f of m.filas) lineas.push([m.nombreMes, f.fecha, ...celdas(f)]);
    lineas.push(["TOTAL", "", "", "", "", "", totalesAnio.cajas, totalesAnio.kilos, "", "", totalesAnio.total.toFixed(2)]);
    return enviarCsv(res, `reporte-compras-${anio}.csv`, lineas);
  }
  const fecha = fechaValida(req.query.fecha) ? req.query.fecha : hoy();
  const { filas, totales } = await datosReporte(fecha);
  enviarCsv(res, `reporte-compras-${fecha}.csv`, [ENCABEZADO, ...filas.map(celdas), ["TOTAL", "", "", "", totales.cajas, totales.kilos, "", "", totales.total.toFixed(2)]]);
};

export { anual, anualPdf, reporteCsv, datosReporte, datosReporteAnual };
