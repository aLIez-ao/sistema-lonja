import { DataTypes } from 'sequelize';
import db from '../config/db.js';

export const ESTADO_PEDIDO = Object.freeze({
  PENDIENTE_PAGO: 'pendiente_pago',
  PAGADO: 'pagado',
  PREPARANDO: 'preparando',
  ENVIADO: 'enviado',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
  EXPIRADO: 'expirado',
});
export const ESTADOS_PEDIDO = Object.freeze(Object.values(ESTADO_PEDIDO));
export const ETIQUETA_ESTADO_PEDIDO = Object.freeze({
  [ESTADO_PEDIDO.PENDIENTE_PAGO]: 'pendiente de pago',
  [ESTADO_PEDIDO.PAGADO]: 'pagado',
  [ESTADO_PEDIDO.PREPARANDO]: 'preparando',
  [ESTADO_PEDIDO.ENVIADO]: 'enviado',
  [ESTADO_PEDIDO.ENTREGADO]: 'entregado',
  [ESTADO_PEDIDO.CANCELADO]: 'cancelado',
  [ESTADO_PEDIDO.EXPIRADO]: 'expirado',
});
export const METODO_PAGO_PEDIDO = Object.freeze({ EFECTIVO_LONJA: 'Efectivo en lonja' });
export const OPCIONES_PAGO_PEDIDO = Object.freeze({
  TARJETA: 'tarjeta',
  TRANSFERENCIA: 'transferencia',
  EFECTIVO: 'efectivo',
});
export const OPCIONES_PAGO_PEDIDO_VALIDAS = Object.freeze(Object.values(OPCIONES_PAGO_PEDIDO));

const Pedido = db.define(
  'Pedido',
  {
    id_ped: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
    codigo_cpr: { type: DataTypes.SMALLINT, allowNull: false },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: ESTADO_PEDIDO.PENDIENTE_PAGO,
      validate: { isIn: [ESTADOS_PEDIDO] },
    },
    entrega: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['domicilio', 'recoger']] } },
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
  },
  { tableName: 'pedido', timestamps: false, indexes: [{ fields: ['estado', 'reservado_hasta'] }] },
);

export default Pedido;
