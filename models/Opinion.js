import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Opinion = db.define("Opinion", {
  id_op: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false }, id_cat: { type: DataTypes.INTEGER, allowNull: false },
  estrellas: { type: DataTypes.INTEGER, allowNull: false }, titulo: { type: DataTypes.STRING(80), allowNull: false },
  texto: { type: DataTypes.STRING(1000), allowNull: false }, fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "opinion", timestamps: false, indexes: [{ unique: true, fields: ["id_usuario", "id_cat"] }] });

export default Opinion;
