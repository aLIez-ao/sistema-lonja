// Búsqueda por texto: una sola definición de "qué coincide" para el listado
// (formulario GET) y para el endpoint de sugerencias.
//
// La comparación usa INSTR(LOWER(campo), texto): busca la subcadena de forma
// literal, así que "%" y "_" se buscan como caracteres y no como comodines de
// LIKE. El texto del usuario siempre viaja como parámetro enlazado, nunca
// concatenado en el SQL.
import { Op, fn, col, where as sqlWhere } from "sequelize";
import { Compra, Lote, Especie, Comprador, Tipo, Usuario } from "../models/index.js";
import { formatoFechaHora, dinero } from "./fechas.js";

export const ENTIDADES = ["compras", "lotes", "especies", "compradores", "tipos", "usuarios"];

const LIMITE_SUGERENCIAS = 8;

/** Texto de búsqueda recortado; null si viene vacío. */
const texto = (q) => {
  const t = String(q ?? "").trim().slice(0, 60);
  return t || null;
};

/** Texto válido para el endpoint de sugerencias (2 a 60 caracteres). */
export const textoBusqueda = (q) => {
  const t = String(q ?? "").trim();
  return t.length >= 2 && t.length <= 60 ? t : null;
};

/** Condición "contiene" literal y segura (INSTR no interpreta % ni _). */
const contiene = (campo, q) =>
  sqlWhere(fn("INSTR", fn("LOWER", col(campo)), q.toLowerCase()), { [Op.gt]: 0 });

const sinResultados = (pk) => ({ [pk]: { [Op.in]: [] } });

