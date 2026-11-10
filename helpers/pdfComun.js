// Elementos compartidos por los PDF oficiales (factura y reportes): colores, logo vectorial y pie de página.
import { formatoFechaHora } from "./fechas.js";

export const COLOR = {
  marino: "#0B3954",
  teal: "#087E8B",
  cian: "#00A6FB",
  texto: "#334155",
  tenue: "#64748B",
  fondo: "#F1F5F9",
  borde: "#CBD5E1",
  blanco: "#FFFFFF",
};

export const EMISOR = {
  nombre: "Lonja Pesquera de Veracruz",
  lema: "SISTEMA DE SUBASTA Y CONTROL DE CAPTURA",
  rfc: "LPV-890412-M98",
  regimen: "Régimen de Actividades Agrícolas, Ganaderas y Pesqueras",
  direccion: "Muelle Fiscal de Pescadores S/N, Malecón del Puerto, C.P. 91700, Veracruz, Ver.",
  contacto: "Tel: (229) 900-1234  ·  contacto@lonjaveracruz.mx  ·  www.lonjaveracruz.mx",
};

/**
 * Dibuja el logo de la lonja (mismo trazo que public/img/logo.svg, 340x70) con la altura indicada.
 * Devuelve el ancho ocupado.
 */
export function dibujarLogo(doc, x, y, alto = 46) {
  const k = alto / 70;
  doc.save();
  doc.translate(x, y).scale(k);

  // Isotipo
  doc.translate(6, 6);
  doc.circle(28, 28, 27).fill("#EBF4F6");
  const oceano = doc.linearGradient(12, 16, 52, 40);
  oceano.stop(0, COLOR.marino).stop(0.6, COLOR.teal).stop(1, COLOR.cian);
  doc.path("M 12 28 C 20 16, 38 18, 46 28 C 38 38, 20 40, 12 28 Z").fill(oceano);
  doc.path("M 44 28 L 52 20 L 50 28 L 52 36 Z").fill(oceano);
  const ola = doc.linearGradient(8, 40, 50, 32);
  ola.stop(0, COLOR.cian).stop(1, "#05D9E8");
  doc.path("M 8 36 C 18 30, 24 42, 38 37 C 44 35, 48 37, 50 39").lineWidth(3).lineCap("round").stroke(ola);
  doc.circle(19, 26, 2.2).fill(COLOR.blanco);
  doc.translate(-6, -6);

  // Logotipo
  doc.font("Helvetica-Bold").fontSize(28).fillColor(COLOR.marino)
    .text("LONJA", 74, 45, { baseline: "alphabetic", characterSpacing: 1.5, lineBreak: false });
  doc.font("Helvetica").fontSize(22).fillColor(COLOR.teal)
    .text("VERACRUZ", 182, 44, { baseline: "alphabetic", characterSpacing: 3, lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.tenue)
    .text("SUBASTAS  •  PUERTO PESQUERO", 76, 61, { baseline: "alphabetic", characterSpacing: 2.8, lineBreak: false });

  doc.restore();
  return 340 * k;
}

/** Numera todas las páginas ("Página X de Y") y agrega la leyenda al pie. Requiere bufferPages: true. */
export function numerarPaginas(doc, leyenda) {
  const rango = doc.bufferedPageRange();
  const emitido = formatoFechaHora(new Date());
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const y = doc.page.height - 34;
    const ancho = doc.page.width - 80;
    doc.rect(40, y - 6, ancho, 0.75).fill(COLOR.borde);
    doc.font("Helvetica").fontSize(7).fillColor(COLOR.tenue);
    doc.text(`${leyenda}  ·  Emitido: ${emitido}`, 40, y, { width: ancho - 80, lineBreak: false });
    doc.text(`Página ${i + 1} de ${rango.count}`, 40, y, { width: ancho, align: "right", lineBreak: false });
  }
}
