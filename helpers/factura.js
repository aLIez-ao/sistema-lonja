// Datos de la factura calculados una sola vez para la vista web y para el PDF,
// de modo que ambos muestren exactamente lo mismo.
import crypto from "crypto";
import { formatoFechaHora, dinero } from "./fechas.js";
import { EMISOR } from "./pdfComun.js";

export function datosFactura(compra) {
  const comprador = compra.comprador || {};
  const lote = compra.lote || {};
  const total = Number(compra.precio_total || 0);
  const folio = `FAC-${String(compra.id_cmp).padStart(6, "0")}`;
  const fechaISO = new Date(compra.fecha || Date.now()).toISOString();

  const especies = lote.especies?.length
    ? lote.especies.map((e) => `${e.nombre}${e.tipo ? ` (${e.tipo.nombre})` : ""}`).join(", ")
    : "Especies varias del Golfo";

  const cadena = `||1.1|${folio}|${fechaISO}|${total.toFixed(2)}|MXN|${comprador.codigo_cpr ?? 0}|${EMISOR.rfc.replaceAll("-", "")}||`;
  // Sello reproducible: la misma factura siempre produce el mismo sello
  const sello = crypto.createHmac("sha256", process.env.SC_JWT || "lonja").update(cadena).digest("base64")
    + crypto.createHash("sha256").update(cadena).digest("base64");

  return {
    emisor: EMISOR,
    id: compra.id_cmp,
    folio,
    fecha: formatoFechaHora(compra.fecha || new Date()),
    cliente: {
      nombre: [comprador.nombre, comprador.apellido_paterno, comprador.apellido_materno].filter(Boolean).join(" ") || "Consumidor final",
      codigo: comprador.codigo_cpr ?? "—",
      correo: comprador.correo || "No registrado",
      direccion: comprador.direccion || "Veracruz, Ver.",
      usoCfdi: "G01 - Adquisición de mercancías",
      metodoPago: "PUE - Pago en una sola exhibición",
    },
    concepto: {
      lote: `Lote #${compra.id_cmp}`,
      especies,
      nota: "Captura ribereña certificada",
      cajas: String(lote.numero_cajas ?? 0),
      kilos: Number(lote.kilos || 0).toFixed(2),
      salida: dinero(lote.precio_kilo_salida || 0),
      final: dinero(compra.precio_kilo_final || 0),
      total: dinero(total),
    },
    subtotal: dinero(total),
    iva: dinero(0),
    total: `${dinero(total)} MXN`,
    notasFiscales: [
      "Tasa IVA 0% de conformidad con el Art. 2o.-A Fracc. I inciso b) de la LIVA (productos marinos no industrializados).",
      "Producto fresco del día desembarcado bajo normas sanitarias de pesca ribereña y de altura.",
    ],
    cadena,
    sello,
    leyenda: "Este documento es un comprobante digital de compra-venta expedido por el Sistema de la Lonja Pesquera de Veracruz.",
  };
}
