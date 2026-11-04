import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Lote = db.define(
  "Lote",
  {
    id_lte: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    kilos: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
    numero_cajas: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 0 } },
    precio_kilo_salida: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: "lote", timestamps: false },
);

export default Lote;