const idSiNumero = (q) => {
  const n = Number(q);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Where de Sequelize con los registros que coinciden con `q` en esa entidad.
 * Devuelve {} cuando no hay texto (sin filtro).
 */
export async function condicionBusqueda(entidad, q) {
  const t = texto(q);
  if (!t) return {};

  switch (entidad) {
    case "compras": {
      // Comprador: se resuelven sus códigos y se buscan sus compras.
      const compradores = await Comprador.findAll({
        attributes: ["codigo_cpr"],
        where: {
          [Op.or]: [
            contiene("Comprador.nombre", t),
            contiene("Comprador.apellido_paterno", t),
            contiene("Comprador.apellido_materno", t),
          ],
        },
        raw: true,
      });
      // Especies: se resuelven los lotes que las contienen.
      const especies = await Especie.findAll({
        attributes: ["id_lte"],
        where: contiene("Especie.nombre", t),
        raw: true,
      });

      const conds = [];
      if (compradores.length) {
        conds.push({ codigo_cpr: { [Op.in]: compradores.map((c) => c.codigo_cpr) } });
      }
      const idLotes = [...new Set(especies.map((e) => e.id_lte))];
      if (idLotes.length) conds.push({ id_cmp: { [Op.in]: idLotes } });
      const n = idSiNumero(t);
      if (n) conds.push({ id_cmp: n });

      return conds.length ? { [Op.or]: conds } : sinResultados("id_cmp");
    }

    case "lotes": {
      const especies = await Especie.findAll({
        attributes: ["id_lte"],
        where: contiene("Especie.nombre", t),
        raw: true,
      });
      const conds = [];
      const ids = [...new Set(especies.map((e) => e.id_lte))];
      if (ids.length) conds.push({ id_lte: { [Op.in]: ids } });
      const n = idSiNumero(t);
      if (n) conds.push({ id_lte: n });
      return conds.length ? { [Op.or]: conds } : sinResultados("id_lte");
    }

    case "especies": {
      const tipos = await Tipo.findAll({
        attributes: ["id_tpo"],
        where: contiene("Tipo.nombre", t),
        raw: true,
      });
      const conds = [contiene("Especie.nombre", t)];
      if (tipos.length) conds.push({ id_tpo: { [Op.in]: tipos.map((tp) => tp.id_tpo) } });
      return { [Op.or]: conds };
    }

    case "compradores":
      return {
        [Op.or]: [
          contiene("Comprador.nombre", t),
          contiene("Comprador.apellido_paterno", t),
          contiene("Comprador.apellido_materno", t),
          contiene("Comprador.correo", t),
        ],
      };

    case "tipos":
      return { [Op.or]: [contiene("Tipo.nombre", t)] };

    case "usuarios":
      return {
        [Op.or]: [
          contiene("Usuario.usuario", t),
          contiene("Usuario.nombre_completo", t),
          contiene("Usuario.correo", t),
        ],
      };

    default:
      return {};
  }
}

/**
 * Sugerencias para el desplegable del buscador (máximo 8).
 * Devuelve null si la entidad requiere un rol que el usuario no tiene.
 */
export async function sugerencias(entidad, q, usuario) {
  const t = textoBusqueda(q);
  if (!t) return [];

  if (entidad === "usuarios" && usuario?.rol !== "admin") return null;

  const where = await condicionBusqueda(entidad, t);

  switch (entidad) {
    case "compras": {
      const filas = await Compra.findAll({
        where,
        include: [
          { model: Comprador, as: "comprador" },
          { model: Lote, as: "lote", include: [{ model: Especie, as: "especies" }] },
        ],
        order: [["fecha", "DESC"]],
        limit: LIMITE_SUGERENCIAS,
      });
      return filas.map((c) => ({
        id: c.id_cmp,
        titulo: `Compra #${c.id_cmp} · ${c.comprador.nombre} ${c.comprador.apellido_paterno}`,
        subtitulo: `${formatoFechaHora(c.fecha)} · ${dinero(c.precio_total)}`,
        url: `/compras/${c.id_cmp}/editar`,
      }));
    }

    case "lotes": {
      const filas = await Lote.findAll({
        where,
        include: [
          { model: Especie, as: "especies" },
          { model: Compra, as: "compra" },
        ],
        order: [["id_lte", "DESC"]],
        limit: LIMITE_SUGERENCIAS,
      });
      return filas.map((l) => {
        const especies = l.especies.map((e) => e.nombre).join(", ");
        return {
          id: l.id_lte,
          titulo: `Lote #${l.id_lte}${especies ? ` · ${especies}` : ""}`,
          subtitulo: `${Number(l.kilos).toFixed(2)} kg · ${l.compra ? "vendido" : "disponible"}`,
          url: `/lotes/${l.id_lte}/editar`,
        };
      });
    }

    case "especies": {
      const filas = await Especie.findAll({
        where,
        include: [{ model: Tipo, as: "tipo" }],
        order: [["id_epe", "DESC"]],
        limit: LIMITE_SUGERENCIAS,
      });
      return filas.map((e) => ({
        id: e.id_epe,
        titulo: e.nombre,
        subtitulo: `${e.tipo.nombre} · Lote #${e.id_lte}`,
        url: `/especies/${e.id_epe}/editar`,
      }));
    }

    case "compradores": {
      const filas = await Comprador.findAll({
        where,
        order: [["codigo_cpr", "DESC"]],
        limit: LIMITE_SUGERENCIAS,
      });
      return filas.map((c) => ({
        id: c.codigo_cpr,
        titulo: `${c.nombre} ${c.apellido_paterno} ${c.apellido_materno ?? ""}`.trim(),
        subtitulo: c.correo,
        url: `/compradores/${c.codigo_cpr}/editar`,
      }));
    }

    case "tipos": {
      const filas = await Tipo.findAll({
        where,
        order: [["nombre", "ASC"]],
        limit: LIMITE_SUGERENCIAS,
      });
      return filas.map((tp) => ({
        id: tp.id_tpo,
        titulo: tp.nombre,
        subtitulo: "Tipo de especie",
        url: `/tipos/${tp.id_tpo}/editar`,
      }));
    }

    case "usuarios": {
      const filas = await Usuario.scope("sinClave").findAll({
        where,
        order: [["nombre_completo", "ASC"]],
        limit: LIMITE_SUGERENCIAS,
      });
      return filas.map((u) => ({
        id: u.id,
        titulo: u.nombre_completo,
        subtitulo: `@${u.usuario}${u.correo ? ` · ${u.correo}` : ""}`,
        url: `/usuarios/${u.id}/editar`,
      }));
    }

    default:
      return [];
  }
}
