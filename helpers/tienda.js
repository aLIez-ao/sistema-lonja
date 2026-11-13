// Datos derivados para la tienda pública: imagen de una especie, total del
// lote e insignias. Nada de aquí lee compradores ni compras: la tienda solo
// trabaja con lotes disponibles y especies activas.
import { redondea } from "./fechas.js";

/** Muestra un nombre de comprador sin revelar su apellido completo. */
export function nombrePublico(nombreCompleto) {
  const partes = String(nombreCompleto ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "Comprador";
  const nombre = partes[0];
  const apellido = partes.length > 1 ? partes.at(-1) : "";
  return apellido ? `${nombre} ${Array.from(apellido)[0].toLocaleUpperCase("es-MX")}.` : nombre;
}

// Las fotos existentes en public/img se asignan por nombre de especie.
const FOTOS_POR_NOMBRE = [
  [/huachinango/i, "/img/Huachinango.webp"],
  [/camar[oó]n/i, "/img/Camaron.webp"],
  [/jaiba/i, "/img/Jaiba.webp"],
  [/osti[oó]n/i, "/img/Ostion.webp"],
  [/mojarra|tilapia/i, "/img/mojarra.jpg"],
];

const PLACEHOLDER_POR_TIPO = {
  pescado: "/img/placeholder-pescado.svg",
  marisco: "/img/placeholder-marisco.svg",
  molusco: "/img/placeholder-molusco.svg",
};

const sinAcentos = (texto) =>
  String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** URL de la imagen de una especie: la suya, una foto conocida o el placeholder de su tipo. */
export function imagenDeEspecie(especie) {
  if (especie?.imagen) return especie.imagen;
  if (especie?.catalogo?.imagen) return especie.catalogo.imagen;
  const porNombre = FOTOS_POR_NOMBRE.find(([patron]) => patron.test(especie?.nombre || ""));
  if (porNombre) return porNombre[1];
  return PLACEHOLDER_POR_TIPO[sinAcentos(especie?.tipo?.nombre)] || PLACEHOLDER_POR_TIPO.pescado;
}

/** Precio total del lote (kilos × precio por kilo), redondeado a centavos. */
export const totalLote = (lote) =>
  redondea(Number(lote?.kilos || 0) * Number(lote?.precio_kilo_salida || 0));

/** Convierte un lote de Sequelize en un objeto plano listo para las vistas. */
export function prepararLote(lote, { hoyInicio = null, minPrecio = null } = {}) {
  const plano = typeof lote.get === "function" ? lote.get({ plain: true }) : { ...lote };
  const especies = (plano.especies || []).map((e) => ({
    ...e,
    imagen: imagenDeEspecie(e),
    tipoNombre: e.tipo?.nombre || "",
  }));
  const nombres = [...new Set(especies.map((e) => e.nombre))];
  const tipos = [...new Set(especies.map((e) => e.tipoNombre).filter(Boolean))];
  const fecha = new Date(plano.fecha);
  const esDeHoy = Boolean(hoyInicio && fecha >= hoyInicio);

  return {
    ...plano,
    especies,
    imagen: especies[0]?.imagen || PLACEHOLDER_POR_TIPO.pescado,
    total: totalLote(plano),
    nombresEspecies: nombres.join(", "),
    tipos,
    tipoPrincipal: tipos[0] || "Pescado",
    esDeHoy,
    esNuevo: esDeHoy,
    mejorPrecio:
      minPrecio !== null && Number(plano.precio_kilo_salida) <= Number(minPrecio) + 0.0001,
    estrellas: null, // las opiniones llegan en la Fase 5
  };
}

/** Precio mínimo por kilo de una lista de lotes ya preparados (para la insignia). */
export const precioMinimo = (lotes) =>
  lotes.length ? Math.min(...lotes.map((l) => Number(l.precio_kilo_salida))) : null;
