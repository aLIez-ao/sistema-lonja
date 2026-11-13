// Reglas compartidas de lotes: un lote vendido no se modifica por ninguna vía,
// y sus especies son una copia del catálogo al momento de capturarlas.
import { Compra, Especie, EspecieCatalogo, Lote } from "../models/index.js";

export class LoteNoEncontradoError extends Error {
  constructor() {
    super("No se encontró el lote");
    this.codigo = 404;
  }
}

export class LoteVendidoError extends Error {
  constructor() {
    super("El lote ya fue vendido y no puede modificarse");
    this.codigo = 409;
  }
}

export class EspeciesInvalidasError extends Error {
  constructor(mensaje = "Selecciona al menos una especie activa del catálogo") {
    super(mensaje);
    this.codigo = 400;
  }
}

/** Carga el lote y lanza LoteVendidoError si ya tiene compra. */
export async function exigirLoteNoVendido(id, { transaction } = {}) {
  const lote = await Lote.findByPk(id, {
    include: [{ model: Compra, as: "compra" }],
    transaction,
  });
  if (!lote) throw new LoteNoEncontradoError();
  if (lote.compra) throw new LoteVendidoError();
  return lote;
}

export const estaVendido = async (id) => Boolean(await Compra.findOne({ where: { id_cmp: id } }));

/** Normaliza el campo "especies" (array, valor único o lista separada por comas). */
export function idsEspecies(valor) {
  const lista = Array.isArray(valor) ? valor : String(valor ?? "").split(",");
  return [...new Set(lista.map((v) => String(v).trim()).filter(Boolean))];
}

/**
 * Sincroniza las especies de un lote con los ids de catálogo elegidos.
 * Copia nombre, tipo e imagen del catálogo para no alterar el historial.
 * Debe ejecutarse dentro de una transacción junto con el alta/edición del lote.
 */
export async function sincronizarEspecies(idLte, idsCat, transaction) {
  if (!idsCat.length) throw new EspeciesInvalidasError();

  const catalogo = await EspecieCatalogo.findAll({
    where: { id_cat: idsCat },
    include: [{ association: "tipo" }],
    transaction,
  });
  if (catalogo.length !== idsCat.length) throw new EspeciesInvalidasError("Alguna especie ya no existe en el catálogo");
  const inactivas = catalogo.filter((c) => !c.activo);
  if (inactivas.length) throw new EspeciesInvalidasError(`La especie "${inactivas[0].nombre}" está desactivada`);

  const actuales = await Especie.findAll({ where: { id_lte: idLte }, transaction });
  const seleccion = new Set(idsCat.map(String));
  const sobrantes = actuales.filter((e) => !e.id_cat || !seleccion.has(String(e.id_cat)));
  if (sobrantes.length) {
    await Especie.destroy({ where: { id_epe: sobrantes.map((e) => e.id_epe) }, transaction });
  }

  const porCatalogo = new Map(actuales.filter((e) => e.id_cat).map((e) => [String(e.id_cat), e]));
  for (const c of catalogo) {
    const valores = {
      id_lte: idLte,
      id_cat: c.id_cat,
      nombre: c.nombre,
      id_tpo: c.id_tpo,
      imagen: c.imagen,
    };
    const existente = porCatalogo.get(String(c.id_cat));
    if (existente) await existente.update(valores, { transaction });
    else await Especie.create(valores, { transaction });
  }

  return catalogo;
}

/** Respuesta uniforme cuando una operación intenta tocar un lote vendido. */
export function responderErrorLote(res, error, { volver } = {}) {
  const mensaje = error instanceof Error ? error.message : String(error);
  const codigo = error?.codigo || 400;
  if (res.req?.accepts(["html", "json"]) === "json") {
    return res.status(codigo).json({ ok: false, error: mensaje });
  }
  const destino = volver || "/lotes";
  return res.redirect(`${destino}?${new URLSearchParams({ error: mensaje })}`);
}
