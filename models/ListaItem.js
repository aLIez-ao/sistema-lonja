import { DataTypes } from "sequelize";
import db from "../config/db.js";

const ListaItem = db.define("ListaItem", {
  id_lista: { type: DataTypes.INTEGER, primaryKey: true },
  tipo: { type: DataTypes.ENUM("especie", "lote"), primaryKey: true, allowNull: false },
  id_ref: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "lista_item", timestamps: false });

export default ListaItem;
