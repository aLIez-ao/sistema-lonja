import crypto from "crypto";
import PDFDocument from "pdfkit";
import { dinero, formatoFechaHora } from "./fechas.js";
import { COLOR, EMISOR, dibujarLogo, numerarPaginas } from "./pdfComun.js";

const X = 40;
const W = 532;
const FONDO_PIE = 62; // espacio reservado al pie de cada página

const num = (n, dec = 0) => Number(n).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Tabla con encabezado azul, filas alternadas y salto de página automático (repite el encabezado). */
function tabla(doc, { x = X, y, columnas, filas, pie, altoFila = 17 }) {
  const ancho = columnas.reduce((s, c) => s + c.ancho, 0);
  const encabezado = (yy) => {
    doc.rect(x, yy, ancho, 19).fill(COLOR.marino);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLOR.blanco);
    let cx = x;
    for (const c of columnas) {
      doc.text(c.titulo, cx + 6, yy + 6.5, { width: c.ancho - 12, align: c.der ? "right" : "left", lineBreak: false });
      cx += c.ancho;
    }
    return yy + 19;
  };
  const fila = (yy, valores, { fondo, negrita } = {}) => {
    doc.rect(x, yy, ancho, altoFila).fill(fondo);
    doc.rect(x, yy + altoFila - 0.5, ancho, 0.5).fill(COLOR.borde);
    let cx = x;
    columnas.forEach((c, i) => {
      doc.font(negrita || c.negrita ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(negrita || c.negrita ? COLOR.marino : COLOR.texto)
        .text(String(valores[i] ?? ""), cx + 6, yy + 5.5, { width: c.ancho - 12, height: 9, align: c.der ? "right" : "left", ellipsis: true });
      cx += c.ancho;
    });
    return yy + altoFila;
  };

  y = encabezado(y);
  filas.forEach((valores, i) => {
    if (y + altoFila > doc.page.height - FONDO_PIE) {
      doc.addPage();
      y = encabezado(X + 6);
    }
    y = fila(y, valores, { fondo: i % 2 ? COLOR.fondo : COLOR.blanco });
  });
  if (pie) y = fila(y, pie, { fondo: "#E2E8F0", negrita: true });
  return y;
}

const tituloSeccion = (doc, texto, y) => {
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLOR.marino).text(texto, X, y, { characterSpacing: 0.3 });
  doc.rect(X, y + 13, W, 0.75).fill(COLOR.teal);
  return y + 20;
};

/**
 * Reporte oficial del ejercicio: carátula con indicadores, resumen mensual,
 * principales compradores y especies, detalle de compras por mes y firmas.
 */
