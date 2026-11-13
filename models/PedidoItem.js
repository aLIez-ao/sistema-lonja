import { DataTypes } from "sequelize";
import db from "../config/db.js";

const PedidoItem = db.define("PedidoItem", {
  id_ped: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  id_lte: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  kilos: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  precio_kilo: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: "pedido_item", timestamps: false });

export default PedidoItem;
