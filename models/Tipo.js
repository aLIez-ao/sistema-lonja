import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Tipo = db.define(
  "Tipo",
  {
    id_tpo: { type: DataTypes.SMALLINT, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(30), allowNull: false },
  },
  { tableName: "tipo", timestamps: false },
);

export default Tipo;
