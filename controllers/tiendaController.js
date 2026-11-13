// Tienda pública: portada, detalle de lote, ficha de especie y sugerencias.
// Solo se consultan lotes sin compra y especies activas; ningún dato de
// compradores (nombres, correos o montos) sale por estas rutas.
import { Op, fn, col, literal, where as sqlWhere } from "sequelize";
import { Lote, Especie, EspecieCatalogo, Tipo, Compra } from "../models/index.js";
import { leerListado, consultarListado, combinarWhere } from "../helpers/listado.js";
import { filtroEntero, filtroNumero } from "../helpers/filtros.js";
import { textoBusqueda } from "../helpers/busqueda.js";
import { rangoDelDia, hoy, dinero } from "../helpers/fechas.js";
import { crearLimite } from "../helpers/seguridad.js";
import { prepararLote, imagenDeEspecie, precioMinimo } from "../helpers/tienda.js";

// 30 sugerencias por minuto y por IP (se reinicia en las pruebas).
export const limiteSugerencias = crearLimite({ max: 30, ventanaMs: 60 * 1000 });

const INCLUDE_ESPECIES = [
  {
    model: Especie,
    as: "especies",
    include: [
      { model: Tipo, as: "tipo" },
      { model: EspecieCatalogo, as: "catalogo", attributes: ["id_cat", "descripcion", "imagen"] },
    ],
  },
];

/** Lote sin compra registrada. */
const sinCompra = () =>
  sqlWhere(literal("(SELECT COUNT(*) FROM compra WHERE compra.id_cmp = `Lote`.`id_lte`)"), {
    [Op.eq]: 0,
  });

/** Lote que tiene al menos una especie capturada. */
const conEspecies = () =>
  sqlWhere(literal("(SELECT COUNT(*) FROM especie WHERE especie.id_lte = `Lote`.`id_lte`)"), {
    [Op.gt]: 0,
  });

const disponible = () => combinarWhere(sinCompra(), conEspecies());

/** Lotes disponibles con sus especies, ordenados y limitados. */
async function lotesDisponibles(where = {}, order = [["fecha", "DESC"]], limit = 8, hoyInicio = null) {
  const filas = await Lote.findAll({
    where: combinarWhere(disponible(), where),
    include: INCLUDE_ESPECIES,
    order,
    limit,
  });
  const preparados = filas.map((l) => prepararLote(l, { hoyInicio }));
  const min = precioMinimo(preparados);
  return preparados.map((l) => prepararLote(l, { hoyInicio, minPrecio: min }));
}

/** Ids de lotes que tienen alguna especie con la condición indicada. */
async function idsDeLotesConEspecie(where) {
  const filas = await Especie.findAll({ attributes: ["id_lte"], where, raw: true });
  return [...new Set(filas.map((f) => f.id_lte))];
}

/** Condición de búsqueda pública: número de lote o nombre de especie. */
async function condicionBusquedaPublica(q) {
  if (!q) return {};
  const ids = await idsDeLotesConEspecie(
    sqlWhere(fn("INSTR", fn("LOWER", col("nombre")), q.toLowerCase()), { [Op.gt]: 0 }),
  );
  const numero = Number(q);
  if (Number.isInteger(numero) && numero > 0) ids.push(numero);
  return { id_lte: { [Op.in]: [...new Set(ids)] } };
}

/** Where de la cuadrícula según búsqueda, categoría, especie, precio y kilos. */
async function whereDeFiltros(l) {
  const conds = [disponible()];

  if (l.q) conds.push(await condicionBusquedaPublica(l.q));

  if (l.filtros.tipo) {
    conds.push({ id_lte: { [Op.in]: await idsDeLotesConEspecie({ id_tpo: l.filtros.tipo }) } });
  }
  if (l.filtros.especie) {
    conds.push({ id_lte: { [Op.in]: await idsDeLotesConEspecie({ id_cat: l.filtros.especie }) } });
  }
  if (l.filtros.precioMin !== undefined) {
    conds.push({ precio_kilo_salida: { [Op.gte]: l.filtros.precioMin } });
  }
  if (l.filtros.precioMax !== undefined) {
    conds.push({ precio_kilo_salida: { [Op.lte]: l.filtros.precioMax } });
  }
  if (l.filtros.kilosMin !== undefined) {
    conds.push({ kilos: { [Op.gte]: l.filtros.kilosMin } });
  }

  return combinarWhere(...conds);
}

