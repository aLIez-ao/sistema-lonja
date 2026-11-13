import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import db from "../config/db.js";

// Roles: admin (todo, incluye usuarios y borrados) | capturista (captura y consulta)
// | comprador (tienda en línea; solo se crea desde el registro público).
export const ROLES = ["admin", "capturista", "comprador"];

const Usuario = db.define(
  "Usuario",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuario: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    nombre_completo: { type: DataTypes.STRING(80), allowNull: false },
    correo: {
      type: DataTypes.STRING(80),
      allowNull: true,
      unique: true,
      validate: {
        len: { args: [0, 80], msg: "El correo admite máximo 80 caracteres" },
        isEmailOrEmpty(val) {
          if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            throw new Error("Formato de correo no válido");
          }
        },
      },
    },
    email_verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    token_verificacion: { type: DataTypes.STRING(100), allowNull: true },
    token_recuperacion: { type: DataTypes.STRING(100), allowNull: true },
    token_recuperacion_expira: { type: DataTypes.DATE, allowNull: true },
    token_verificacion_expira: { type: DataTypes.DATE, allowNull: true },
    token_verificacion_envio: { type: DataTypes.DATE, allowNull: true },
    preferencias: { type: DataTypes.TEXT, allowNull: true },
    telefono: { type: DataTypes.STRING(20), allowNull: true },
    puesto: { type: DataTypes.STRING(60), allowNull: true },
    foto: { type: DataTypes.STRING(120), allowNull: true },
    // Se incrementa al cambiar la contraseña: los tokens de sesión anteriores dejan de valer
    sesion_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // Vínculo con el comprador de la lonja (historial de compras). Único por cuenta.
    codigo_cpr: { type: DataTypes.SMALLINT, allowNull: true, unique: true },
    // Datos de facturación opcionales del comprador
    rfc: {
      type: DataTypes.STRING(13),
      allowNull: true,
      validate: {
        rfcValido(val) {
          if (val && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(val)) throw new Error("El RFC no tiene un formato válido");
        },
      },
    },
    razon_social: { type: DataTypes.STRING(100), allowNull: true },
    password: { type: DataTypes.STRING(100), allowNull: false },
    rol: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "capturista", validate: { isIn: [ROLES] } },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "usuario",
    timestamps: false,
    hooks: {
      // Solo se vuelve a cifrar si la contraseña cambió
      beforeSave: async (u) => {
        if (u.changed("password")) {
          u.password = await bcrypt.hash(u.password, 10);
          if (!u.isNewRecord) u.sesion_version = (u.sesion_version || 0) + 1;
        }
        if (u.correo === "") u.correo = null; // el índice único no admite varias cadenas vacías
      },
    },
    scopes: { sinClave: { attributes: { exclude: ["password", "token_recuperacion", "token_verificacion"] } } },
  }
);

Usuario.prototype.verificarClave = function (clave) {
  return bcrypt.compare(clave, this.password);
};

export default Usuario;
