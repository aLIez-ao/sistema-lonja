import { DataTypes } from "sequelize";
import db from "../config/db.js";

// Direcciones de entrega del comprador. El pedido guarda además una copia de la
// dirección usada para que editarla después no cambie pedidos anteriores.
const DireccionEntrega = db.define(
  "DireccionEntrega",
  {
    id_dir: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    alias: { type: DataTypes.STRING(30), allowNull: false },
    destinatario: { type: DataTypes.STRING(60), allowNull: false },
    telefono: { type: DataTypes.STRING(20), allowNull: false },
    calle: { type: DataTypes.STRING(80), allowNull: false },
    num_ext: { type: DataTypes.STRING(10), allowNull: false },
    num_int: { type: DataTypes.STRING(10), allowNull: true },
    colonia: { type: DataTypes.STRING(60), allowNull: false },
    cp: { type: DataTypes.STRING(5), allowNull: false },
    municipio: { type: DataTypes.STRING(60), allowNull: false },
    estado: { type: DataTypes.STRING(40), allowNull: false },
    referencias: { type: DataTypes.STRING(200), allowNull: true },
    principal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "direccion_entrega",
    timestamps: false,
    indexes: [{ fields: ["id_usuario"], name: "ix_direccion_usuario" }],
  },
);

export default DireccionEntrega;
