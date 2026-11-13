import { DataTypes } from "sequelize";
import db from "../config/db.js";

// Catálogo maestro de especies. Las filas de "especie" guardan una copia de
// nombre/tipo/imagen para que editar el catálogo no altere facturas históricas.
const EspecieCatalogo = db.define(
  "EspecieCatalogo",
  {
    id_cat: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(40), allowNull: false },
    imagen: { type: DataTypes.STRING(100), allowNull: true },
    descripcion: { type: DataTypes.STRING(300), allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "catalogo_especie",
    timestamps: false,
    indexes: [{ unique: true, fields: ["nombre"], name: "uq_catalogo_nombre" }],
  },
);

export default EspecieCatalogo;
