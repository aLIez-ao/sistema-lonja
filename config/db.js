import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const dialect = process.env.BD_DIALEC || "mariadb";

const opciones = {
  dialect,
  logging: false,
  define: { timestamps: false },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
};

if (dialect === "sqlite") {
  // Solo para pruebas locales/automáticas (no soporta la opción timezone)
  opciones.storage = process.env.BD_STORAGE || ":memory:";
} else {
  opciones.host = process.env.BD_HOST;
  opciones.port = process.env.BD_PORT;
  opciones.timezone = process.env.BD_TIMEZONE || "-06:00";
}

const db = new Sequelize(
  process.env.BD_NOMBRE,
  process.env.BD_USUARIO,
  process.env.BD_CLAVE,
  opciones,
);

export default db;
