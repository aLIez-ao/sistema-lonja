import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Lista = db.define("Lista", {
  id_lista: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(40), allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "lista", timestamps: false, indexes: [{ unique: true, fields: ["id_usuario", "nombre"] }] });

export default Lista;
