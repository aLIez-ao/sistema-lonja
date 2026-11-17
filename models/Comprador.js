import { DataTypes } from 'sequelize';
import db from '../compartido/config/db.js';
import { correoValido } from '../compartido/ayudantes/validacion.js';

const Comprador = db.define(
  'Comprador',
  {
    codigo_cpr: { type: DataTypes.SMALLINT, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(40), allowNull: false },
    apellido_paterno: { type: DataTypes.STRING(40), allowNull: false },
    apellido_materno: { type: DataTypes.STRING(40), allowNull: true },
    direccion: { type: DataTypes.STRING(200), allowNull: true },
    correo: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true, // "U" en el diagrama
      validate: {
        correoValido(valor) {
          if (!correoValido(valor)) throw new Error('Formato de correo no válido');
        },
      },
    },
  },
  { tableName: 'comprador', timestamps: false },
);

export default Comprador;
