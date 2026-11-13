// Filtros de los listados: validadores de los parámetros y traducción a
// condiciones de Sequelize. Los valores inválidos se ignoran (el validador
// devuelve undefined) y el filtro simplemente no se aplica.
import { Op, literal, where as sqlWhere } from "sequelize";
import { Especie } from "../models/index.js";
import { fechaValida, rangoDelDia } from "./fechas.js";

/** Fecha AAAA-MM-DD válida o undefined. */
export const filtroFecha = (v) => (fechaValida(v) ? String(v) : undefined);

/** Número >= 0 o undefined. */
export const filtroNumero = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Entero > 0 (ids de catálogo) o undefined. */
export const filtroEntero = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Valor de una lista blanca o undefined. */
export const filtroLista = (...valores) => (v) => (valores.includes(String(v)) ? String(v) : undefined);

/** "con"/"sin" o undefined (se conserva el texto para las opciones y chips). */
export const filtroSiNo = (v) => (v === "con" || v === "sin" ? v : undefined);

/** Subconsulta booleana reutilizable: EXISTS de compras para lote o comprador. */
const existeCompraDeLote = (tabla, pk) =>
  literal(`(SELECT COUNT(*) FROM compra WHERE compra.id_cmp = \`${tabla}\`.\`${pk}\`)`);
const existeCompraDeComprador = literal(
  "(SELECT COUNT(*) FROM compra WHERE compra.codigo_cpr = `Comprador`.`codigo_cpr`)",
);

/** Lotes que tienen al menos una especie del tipo indicado. */
async function lotesDelTipo(idTpo) {
  const filas = await Especie.findAll({ attributes: ["id_lte"], where: { id_tpo: idTpo }, raw: true });
  return [...new Set(filas.map((f) => f.id_lte))];
}

/**
 * Where de Sequelize con los filtros activos de la entidad.
 * `f` es el objeto l.filtros ya validado.
 */
export async function condicionFiltros(entidad, f) {
  const conds = [];

  switch (entidad) {
    case "compras": {
      if (f.desde) conds.push({ fecha: { [Op.gte]: rangoDelDia(f.desde).inicio } });
      if (f.hasta) conds.push({ fecha: { [Op.lt]: rangoDelDia(f.hasta).fin } });
      if (f.comprador) conds.push({ codigo_cpr: f.comprador });
      if (f.tipo) {
        const ids = await lotesDelTipo(f.tipo);
        conds.push({ id_cmp: { [Op.in]: ids } });
      }
      if (f.totalMin !== undefined) conds.push({ precio_total: { [Op.gte]: f.totalMin } });
      if (f.totalMax !== undefined) conds.push({ precio_total: { [Op.lte]: f.totalMax } });
      break;
    }

    case "lotes": {
      if (f.desde) conds.push({ fecha: { [Op.gte]: rangoDelDia(f.desde).inicio } });
      if (f.hasta) conds.push({ fecha: { [Op.lt]: rangoDelDia(f.hasta).fin } });
      if (f.estado === "disponibles") conds.push(sqlWhere(existeCompraDeLote("Lote", "id_lte"), { [Op.eq]: 0 }));
      if (f.estado === "vendidos") conds.push(sqlWhere(existeCompraDeLote("Lote", "id_lte"), { [Op.gt]: 0 }));
      if (f.tipo) {
        const ids = await lotesDelTipo(f.tipo);
        conds.push({ id_lte: { [Op.in]: ids } });
      }
      if (f.kilosMin !== undefined) conds.push({ kilos: { [Op.gte]: f.kilosMin } });
      if (f.kilosMax !== undefined) conds.push({ kilos: { [Op.lte]: f.kilosMax } });
      break;
    }

    case "especies": {
      if (f.tipo) conds.push({ id_tpo: f.tipo });
      if (f.estado === "disponibles") conds.push(sqlWhere(existeCompraDeLote("Especie", "id_lte"), { [Op.eq]: 0 }));
      if (f.estado === "vendidos") conds.push(sqlWhere(existeCompraDeLote("Especie", "id_lte"), { [Op.gt]: 0 }));
      break;
    }

    case "compradores": {
      if (f.compras === "con") conds.push(sqlWhere(existeCompraDeComprador, { [Op.gt]: 0 }));
      if (f.compras === "sin") conds.push(sqlWhere(existeCompraDeComprador, { [Op.eq]: 0 }));
      if (f.correo === "con") conds.push({ correo: { [Op.ne]: null } });
      if (f.correo === "sin") conds.push({ correo: { [Op.eq]: null } });
      break;
    }

    case "catalogo": {
      if (f.tipo) conds.push({ id_tpo: f.tipo });
      if (f.activo === "activo") conds.push({ activo: true });
      if (f.activo === "inactivo") conds.push({ activo: false });
      break;
    }

    case "usuarios": {
      if (f.rol) conds.push({ rol: f.rol });
      if (f.activo === "activo") conds.push({ activo: true });
      if (f.activo === "inactivo") conds.push({ activo: false });
      if (f.verificado === "verificado") conds.push({ email_verificado: true });
      if (f.verificado === "sin") conds.push({ email_verificado: false });
      break;
    }

    default:
      break;
  }

  return conds.length ? { [Op.and]: conds } : {};
}
