import { DataTypes } from "sequelize";
import db from "../config/db.js";

// Las llaves foráneas id_lte e id_tpo las agrega models/index.js (asociaciones)
const Especie = db.define(
  "Especie",
  {
    id_epe: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(25), allowNull: false },
    imagen: { type: DataTypes.STRING(100), allowNull: true },
  },
  { tableName: "especie", timestamps: false },
);

export default Especie;
