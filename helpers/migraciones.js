import { registro } from '../compartido/ayudantes/registro.js';
import db from '../compartido/config/db.js';
import { Migracion } from '../models/index.js';
import { migraciones } from '../migraciones/index.js';
import { rellenarCatalogoEspecies } from './catalogoMigracion.js';

export { rellenarCatalogoEspecies };

/** Compatibilidad con la llamada histórica. */
export async function asegurarColumnasUsuario() {
  return asegurarEsquema();
}

/** Aplica en orden las migraciones que aún no aparecen en la tabla de versiones. */
export async function asegurarEsquema() {
  for (const migracion of migraciones) {
    if (await Migracion.findByPk(migracion.id)) continue;
    await db.transaction(async (transaction) => {
      await migracion.up({ transaction });
      await Migracion.create({ id: migracion.id, aplicado_en: new Date() }, { transaction });
    });
    registro.info(`Migración aplicada: ${migracion.id}`);
  }
}

/** Revierte la última migración reversible. El proceso de la aplicación debe estar detenido. */
export async function revertirUltimaMigracion() {
  for (const migracion of [...migraciones].reverse()) {
    if (!(await Migracion.findByPk(migracion.id))) continue;
    if (!migracion.down) throw new Error(`La migración ${migracion.id} no tiene una reversión definida.`);
    await db.transaction(async (transaction) => {
      await migracion.down({ transaction });
      await Migracion.destroy({ where: { id: migracion.id }, transaction });
    });
    return migracion.id;
  }
  return null;
}
