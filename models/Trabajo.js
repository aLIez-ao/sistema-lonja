import { DataTypes } from 'sequelize';
import db from '../compartido/config/db.js';

const Trabajo = db.define(
  'Trabajo',
  {
    id_trabajo: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    tipo: { type: DataTypes.STRING(80), allowNull: false },
    carga: { type: DataTypes.JSON, allowNull: false },
    estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
    intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    proximo_intento: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ultimo_error: { type: DataTypes.TEXT, allowNull: true },
    creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'trabajo',
    timestamps: false,
    indexes: [{ fields: ['estado', 'proximo_intento'], name: 'ix_trabajo_pendiente' }],
  },
);

export default Trabajo;
