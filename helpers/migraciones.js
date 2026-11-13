import db from "../config/db.js";
import { DataTypes, col, fn, where as sqlWhere } from "sequelize";
import { Especie, EspecieCatalogo } from "../models/index.js";

// Columnas agregadas a "usuario" después de la primera versión. Con BD_SYNC=safe, sync() no
// altera tablas existentes, así que aquí se crean las que falten.
const COLUMNAS_USUARIO = {
  correo: { type: DataTypes.STRING(80), allowNull: true, unique: true },
  email_verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  token_verificacion: { type: DataTypes.STRING(100), allowNull: true },
  token_verificacion_expira: { type: DataTypes.DATE, allowNull: true },
  token_verificacion_envio: { type: DataTypes.DATE, allowNull: true },
  token_recuperacion: { type: DataTypes.STRING(100), allowNull: true },
  token_recuperacion_expira: { type: DataTypes.DATE, allowNull: true },
  preferencias: { type: DataTypes.TEXT, allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  puesto: { type: DataTypes.STRING(60), allowNull: true },
  foto: { type: DataTypes.STRING(120), allowNull: true },
  sesion_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
};

/** Agrega la columna si falta; no falla si la tabla no existe todavía. */
export async function asegurarColumna(tabla, nombre, definicion) {
  try {
    const qi = db.getQueryInterface();
    const actuales = await qi.describeTable(tabla);
    if (actuales[nombre]) return false;
    await qi.addColumn(tabla, nombre, definicion);
    console.log(`Columna '${nombre}' agregada a la tabla ${tabla}`);
    return true;
  } catch (err) {
    console.warn(`Aviso al agregar ${tabla}.${nombre}:`, err.message);
    return false;
  }
}

/** Ensancha una columna si su longitud actual es menor que la pedida. No recorta nunca. */
export async function asegurarAncho(tabla, nombre, longitud) {
  try {
    const qi = db.getQueryInterface();
    const actuales = await qi.describeTable(tabla);
    const col = actuales[nombre];
    if (!col) {
      await qi.addColumn(tabla, nombre, { type: DataTypes.STRING(longitud), allowNull: true });
      console.log(`Columna '${nombre}' agregada a la tabla ${tabla}`);
      return true;
    }
    const tipo = String(col.type || "");
    const m = /\((\d+)\)/.exec(tipo);
    const actual = m ? Number(m[1]) : 255;
    if (actual >= longitud) return false;
    await qi.changeColumn(tabla, nombre, { ...col, type: DataTypes.STRING(longitud) });
    console.log(`Columna '${tabla}.${nombre}' ampliada de ${actual} a ${longitud}`);
    return true;
  } catch (err) {
    console.warn(`Aviso al ampliar ${tabla}.${nombre}:`, err.message);
    return false;
  }
}

/** Compatibilidad con llamadas anteriores. */
export async function asegurarColumnasUsuario() {
  return asegurarEsquema();
}

/** Busca un catálogo por nombre sin distinguir mayúsculas. */
const catalogoPorNombre = (nombre) =>
  EspecieCatalogo.findOne({ where: sqlWhere(fn("LOWER", col("nombre")), String(nombre).trim().toLowerCase()) });

/**
 * Rellena `especie.id_cat` a partir de las especies ya capturadas.
 * Idempotente: si vuelve a ejecutarse no crea catálogos duplicados.
 */
export async function rellenarCatalogoEspecies() {
  const pendientes = await Especie.findAll({ where: { id_cat: null } });
  if (!pendientes.length) return { creados: 0, asignados: 0 };

  // Agrupa por nombre normalizado y elige la capitalización y el tipo más frecuentes.
  const grupos = new Map();
  for (const e of pendientes) {
    const clave = String(e.nombre || "").trim().toLowerCase();
    if (!clave) continue;
    const g = grupos.get(clave) || { nombres: new Map(), tipos: new Map(), imagenes: [], filas: [] };
    g.nombres.set(e.nombre, (g.nombres.get(e.nombre) || 0) + 1);
    g.tipos.set(e.id_tpo, (g.tipos.get(e.id_tpo) || 0) + 1);
    if (e.imagen) g.imagenes.push(e.imagen);
    g.filas.push(e);
    grupos.set(clave, g);
  }

  let creados = 0;
  let asignados = 0;
  for (const [clave, g] of grupos) {
    const nombre = [...g.nombres.entries()].sort((a, b) => b[1] - a[1])[0][0].trim();
    const idTpo = [...g.tipos.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (g.tipos.size > 1) {
      console.warn(`El nombre "${nombre}" aparece con varios tipos; se usó el más frecuente (${idTpo}).`);
    }

    let catalogo = await catalogoPorNombre(clave);
    if (!catalogo) {
      catalogo = await EspecieCatalogo.create({ nombre, id_tpo: idTpo, imagen: g.imagenes[0] || null, activo: true });
      creados += 1;
    }
    await Especie.update({ id_cat: catalogo.id_cat }, { where: { id_epe: g.filas.map((f) => f.id_epe) } });
    asignados += g.filas.length;
  }

  if (creados || asignados) console.log(`Catálogo de especies: ${creados} creados, ${asignados} especies vinculadas`);
  return { creados, asignados };
}

/** Crea/ajusta columnas de tablas existentes. Idempotente: puede ejecutarse en cada arranque. */
export async function asegurarEsquema() {
  for (const [nombre, definicion] of Object.entries(COLUMNAS_USUARIO)) {
    await asegurarColumna("usuario", nombre, definicion);
  }

  // Catálogo de especies (Fase 1)
  await asegurarColumna("especie", "id_cat", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "catalogo_especie", key: "id_cat" },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });
  await asegurarAncho("especie", "nombre", 40);
  await asegurarAncho("comprador", "nombre", 40);
  await asegurarAncho("comprador", "apellido_paterno", 40);
  await asegurarAncho("comprador", "apellido_materno", 40);

  await rellenarCatalogoEspecies();
}
