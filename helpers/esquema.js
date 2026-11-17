import db from '../config/db.js';
import { DataTypes } from 'sequelize';

/** Agrega una columna solo si falta; los fallos detienen la migración. */
export async function asegurarColumna(tabla, nombre, definicion, transaction) {
  const qi = db.getQueryInterface();
  const actuales = await qi.describeTable(tabla, { transaction });
  if (actuales[nombre]) return false;
  await qi.addColumn(tabla, nombre, definicion, { transaction });
  console.log(`Columna '${nombre}' agregada a la tabla ${tabla}`);
  return true;
}

/** Ensancha una columna si hace falta. Nunca reduce su tamaño ni trunca datos. */
export async function asegurarAncho(tabla, nombre, longitud, transaction) {
  const qi = db.getQueryInterface();
  const actuales = await qi.describeTable(tabla, { transaction });
  const columna = actuales[nombre];
  if (!columna) {
    await qi.addColumn(tabla, nombre, { type: DataTypes.STRING(longitud), allowNull: true }, { transaction });
    console.log(`Columna '${nombre}' agregada a la tabla ${tabla}`);
    return true;
  }
  const tipo = String(columna.type || '');
  const coincidencia = /\((\d+)\)/.exec(tipo);
  const actual = coincidencia ? Number(coincidencia[1]) : 255;
  if (actual >= longitud) return false;
  const definicion = { type: DataTypes.STRING(longitud), allowNull: columna.allowNull };
  if (columna.defaultValue !== null && columna.defaultValue !== undefined) {
    definicion.defaultValue = columna.defaultValue;
  }
  await qi.changeColumn(tabla, nombre, definicion, { transaction });
  console.log(`Columna '${tabla}.${nombre}' ampliada de ${actual} a ${longitud}`);
  return true;
}
