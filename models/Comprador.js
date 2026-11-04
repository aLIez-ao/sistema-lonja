import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Comprador = db.define(
  "Comprador",
  {
    codigo_cpr: { type: DataTypes.SMALLINT, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(15), allowNull: false },
    apellido_paterno: { type: DataTypes.STRING(15), allowNull: false },
    apellido_materno: { type: DataTypes.STRING(15), allowNull: true },
    direccion: { type: DataTypes.STRING(200), allowNull: true },
    correo: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true, // "U" en el diagrama
      validate: { isEmail: true },
    },
  },
  { tableName: "comprador", timestamps: false },
);

export default Comprador;
