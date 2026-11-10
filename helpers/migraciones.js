import db from "../config/db.js";
import { DataTypes } from "sequelize";

// Columnas agregadas a "usuario" después de la primera versión. Con BD_SYNC=safe, sync() no
// altera tablas existentes, así que aquí se crean las que falten.
const COLUMNAS_USUARIO = {
  correo: { type: DataTypes.STRING(80), allowNull: true, unique: true },
  email_verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  token_verificacion: { type: DataTypes.STRING(100), allowNull: true },
  token_verificacion_expira: { type: DataTypes.DATE, allowNull: true },
  token_recuperacion: { type: DataTypes.STRING(100), allowNull: true },
  token_recuperacion_expira: { type: DataTypes.DATE, allowNull: true },
  preferencias: { type: DataTypes.TEXT, allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  puesto: { type: DataTypes.STRING(60), allowNull: true },
  foto: { type: DataTypes.STRING(120), allowNull: true },
  sesion_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
};

export async function asegurarColumnasUsuario() {
  try {
    const qi = db.getQueryInterface();
    const actuales = await qi.describeTable("usuario");
    for (const [nombre, definicion] of Object.entries(COLUMNAS_USUARIO)) {
      if (actuales[nombre]) continue;
      await qi.addColumn("usuario", nombre, definicion);
      console.log(`Columna '${nombre}' agregada a la tabla usuario`);
    }
  } catch (err) {
    console.warn("Aviso en asegurarColumnasUsuario:", err.message);
  }
}
