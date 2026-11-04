import { Op } from "sequelize";
import { Compra, Lote, Comprador, Especie, Tipo } from "../models/index.js";
import { hoy, fechaValida, rangoDelDia, formatoHora } from "../helpers/fechas.js";

/** Compras del día + totales generales y por comprador. */
async function datosReporte(fecha) {
  const { inicio, fin } = rangoDelDia(fecha);
  const compras = await Compra.findAll({
    where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } },
    order: [["fecha", "ASC"]],
    include: [
      { model: Comprador, as: "comprador" },
      { model: Lote, as: "lote", include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }] },
    ],
  });

  const filas = compras.map((c) => ({
    hora: formatoHora(c.fecha),
    lote: c.lote.id_lte,
    especies: c.lote.especies.map((e) => `${e.nombre} (${e.tipo.nombre})`).join(", ") || "—",
    comprador: `${c.comprador.nombre} ${c.comprador.apellido_paterno} ${c.comprador.apellido_materno ?? ""}`.trim(),
    codigo_cpr: c.comprador.codigo_cpr,
    cajas: c.lote.numero_cajas,
    kilos: Number(c.lote.kilos),
    precio_salida: Number(c.lote.precio_kilo_salida),
    precio_final: Number(c.precio_kilo_final),
    total: Number(c.precio_total),
  }));

  const porComprador = new Map();
  for (const f of filas) {
    const acc = porComprador.get(f.codigo_cpr) ?? { comprador: f.comprador, compras: 0, kilos: 0, total: 0 };
    acc.compras += 1;
    acc.kilos += f.kilos;
    acc.total += f.total;
    porComprador.set(f.codigo_cpr, acc);
  }

  const totales = filas.reduce(
    (t, f) => ({ compras: t.compras + 1, cajas: t.cajas + f.cajas, kilos: t.kilos + f.kilos, total: t.total + f.total }),
    { compras: 0, cajas: 0, kilos: 0, total: 0 },
  );

  return { filas, totales, resumen: [...porComprador.values()] };
}

const fechaDe = (req) => (fechaValida(req.query.fecha) ? req.query.fecha : hoy());

const diario = async (req, res) => {
  const fecha = fechaDe(req);
  res.render("reportes/diario", { fecha, ...(await datosReporte(fecha)) });
};

const csvCelda = (v) => `"${String(v).replaceAll('"', '""')}"`;

const diarioCsv = async (req, res) => {
  const fecha = fechaDe(req);
  const { filas, totales } = await datosReporte(fecha);
  const lineas = [["Hora", "Lote", "Especies", "Comprador", "Cajas", "Kilos", "Precio salida/kg", "Precio final/kg", "Total"].map(csvCelda).join(",")];
  for (const f of filas) lineas.push([f.hora, f.lote, f.especies, f.comprador, f.cajas, f.kilos, f.precio_salida, f.precio_final, f.total.toFixed(2)].map(csvCelda).join(","));
  lineas.push(["TOTAL", "", "", "", totales.cajas, totales.kilos, "", "", totales.total.toFixed(2)].map(csvCelda).join(","));
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="reporte-compras-${fecha}.csv"` });
  res.send("﻿" + lineas.join("\r\n")); // BOM para que Excel respete los acentos
};

export { diario, diarioCsv, datosReporte };
