import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Pregunta = db.define("Pregunta", {
  id_preg: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false }, id_lte: DataTypes.INTEGER, id_cat: DataTypes.INTEGER,
  texto: { type: DataTypes.STRING(500), allowNull: false }, fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  estado: { type: DataTypes.ENUM("pendiente", "respondida", "oculta"), allowNull: false, defaultValue: "pendiente" },
  respuesta: DataTypes.STRING(500), id_usuario_resp: DataTypes.INTEGER, fecha_resp: DataTypes.DATE,
}, { tableName: "pregunta", timestamps: false });

export default Pregunta;