export async function generarReporteAnualPDF({ anio, totalesAnio, meses, topCompradores = [], topEspecies = [], emitidoPor }) {
  return new Promise((resolve, reject) => {
    try {
      const folio = `REP-${anio}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
      const doc = new PDFDocument({
        margin: 40,
        size: "LETTER",
        bufferPages: true,
        info: { Title: `Reporte anual de compras ${anio} - Lonja de Veracruz`, Author: EMISOR.nombre, Subject: `Informe consolidado de subastas y compras, ejercicio ${anio}` },
      });
      const buffers = [];
      doc.on("data", (c) => buffers.push(c));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // --- Encabezado institucional ---
      doc.rect(X, 40, W, 6).fill(COLOR.marino);
      dibujarLogo(doc, X, 56, 46);
      doc.fillColor(COLOR.teal).font("Helvetica-Bold").fontSize(9).text("CONTROL DE OPERACIONES Y ESTADÍSTICA PESQUERA", X, 110, { lineBreak: false });
      doc.fillColor(COLOR.texto).font("Helvetica").fontSize(7.5)
        .text(`RFC: ${EMISOR.rfc}  ·  ${EMISOR.direccion}`, X, 123, { lineBreak: false })
        .text(EMISOR.contacto, X, 133, { lineBreak: false });

      doc.save();
      doc.roundedRect(380, 56, 192, 64, 6).clip();
      doc.rect(380, 56, 192, 22).fill(COLOR.marino);
      doc.restore();
      doc.roundedRect(380, 56, 192, 64, 6).lineWidth(0.75).strokeColor(COLOR.borde).stroke();
      doc.fillColor(COLOR.blanco).font("Helvetica-Bold").fontSize(10).text(`EJERCICIO ${anio}`, 380, 63, { width: 192, align: "center", characterSpacing: 0.6 });
      doc.fillColor(COLOR.tenue).font("Helvetica-Bold").fontSize(8).text("FOLIO:", 392, 86, { lineBreak: false });
      doc.fillColor(COLOR.marino).text(folio, 392, 86, { width: 168, align: "right" });
      doc.rect(392, 98.5, 168, 0.5).fill(COLOR.borde);
      doc.fillColor(COLOR.tenue).text("EMISIÓN:", 392, 104, { lineBreak: false });
      doc.fillColor(COLOR.texto).font("Helvetica").text(formatoFechaHora(new Date()), 392, 104, { width: 168, align: "right" });

      // --- Título del documento ---
      doc.font("Helvetica-Bold").fontSize(14).fillColor(COLOR.marino).text("INFORME ANUAL DE SUBASTAS Y COMPRAS", X, 160, { width: W, align: "center" });
      doc.font("Helvetica").fontSize(9).fillColor(COLOR.tenue)
        .text(`Periodo del 1 de enero al 31 de diciembre de ${anio}  ·  Importes en pesos mexicanos (MXN)`, X, 178, { width: W, align: "center" });

      // --- Indicadores ---
      const indicadores = [
        ["COMPRAS", num(totalesAnio.compras)],
        ["CAJAS SUBASTADAS", num(totalesAnio.cajas)],
        ["VOLUMEN (KG)", num(totalesAnio.kilos, 2)],
        ["PRECIO MEDIO / KG", dinero(totalesAnio.precioPromedio)],
        ["IMPORTE TOTAL", dinero(totalesAnio.total)],
      ];
      const anchos = [98, 92, 100, 100, 126];
      let ix = X;
      indicadores.forEach(([rotulo, valor], i) => {
        const a = anchos[i] - 4;
        doc.roundedRect(ix, 200, a, 44, 5).lineWidth(0.75).fillAndStroke(COLOR.fondo, COLOR.borde);
        doc.font("Helvetica-Bold").fontSize(6.5).fillColor(COLOR.tenue).text(rotulo, ix + 8, 208, { width: a - 16, lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(i === 4 ? 12.5 : 12).fillColor(COLOR.marino).text(valor, ix + 8, 221, { width: a - 16, lineBreak: false });
        ix += anchos[i];
      });

      // --- 1. Resumen mensual ---
      let y = tituloSeccion(doc, "1. RESUMEN MENSUAL", 262);
      y = tabla(doc, {
        y,
        columnas: [
          { titulo: "MES", ancho: 132 },
          { titulo: "COMPRAS", ancho: 70, der: true },
          { titulo: "CAJAS", ancho: 70, der: true },
          { titulo: "KILOS", ancho: 85, der: true },
          { titulo: "PRECIO MEDIO/KG", ancho: 85, der: true },
          { titulo: "IMPORTE", ancho: 90, der: true, negrita: true },
        ],
        filas: meses.map((m) => [m.nombreMes, num(m.compras), num(m.cajas), num(m.kilos, 2), m.compras ? dinero(m.precioPromedio) : "—", dinero(m.total)]),
        pie: [`TOTAL ${anio}`, num(totalesAnio.compras), num(totalesAnio.cajas), num(totalesAnio.kilos, 2), dinero(totalesAnio.precioPromedio), dinero(totalesAnio.total)],
      });

      // --- 2. Principales compradores y especies ---
      y = tituloSeccion(doc, "2. PRINCIPALES COMPRADORES Y ESPECIES", y + 18);
      const yFin1 = tabla(doc, {
        x: X, y,
        columnas: [{ titulo: "COMPRADOR", ancho: 122 }, { titulo: "COMPRAS", ancho: 58, der: true }, { titulo: "IMPORTE", ancho: 80, der: true, negrita: true }],
        filas: topCompradores.length ? topCompradores.map((c) => [c.nombre, num(c.compras), dinero(c.total)]) : [["Sin compras en el periodo", "", ""]],
      });
      const yFin2 = tabla(doc, {
        x: X + 272, y,
        columnas: [{ titulo: "ESPECIE", ancho: 120 }, { titulo: "LOTES", ancho: 50, der: true }, { titulo: "KILOS", ancho: 90, der: true, negrita: true }],
        filas: topEspecies.length ? topEspecies.map((e) => [e.nombre, num(e.compras), num(e.kilos, 2)]) : [["Sin compras en el periodo", "", ""]],
      });
      y = Math.max(yFin1, yFin2);

      // --- 3. Detalle por mes ---
      const conCompras = meses.filter((m) => m.compras > 0);
      if (conCompras.length) {
        doc.addPage();
        y = tituloSeccion(doc, "3. DETALLE DE COMPRAS POR MES", X + 6);
        for (const m of conCompras) {
          if (y + 70 > doc.page.height - FONDO_PIE) { doc.addPage(); y = X + 6; }
          doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.marino).text(m.nombreMes.toUpperCase(), X, y + 4, { lineBreak: false });
          doc.font("Helvetica").fontSize(8).fillColor(COLOR.tenue)
            .text(`${num(m.compras)} ${m.compras === 1 ? "compra" : "compras"}  ·  ${num(m.kilos, 2)} kg  ·  ${dinero(m.total)}`, X, y + 5, { width: W, align: "right" });
          y = tabla(doc, {
            y: y + 18,
            columnas: [
              { titulo: "FECHA Y HORA", ancho: 96 },
              { titulo: "FOLIO", ancho: 60 },
              { titulo: "ESPECIES", ancho: 112 },
              { titulo: "COMPRADOR", ancho: 102 },
              { titulo: "KILOS", ancho: 50, der: true },
              { titulo: "FINAL/KG", ancho: 50, der: true },
              { titulo: "TOTAL", ancho: 62, der: true, negrita: true },
            ],
            filas: m.filas.map((f) => [`${f.fecha} ${f.hora}`, `FAC-${String(f.id_cmp).padStart(6, "0")}`, f.especies, f.comprador, num(f.kilos, 2), dinero(f.precio_final), dinero(f.total)]),
            pie: [`Subtotal ${m.nombreMes}`, "", "", "", num(m.kilos, 2), "", dinero(m.total)],
          }) + 14;
        }
      }

      // --- Constancia y firmas ---
      if (y + 150 > doc.page.height - FONDO_PIE) { doc.addPage(); y = X + 6; }
      y += 10;
      const cadena = `||LPV|INFORME-ANUAL|${anio}|${folio}|COMPRAS:${totalesAnio.compras}|KG:${totalesAnio.kilos.toFixed(2)}|TOTAL:${totalesAnio.total.toFixed(2)}||`;
      const huella = crypto.createHmac("sha256", process.env.SC_JWT || "lonja").update(cadena).digest("hex");
      doc.roundedRect(X, y, W, 50, 5).lineWidth(0.75).fillAndStroke(COLOR.fondo, COLOR.borde);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLOR.marino).text("CONSTANCIA", X + 10, y + 8);
      doc.font("Helvetica").fontSize(7.5).fillColor(COLOR.texto)
        .text(`Las cifras de este informe corresponden a las compras registradas en el Sistema de la Lonja Pesquera de Veracruz para el ejercicio ${anio} al momento de su emisión.`, X + 10, y + 19, { width: W - 20 });
      doc.font("Courier").fontSize(6.5).fillColor(COLOR.tenue).text(`Huella de verificación: ${huella}`, X + 10, y + 38, { width: W - 20, lineBreak: false });

      y += 100;
      const firma = (fx, rotulo, nombre) => {
        doc.rect(fx, y, 200, 0.75).fill(COLOR.texto);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLOR.texto).text(nombre, fx, y + 6, { width: 200, align: "center" });
        doc.font("Helvetica").fontSize(7.5).fillColor(COLOR.tenue).text(rotulo, fx, y + 17, { width: 200, align: "center" });
      };
      firma(X + 30, "Elaboró", emitidoPor || "Sistema Lonja");
      firma(X + W - 230, "Autorizó", "Administración de la Lonja");

      numerarPaginas(doc, `${EMISOR.nombre}  ·  Informe anual ${anio}  ·  ${folio}`);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
