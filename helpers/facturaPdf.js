import PDFDocument from "pdfkit";
import { formatoFechaHora, dinero } from "./fechas.js";

/**
 * Genera un buffer de PDF con diseño de factura comercial/fiscal para una compra.
 */
export async function generarFacturaPDF(compra) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "LETTER",
        info: {
          Title: `Factura Lonja Veracruz - ${compra.id_cmp}`,
          Author: "Lonja Pesquera de Veracruz",
          Subject: "Factura de Compra de Productos Pesqueros",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const azulMarino = "#0B3954";
      const azulClaro = "#087E8B";
      const grisOscuro = "#334155";
      const grisClaro = "#F1F5F9";
      const grisBorde = "#CBD5E1";

      // --- ENCABEZADO ---
      // Franja superior de marca
      doc.rect(40, 40, 532, 6).fill(azulMarino);

      // Título y datos de la empresa
      doc.fillColor(azulMarino)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("LONJA PESQUERA DE VERACRUZ", 40, 58);

      doc.fillColor(azulClaro)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("SISTEMA DE SUBASTA Y CONTROL DE CAPTURA", 40, 80);

      doc.fillColor(grisOscuro)
        .font("Helvetica")
        .fontSize(8)
        .text("RFC: LPV-890412-M98  ·  Régimen de Actividades Agrícolas, Ganaderas y Pesqueras", 40, 94)
        .text("Muelle Fiscal de Pescadores S/N, Malecón del Puerto, C.P. 91700, Veracruz, Ver.", 40, 105)
        .text("Tel: (229) 900-1234  ·  contacto@lonjaveracruz.mx  ·  www.lonjaveracruz.mx", 40, 116);

      // Recuadro derecho: Folio y Fecha
      doc.roundedRect(380, 58, 192, 68, 6).strokeColor(grisBorde).lineWidth(1).stroke();
      doc.rect(380, 58, 192, 22).fill(azulMarino);
      
      doc.fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("FACTURA COMERCIAL", 380, 64, { width: 192, align: "center" });

      doc.fillColor(grisOscuro)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("FOLIO:", 390, 86)
        .font("Helvetica")
        .text(`FAC-${String(compra.id_cmp).padStart(6, "0")}`, 440, 86)
        .font("Helvetica-Bold")
        .text("FECHA:", 390, 100)
        .font("Helvetica")
        .text(formatoFechaHora(compra.fecha), 440, 100);

      // --- RECUADRO DATOS DEL CLIENTE ---
      const comprador = compra.comprador || {};
      const nombreCompleto = `${comprador.nombre || ""} ${comprador.apellido_paterno || ""} ${comprador.apellido_materno || ""}`.trim();

      doc.roundedRect(40, 140, 532, 62, 6).fillAndStroke(grisClaro, grisBorde);
      doc.fillColor(azulMarino)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("DATOS DEL RECEPTOR / COMPRADOR", 50, 148);

      doc.fillColor(grisOscuro).font("Helvetica").fontSize(8.5);
      doc.text(`Cliente: ${nombreCompleto || "Consumidor Final"}`, 50, 163);
      doc.text(`Código de Comprador: #${comprador.codigo_cpr || "—"}`, 50, 176);
      doc.text(`Correo: ${comprador.correo || "No registrado"}`, 50, 189);

      doc.text(`Dirección: ${comprador.direccion || "Veracruz, Ver."}`, 300, 163, { width: 260 });
      doc.text("Uso CFDI: G01 - Adquisición de mercancías", 300, 176);
      doc.text("Método de Pago: PUE - Pago en una sola exhibición", 300, 189);

      // --- TABLA DE DETALLE ---
      const tablaY = 220;
      doc.rect(40, tablaY, 532, 22).fill(azulMarino);

      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8.5);
      doc.text("LOTE", 48, tablaY + 6);
      doc.text("ESPECIES / DESCRIPCIÓN", 95, tablaY + 6);
      doc.text("CAJAS", 260, tablaY + 6, { width: 45, align: "right" });
      doc.text("PESO (KG)", 315, tablaY + 6, { width: 55, align: "right" });
      doc.text("SALIDA/KG", 380, tablaY + 6, { width: 60, align: "right" });
      doc.text("FINAL/KG", 445, tablaY + 6, { width: 55, align: "right" });
      doc.text("TOTAL", 505, tablaY + 6, { width: 60, align: "right" });

      const lote = compra.lote || {};
      const especiesNombres = lote.especies && lote.especies.length
        ? lote.especies.map((e) => `${e.nombre}${e.tipo ? ` (${e.tipo.nombre})` : ""}`).join(", ")
        : "Especies varias del Golfo";

      const filaY = tablaY + 22;
      doc.rect(40, filaY, 532, 45).fillAndStroke("#FFFFFF", grisBorde);

      doc.fillColor(grisOscuro).font("Helvetica").fontSize(8.5);
      doc.text(`Lote #${compra.id_cmp}`, 48, filaY + 12);
      doc.text(especiesNombres, 95, filaY + 8, { width: 160 });
      doc.text(String(lote.numero_cajas || 0), 260, filaY + 12, { width: 45, align: "right" });
      doc.text(Number(lote.kilos || 0).toFixed(2), 315, filaY + 12, { width: 55, align: "right" });
      doc.text(dinero(lote.precio_kilo_salida || 0), 380, filaY + 12, { width: 60, align: "right" });
      doc.font("Helvetica-Bold").text(dinero(compra.precio_kilo_final || 0), 445, filaY + 12, { width: 55, align: "right" });
      doc.font("Helvetica-Bold").fillColor(azulMarino).text(dinero(compra.precio_total || 0), 505, filaY + 12, { width: 60, align: "right" });

      // --- TOTALES Y RESUMEN ---
      const totalesY = filaY + 55;

      // Caja de texto a la izquierda
      doc.roundedRect(40, totalesY, 320, 65, 4).fillAndStroke(grisClaro, grisBorde);
      doc.fillColor(azulMarino).font("Helvetica-Bold").fontSize(8).text("INFORMACIÓN FISCAL Y GARANTÍA:", 48, totalesY + 8);
      doc.fillColor(grisOscuro).font("Helvetica").fontSize(7.5)
        .text("• Tasa IVA 0% de conformidad con el Art. 2o.-A Fracc. I inciso b) de la LIVA (productos marinos no industrializados).", 48, totalesY + 20, { width: 304 })
        .text("• Producto fresco del día desembarcado bajo normas sanitarias de pesca ribereña y de altura.", 48, totalesY + 40, { width: 304 });

      // Tabla de importes a la derecha
      const totalBoxX = 375;
      const subtotal = Number(compra.precio_total || 0);

      doc.roundedRect(totalBoxX, totalesY, 197, 65, 4).fillAndStroke(grisClaro, grisBorde);
      doc.fillColor(grisOscuro).font("Helvetica").fontSize(8.5);

      doc.text("Subtotal:", totalBoxX + 12, totalesY + 8);
      doc.text(dinero(subtotal), totalBoxX + 80, totalesY + 8, { width: 105, align: "right" });

      doc.text("IVA (0%):", totalBoxX + 12, totalesY + 22);
      doc.text("$0.00 MXN", totalBoxX + 80, totalesY + 22, { width: 105, align: "right" });

      doc.rect(totalBoxX + 10, totalesY + 36, 177, 1).fill(grisBorde);

      doc.fillColor(azulMarino).font("Helvetica-Bold").fontSize(10);
      doc.text("TOTAL:", totalBoxX + 12, totalesY + 44);
      doc.text(dinero(subtotal), totalBoxX + 80, totalesY + 44, { width: 105, align: "right" });

      // --- SELLO Y PIE DIGITAL ---
      const pieY = 380;
      doc.rect(40, pieY, 532, 1).fill(grisBorde);

      doc.fillColor(grisOscuro).font("Helvetica-Bold").fontSize(7.5)
        .text("CADENA ORIGINAL DEL COMPROBANTE DE SUBASTA:", 40, pieY + 8);

      const cadenaSimulada = `||1.1|FAC-${compra.id_cmp}|${compra.fecha ? new Date(compra.fecha).toISOString() : new Date().toISOString()}|${subtotal.toFixed(2)}|MXN|${comprador.codigo_cpr || "0"}|LPV890412M98||`;
      doc.font("Courier").fontSize(6.5).fillColor("#64748B")
        .text(cadenaSimulada, 40, pieY + 20, { width: 532 });

      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(grisOscuro)
        .text("SELLO DIGITAL DE LA LONJA:", 40, pieY + 34);

      const selloSimulado = Buffer.from(`LONJA-VERACRUZ-SELLO-${compra.id_cmp}-${subtotal}-${Date.now()}`).toString("base64");
      doc.font("Courier").fontSize(6.5).fillColor("#64748B")
        .text(selloSimulado.padEnd(120, "X0A9Bc="), 40, pieY + 46, { width: 532 });

      // Mensaje final
      doc.font("Helvetica-Oblique").fontSize(8).fillColor("#94A3B8")
        .text("Este documento es un comprobante digital oficial de compra-venta expedido por el Sistema de la Lonja Pesquera de Veracruz.", 40, pieY + 68, { width: 532, align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