const ORDEN_PORTADA = {
  nuevos: "fecha",
  precio: "precio_kilo_salida",
  total: literal("(kilos * precio_kilo_salida)"),
  kilos: "kilos",
};

/** GET / — portada pública de la tienda. */
export const portada = async (req, res) => {
  const inicioHoy = rangoDelDia(hoy()).inicio;
  const l = leerListado(req, {
    porPagina: [24],
    tamDefecto: 24,
    orden: ORDEN_PORTADA,
    ordenDefecto: { campo: "nuevos", dir: "desc" },
    filtros: {
      tipo: filtroEntero,
      especie: filtroEntero,
      precioMin: filtroNumero,
      precioMax: filtroNumero,
      kilosMin: filtroNumero,
    },
  });

  const where = await whereDeFiltros(l);
  await consultarListado(l, {
    modelo: Lote,
    pk: "id_lte",
    include: INCLUDE_ESPECIES,
    includeOrden: [],
    where,
    orden: ORDEN_PORTADA,
  });

  const min = precioMinimo(l.filas.map((f) => ({ precio_kilo_salida: f.precio_kilo_salida })));
  l.filas = l.filas.map((f) => prepararLote(f, { hoyInicio: inicioHoy, minPrecio: min }));

  const [recien, baratos, grandes, pequenos, tipos, catalogo, totalDisponibles] = await Promise.all([
    lotesDisponibles({ fecha: { [Op.gte]: inicioHoy } }, [["fecha", "DESC"]], 8, inicioHoy),
    lotesDisponibles({}, [["precio_kilo_salida", "ASC"]], 8, inicioHoy),
    lotesDisponibles({}, [["kilos", "DESC"]], 8, inicioHoy),
    lotesDisponibles({}, [["kilos", "ASC"]], 8, inicioHoy),
    Tipo.findAll({ order: [["id_tpo", "ASC"]] }),
    EspecieCatalogo.findAll({
      where: { activo: true },
      attributes: ["id_cat", "nombre"],
      order: [["nombre", "ASC"]],
    }),
    Lote.count({ where: disponible() }),
  ]);

  // Contador por categoría (lotes distintos, no especies).
  const idsDisponibles = await Lote.findAll({
    attributes: ["id_lte"],
    where: disponible(),
    raw: true,
  });
  const pares = await Especie.findAll({
    attributes: ["id_lte", "id_tpo"],
    where: { id_lte: { [Op.in]: idsDisponibles.map((d) => d.id_lte) } },
    raw: true,
  });
  const porTipo = new Map();
  for (const par of pares) {
    if (!porTipo.has(par.id_tpo)) porTipo.set(par.id_tpo, new Set());
    porTipo.get(par.id_tpo).add(par.id_lte);
  }
  const categorias = tipos.map((tp) => ({
    ...tp.get({ plain: true }),
    total: porTipo.get(tp.id_tpo)?.size || 0,
  }));

  // Héroe: hasta 4 destacados de hoy; si faltan, los de mejor precio.
  const vistos = new Set();
  const destacados = [...recien, ...baratos]
    .filter((lote) => {
      if (vistos.has(lote.id_lte)) return false;
      vistos.add(lote.id_lte);
      return true;
    })
    .slice(0, 4);

  res.render("tienda/index", {
    l,
    categorias,
    catalogo,
    recien,
    baratos,
    grandes,
    pequenos,
    destacados,
    totalDisponibles,
    categoriaActiva: l.filtros.tipo || null,
    hayFiltros: Boolean(l.q || Object.keys(l.filtros).length),
    mensaje: req.query.mensaje || null,
  });
};

