import db from "../config/db.js";
import { DataTypes } from "sequelize";

export async function asegurarColumnasUsuario() {
  try {
    const qi = db.getQueryInterface();
    const descripcion = await qi.describeTable("usuario");

    if (!descripcion.correo) {
      await qi.addColumn("usuario", "correo", {
        type: DataTypes.STRING(80),
        allowNull: true,
        unique: true,
      });
      console.log("Columna 'correo' agregada a tabla usuario");
    }

    if (!descripcion.email_verificado) {
      await qi.addColumn("usuario", "email_verificado", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log("Columna 'email_verificado' agregada a tabla usuario");
    }

    if (!descripcion.token_verificacion) {
      await qi.addColumn("usuario", "token_verificacion", {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
      console.log("Columna 'token_verificacion' agregada a tabla usuario");
    }

    if (!descripcion.token_recuperacion) {
      await qi.addColumn("usuario", "token_recuperacion", {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
      console.log("Columna 'token_recuperacion' agregada a tabla usuario");
    }

    if (!descripcion.token_recuperacion_expira) {
      await qi.addColumn("usuario", "token_recuperacion_expira", {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log("Columna 'token_recuperacion_expira' agregada a tabla usuario");
    }

    if (!descripcion.preferencias) {
      await qi.addColumn("usuario", "preferencias", {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log("Columna 'preferencias' agregada a tabla usuario");
    }
  } catch (err) {
    console.warn("Aviso en asegurarColumnasUsuario:", err.message);
  }
}
