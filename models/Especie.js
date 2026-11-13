import { DataTypes } from "sequelize";
import db from "../config/db.js";

// Las llaves foráneas id_lte, id_tpo e id_cat las agrega models/index.js (asociaciones)
const Especie = db.define(
  "Especie",
  {
    id_epe: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // Copia del catálogo al momento de registrar la especie en el lote
    nombre: { type: DataTypes.STRING(40), allowNull: false },
    imagen: { type: DataTypes.STRING(100), allowNull: true },
  },
  { tableName: "especie", timestamps: false },
);

export default Especie;
