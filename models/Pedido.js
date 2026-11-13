import { DataTypes } from "sequelize";
import db from "../config/db.js";

export const ESTADOS_PEDIDO = ["pendiente_pago", "pagado", "preparando", "enviado", "entregado", "cancelado", "expirado"];

const Pedido = db.define("Pedido", {
  id_ped: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false },
  codigo_cpr: { type: DataTypes.SMALLINT, allowNull: false },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente_pago", validate: { isIn: [ESTADOS_PEDIDO] } },
  entrega: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [["domicilio", "recoger"]] } },
  id_dir: { type: DataTypes.INTEGER, allowNull: true },
  dir_destinatario: { type: DataTypes.STRING(60), allowNull: true },
  dir_telefono: { type: DataTypes.STRING(20), allowNull: true },
  dir_texto: { type: DataTypes.TEXT, allowNull: true },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  costo_envio: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  pago_metodo: { type: DataTypes.STRING(50), allowNull: true },
  pago_ref: { type: DataTypes.STRING(80), allowNull: true },
  pago_ultimos4: { type: DataTypes.STRING(4), allowNull: true },
  reservado_hasta: { type: DataTypes.DATE, allowNull: true },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_pago: { type: DataTypes.DATE, allowNull: true },
  notas: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: "pedido", timestamps: false });

export default Pedido;