/** GET /tienda/lote/:id — detalle público de un lote. */
export const detalleLote = async (req, res) => {
  const id = filtroEntero(req.params.id);
  const lote = id
    ? await Lote.findByPk(id, {
        include: [
          ...INCLUDE_ESPECIES,
          // Sin include de Comprador: la tienda nunca lee datos del comprador.
          { model: Compra, as: "compra", attributes: ["id_cmp"] },
        ],
      })
    : null;

  if (!lote) {
    return res.status(404).render("error", {
      codigo: 404,
      mensaje: "Este lote no existe o ya no está disponible.",
      accion: { texto: "Volver a la tienda", url: "/" },
    });
  }

  const hoyInicio = rangoDelDia(hoy()).inicio;
  const plano = prepararLote(lote, { hoyInicio });
  plano.vendido = Boolean(lote.compra);

  // Lotes parecidos: misma especie y todavía disponibles (solo si el lote se vendió).
  let parecidos = [];
  if (plano.vendido) {
    const nombres = plano.especies.map((e) => e.nombre);
    const ids = nombres.length
      ? await idsDeLotesConEspecie({ nombre: { [Op.in]: nombres } })
      : [];
    parecidos = (await lotesDisponibles({ id_lte: { [Op.in]: ids.filter((x) => x !== plano.id_lte) } }, [["fecha", "DESC"]], 4, hoyInicio));
  }

  res.render("tienda/lote", { lote: plano, parecidos, preguntas: [] });
};

/** GET /tienda/especie/:id — ficha pública de una especie del catálogo. */
export const fichaEspecie = async (req, res) => {
  const id = filtroEntero(req.params.id);
  const catalogo = id
    ? await EspecieCatalogo.findByPk(id, {
        include: [{ model: Tipo, as: "tipo" }],
      })
    : null;
  if (!catalogo) {
    return res.status(404).render("error", {
      codigo: 404,
      mensaje: "No encontramos esa especie.",
      accion: { texto: "Volver a la tienda", url: "/" },
    });
  }

  const nombre = catalogo.nombre;
  const tipo = catalogo.tipo;
  const descripcion = catalogo.descripcion || "";
  const imagen = catalogo.imagen || imagenDeEspecie({ nombre, tipo });
  const ids = await idsDeLotesConEspecie({ id_cat: catalogo.id_cat });
  const hoyInicio = rangoDelDia(hoy()).inicio;
  const lotes = await lotesDisponibles(
    { id_lte: { [Op.in]: ids } },
    [["fecha", "DESC"]],
    24,
    hoyInicio,
  );

  // Una especie retirada del catálogo solo conserva página pública mientras
  // tenga lotes activos disponibles para consultar.
  if (!catalogo.activo && lotes.length === 0) {
    return res.status(404).render("error", {
      codigo: 404,
      mensaje: "No encontramos esa especie.",
      accion: { texto: "Volver a la tienda", url: "/" },
    });
  }

  res.render("tienda/especie", {
    especie: {
      id: catalogo.id_cat,
      nombre,
      tipo: tipo?.nombre || "",
      descripcion,
      imagen,
    },
    lotes,
    // Las opiniones y la distribución de estrellas llegan en la Fase 5.
    resumenOpiniones: { total: 0, media: 0, distribucion: [0, 0, 0, 0, 0] },
    opiniones: [],
  });
};

/** GET /tienda/sugerencias?q=… — sugerencias públicas del buscador. */
export const sugerencias = async (req, res) => {
  if (limiteSugerencias.bloqueado(req.ip)) {
    return res.status(429).json({ error: "Demasiadas sugerencias. Espera un momento." });
  }
  limiteSugerencias.fallo(req.ip);

  const q = textoBusqueda(req.query.q);
  if (!q) return res.json([]);

  const where = await whereDeFiltros({ q, filtros: {} });
  const filas = await Lote.findAll({
    where,
    include: INCLUDE_ESPECIES,
    order: [["fecha", "DESC"]],
    limit: 8,
  });

  res.json(
    filas.map((l) => {
      const lote = prepararLote(l);
      return {
        id: lote.id_lte,
        titulo: `Lote #${lote.id_lte}${lote.nombresEspecies ? ` · ${lote.nombresEspecies}` : ""}`,
        subtitulo: `${lote.tipos.join(", ") || "Lote"} · ${Number(lote.kilos).toFixed(2)} kg · ${dinero(lote.precio_kilo_salida)}/kg`,
        url: `/tienda/lote/${lote.id_lte}`,
      };
    }),
  );
};
