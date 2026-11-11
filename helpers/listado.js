// Listados paginados y ordenables en el servidor.
//
// `leerListado` normaliza los parámetros de la URL (página, tamaño, orden y
// búsqueda) y devuelve el modelo de vista. `consultarListado` ejecuta la
// consulta en dos pasos para que el orden y el conteo funcionen aunque haya
// relaciones 1—N (Lote → Especie, Comprador → Compra, Tipo → Especie).
import { Op } from "sequelize";

const DIRECCIONES = ["asc", "desc"];

const aEntero = (valor) => {
  const n = parseInt(valor, 10);
  return Number.isInteger(n) ? n : NaN;
};

/**
 * Lee y valida los parámetros de un listado.
 *
 * @param {import("express").Request} req
 * @param {object} opciones
 * @param {number[]} [opciones.porPagina] tamaños de página permitidos
 * @param {number} [opciones.tamDefecto] tamaño de página por defecto
 * @param {Object<string, any>} [opciones.orden] clave pública → expresión de orden Sequelize
 * @param {{campo: string, dir: "asc"|"desc"}} [opciones.ordenDefecto]
 * @param {Object<string, Function>} [opciones.filtros] clave → validador (Fase 4)
 */
export function leerListado(req, {
  porPagina = [10, 25, 50, 100],
  tamDefecto = 25,
  orden = {},
  ordenDefecto = { campo: Object.keys(orden)[0], dir: "desc" },
  filtros = {},
} = {}) {
  const q = String(req.query.q ?? "").trim().slice(0, 60);
  const tam = porPagina.includes(Number(req.query.tam)) ? Number(req.query.tam) : tamDefecto;
  const campo = Object.prototype.hasOwnProperty.call(orden, req.query.orden)
    ? String(req.query.orden)
    : ordenDefecto.campo;
  const dirPedida = String(req.query.dir ?? "").toLowerCase();
  const dir = DIRECCIONES.includes(dirPedida) ? dirPedida : ordenDefecto.dir;
  const pagina = Math.max(1, aEntero(req.query.pagina) || 1);

  // Filtros: cada validador devuelve el valor normalizado o undefined si no aplica.
  const filtrosActivos = {};
  for (const [clave, validar] of Object.entries(filtros)) {
    const valor = validar(req.query[clave]);
    if (valor !== undefined && valor !== null && valor !== "") filtrosActivos[clave] = valor;
  }

  const ruta = (req.baseUrl + req.path).replace(/\/+$/, "") || "/";

  const l = {
    ruta,
    q,
    tam,
    porPagina,
    campo,
    dir,
    pagina,
    ordenDefecto,
    filtros: filtrosActivos,
    params: {
      ...(q ? { q } : {}),
      tam,
      ...(campo !== ordenDefecto.campo ? { orden: campo } : {}),
      ...(dir !== ordenDefecto.dir ? { dir } : {}),
      ...filtrosActivos,
    },
  };

  /** URL actual cambiando algunos parámetros (conserva búsqueda, filtros, orden y tamaño). */
  l.urlCon = (cambios = {}) => {
    const reiniciaPagina = Object.keys(cambios).some((k) => k !== "pagina");
    const params = { ...l.params, ...cambios };
    if (reiniciaPagina && !("pagina" in cambios)) params.pagina = 1;
    const busqueda = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
      busqueda.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    const s = busqueda.toString();
    return s ? `${ruta}?${s}` : ruta;
  };

  return l;
}

/**
 * Cuenta, pagina y carga los registros.
 *
 * Paso 1: solo los ids de la página (con los include 1—1 necesarios para
 * ordenar). Paso 2: los registros completos con todos los include, reordenados
 * en JS según el orden de los ids.
 */
export async function consultarListado(l, {
  modelo,
  pk,
  include = [],
  includeOrden = include,
  where = {},
  orden = {},
}) {
  const expresion = orden[l.campo] ?? orden[l.ordenDefecto.campo];
  const order = [[expresion, l.dir], [pk, "DESC"]];

  const total = await modelo.count({ where, include: includeOrden, distinct: true, col: pk });
  const paginas = Math.max(1, Math.ceil(total / l.tam));
  l.pagina = Math.min(Math.max(1, l.pagina), paginas);
  l.total = total;
  l.paginas = paginas;
  l.inicio = total ? (l.pagina - 1) * l.tam + 1 : 0;
  l.fin = Math.min(l.pagina * l.tam, total);

  let filas = [];
  if (total) {
    const ids = (await modelo.findAll({
      attributes: [pk],
      where,
      include: includeOrden,
      order,
      limit: l.tam,
      offset: (l.pagina - 1) * l.tam,
      raw: true,
    })).map((fila) => fila[pk]);

    if (ids.length) {
      const registros = await modelo.findAll({ where: { [pk]: { [Op.in]: ids } }, include });
      const porId = new Map(registros.map((r) => [String(r[pk]), r]));
      filas = ids.map((id) => porId.get(String(id))).filter(Boolean);
    }
  }

  l.filas = filas;
  return l;
}
