import db from "../config/db.js";
import { DataTypes } from "sequelize";

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

/** Crea/ajusta columnas de tablas existentes. Idempotente: puede ejecutarse en cada arranque. */
export async function asegurarEsquema() {
  for (const [nombre, definicion] of Object.entries(COLUMNAS_USUARIO)) {
    await asegurarColumna("usuario", nombre, definicion);
  }
}
