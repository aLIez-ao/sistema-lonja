import { DataTypes } from "sequelize";
import db from "../config/db.js";

// Llave primaria compuesta (id_cmp, codigo_cpr), ambas FK, como en el diagrama.
// id_cmp -> lote.id_lte y codigo_cpr -> comprador.codigo_cpr se declaran en models/index.js
// Además id_cmp es UNIQUE: la relación Lote-Compra del diagrama es 1 a 1.
const Compra = db.define(
  "Compra",
  {
    id_cmp: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    codigo_cpr: { type: DataTypes.SMALLINT, primaryKey: true, allowNull: false },
    precio_kilo_final: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
    precio_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "compra",
    timestamps: false,
    indexes: [{ unique: true, fields: ["id_cmp"], name: "uq_compra_lote" }],
  },
);

export default Compra;
