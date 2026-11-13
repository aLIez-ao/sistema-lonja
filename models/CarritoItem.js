import { DataTypes } from "sequelize";
import db from "../config/db.js";

const CarritoItem = db.define("CarritoItem", {
  id_usuario: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  id_lte: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "carrito_item", timestamps: false });

export default CarritoItem;
