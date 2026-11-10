import PDFDocument from "pdfkit";
import { datosFactura } from "./factura.js";
import { COLOR, dibujarLogo } from "./pdfComun.js";

// Columnas de la tabla (pt). La vista web usa los mismos anchos (views/compras/factura.ejs).
const COLS = [
  { clave: "lote", titulo: "LOTE", ancho: 55 },
  { clave: "especies", titulo: "ESPECIES / DESCRIPCIÓN", ancho: 165 },
  { clave: "cajas", titulo: "CAJAS", ancho: 50, der: true },
  { clave: "kilos", titulo: "PESO (KG)", ancho: 65, der: true },
  { clave: "salida", titulo: "SALIDA/KG", ancho: 65, der: true },
  { clave: "final", titulo: "FINAL/KG", ancho: 65, der: true },
  { clave: "total", titulo: "TOTAL", ancho: 67, der: true },
];

/**
 * Genera el PDF de la factura de una compra. Mismo contenido y distribución que la vista web.
 */
export async function generarFacturaPDF(compra) {
  return new Promise((resolve, reject) => {
    try {
      const f = datosFactura(compra);
      const doc = new PDFDocument({
        margin: 40,
        size: "LETTER",
        info: { Title: `Factura ${f.folio} - Lonja de Veracruz`, Author: f.emisor.nombre, Subject: "Factura de compra de productos pesqueros" },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const X = 40;
      const W = 532;

      // --- Encabezado ---
      doc.rect(X, 40, W, 6).fill(COLOR.marino);
      dibujarLogo(doc, X, 56, 46);

      doc.fillColor(COLOR.teal).font("Helvetica-Bold").fontSize(9).text(f.emisor.lema, X, 110, { lineBreak: false });
      doc.fillColor(COLOR.texto).font("Helvetica").fontSize(7.5)
        .text(`RFC: ${f.emisor.rfc}  ·  ${f.emisor.regimen}`, X, 123, { lineBreak: false })
        .text(f.emisor.direccion, X, 133, { lineBreak: false })
        .text(f.emisor.contacto, X, 143, { lineBreak: false });

      // Recuadro de folio
      doc.save();
      doc.roundedRect(380, 56, 192, 64, 6).clip();
      doc.rect(380, 56, 192, 22).fill(COLOR.marino);
      doc.restore();
      doc.roundedRect(380, 56, 192, 64, 6).lineWidth(0.75).strokeColor(COLOR.borde).stroke();
      doc.fillColor(COLOR.blanco).font("Helvetica-Bold").fontSize(10).text("FACTURA COMERCIAL", 380, 63, { width: 192, align: "center", characterSpacing: 0.6 });
      doc.fillColor(COLOR.tenue).font("Helvetica-Bold").fontSize(8.5).text("FOLIO:", 392, 86, { lineBreak: false });
      doc.fillColor(COLOR.marino).text(f.folio, 392, 86, { width: 168, align: "right" });
      doc.rect(392, 98.5, 168, 0.5).fill(COLOR.borde);
      doc.fillColor(COLOR.tenue).font("Helvetica-Bold").fontSize(8.5).text("FECHA:", 392, 104, { lineBreak: false });
      doc.fillColor(COLOR.texto).font("Helvetica").text(f.fecha, 392, 104, { width: 168, align: "right" });

      // --- Receptor ---
      let y = 162;
      doc.roundedRect(X, y, W, 62, 6).lineWidth(0.75).fillAndStroke(COLOR.fondo, COLOR.borde);
      doc.fillColor(COLOR.marino).font("Helvetica-Bold").fontSize(8.5).text("DATOS DEL RECEPTOR / COMPRADOR", X + 12, y + 9, { characterSpacing: 0.4 });
      const par = (etiqueta, valor, px, py, ancho) => {
        doc.font("Helvetica").fontSize(8.5);
        const rotulo = `${etiqueta}: `;
        const anchoRotulo = doc.widthOfString(rotulo);
        doc.fillColor(COLOR.tenue).text(rotulo, px, py, { lineBreak: false });
        // Una sola línea; si no cabe se corta con puntos suspensivos (igual que en la vista web)
        doc.fillColor(COLOR.texto).text(String(valor), px + anchoRotulo, py, { width: ancho - anchoRotulo, height: 10, ellipsis: true });
      };
      par("Cliente", f.cliente.nombre, X + 12, y + 24, 240);
      par("Código de comprador", `#${f.cliente.codigo}`, X + 12, y + 36, 240);
      par("Correo", f.cliente.correo, X + 12, y + 48, 240);
      par("Dirección", f.cliente.direccion, X + 270, y + 24, 250);
      par("Uso CFDI", f.cliente.usoCfdi, X + 270, y + 36, 250);
      par("Método de pago", f.cliente.metodoPago, X + 270, y + 48, 250);

      // --- Tabla de conceptos ---
      y = 240;
      doc.rect(X, y, W, 22).fill(COLOR.marino);
      doc.fillColor(COLOR.blanco).font("Helvetica-Bold").fontSize(8);
      let cx = X;
      for (const col of COLS) {
        doc.text(col.titulo, cx + 8, y + 7.5, { width: col.ancho - 16, align: col.der ? "right" : "left", lineBreak: false });
        cx += col.ancho;
      }

      y += 22;
      doc.font("Helvetica-Bold").fontSize(8.5);
      const altoEspecies = doc.heightOfString(f.concepto.especies, { width: COLS[1].ancho - 16 });
      const altoFila = Math.max(40, altoEspecies + 26);
      doc.rect(X, y, W, altoFila).lineWidth(0.75).fillAndStroke(COLOR.blanco, COLOR.borde);
      cx = X;
      for (const col of COLS) {
        if (cx > X) doc.rect(cx, y, 0.5, altoFila).fill(COLOR.borde);
        const opciones = { width: col.ancho - 16, align: col.der ? "right" : "left" };
        if (col.clave === "especies") {
          doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR.texto).text(f.concepto.especies, cx + 8, y + 8, opciones);
          doc.font("Helvetica").fontSize(7).fillColor(COLOR.tenue).text(f.concepto.nota, cx + 8, y + 10 + altoEspecies, opciones);
        } else {
          const negrita = ["lote", "final", "total"].includes(col.clave);
          const color = col.clave === "lote" || col.clave === "total" ? COLOR.marino : col.clave === "salida" ? COLOR.tenue : COLOR.texto;
          doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(color)
            .text(f.concepto[col.clave], cx + 8, y + altoFila / 2 - 4, { ...opciones, lineBreak: false });
        }
        cx += col.ancho;
      }

      // --- Notas fiscales y totales ---
      y += altoFila + 14;
      doc.roundedRect(X, y, 320, 66, 6).lineWidth(0.75).fillAndStroke(COLOR.fondo, COLOR.borde);
      doc.fillColor(COLOR.marino).font("Helvetica-Bold").fontSize(8).text("INFORMACIÓN FISCAL Y GARANTÍA:", X + 10, y + 9);
      doc.fillColor(COLOR.texto).font("Helvetica").fontSize(7.5);
      let ny = y + 22;
      for (const nota of f.notasFiscales) {
        doc.text(`•  ${nota}`, X + 10, ny, { width: 300 });
        ny = doc.y + 2;
      }

      const tx = 375;
      doc.roundedRect(tx, y, 197, 66, 6).lineWidth(0.75).fillAndStroke(COLOR.fondo, COLOR.borde);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLOR.tenue).text("Subtotal:", tx + 12, y + 10, { lineBreak: false });
      doc.fillColor(COLOR.texto).text(f.subtotal, tx + 12, y + 10, { width: 173, align: "right" });
      doc.fillColor(COLOR.tenue).text("IVA (0%):", tx + 12, y + 24, { lineBreak: false });
      doc.fillColor(COLOR.texto).text(f.iva, tx + 12, y + 24, { width: 173, align: "right" });
      doc.rect(tx + 12, y + 38, 173, 0.5).fill(COLOR.borde);
      doc.fillColor(COLOR.marino).font("Helvetica-Bold").fontSize(10).text("TOTAL:", tx + 12, y + 46, { lineBreak: false });
      doc.fontSize(11).text(f.total, tx + 12, y + 45.5, { width: 173, align: "right" });

      // --- Cadena y sello ---
      y += 66 + 18;
      doc.rect(X, y, W, 0.75).fill(COLOR.borde);
      doc.fillColor(COLOR.texto).font("Helvetica-Bold").fontSize(7.5).text("CADENA ORIGINAL DEL COMPROBANTE DE SUBASTA:", X, y + 10);
      doc.font("Courier").fontSize(6.5).fillColor(COLOR.tenue).text(f.cadena, X, y + 21, { width: W });
      const ySello = doc.y + 8;
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLOR.texto).text("SELLO DIGITAL DE LA LONJA:", X, ySello);
      doc.font("Courier").fontSize(6.5).fillColor(COLOR.tenue).text(f.sello, X, ySello + 11, { width: W });

      doc.font("Helvetica-Oblique").fontSize(7.5).fillColor(COLOR.tenue).text(f.leyenda, X, doc.y + 14, { width: W, align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
