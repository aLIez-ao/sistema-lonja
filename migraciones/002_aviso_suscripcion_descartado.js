import { DataTypes } from 'sequelize';
import db from '../compartido/config/db.js';
import { asegurarColumna } from './esquema.js';

export async function up({ transaction }) {
  await asegurarColumna(
    'usuario',
    'aviso_suscripcion_descartado',
    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    transaction,
  );
}

export async function down({ transaction }) {
  const qi = db.getQueryInterface();
  if ((await qi.describeTable('usuario', { transaction })).aviso_suscripcion_descartado) {
    await qi.removeColumn('usuario', 'aviso_suscripcion_descartado', { transaction });
  }
}

export default { id: '002_aviso_suscripcion_descartado', up, down };
