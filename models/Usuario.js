import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import db from "../config/db.js";

// Personal autorizado a entrar al sistema (no es el "comprador" de la lonja).
// Roles: admin (todo, incluye usuarios y borrados) | capturista (captura y consulta)
export const ROLES = ["admin", "capturista"];

const Usuario = db.define(
  "Usuario",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuario: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    nombre_completo: { type: DataTypes.STRING(80), allowNull: false },
    password: { type: DataTypes.STRING(100), allowNull: false },
    rol: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "capturista", validate: { isIn: [ROLES] } },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "usuario",
    timestamps: false,
    hooks: {
      // Solo se vuelve a cifrar si la contraseña cambió (el ejemplo la recifraba en cada update)
      beforeSave: async (u) => {
        if (u.changed("password")) u.password = await bcrypt.hash(u.password, 10);
      },
    },
    scopes: { sinClave: { attributes: { exclude: ["password"] } } },
  },
);

Usuario.prototype.verificarClave = function (clave) {
  return bcrypt.compare(clave, this.password);
};

export default Usuario;
