import { DataTypes } from 'sequelize';
import { asegurarAncho, asegurarColumna } from '../helpers/esquema.js';
import { rellenarCatalogoEspecies } from '../helpers/catalogoMigracion.js';

const COLUMNAS_USUARIO = {
  correo: { type: DataTypes.STRING(80), allowNull: true, unique: true },
  email_verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  recibir_avisos: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  token_verificacion: { type: DataTypes.STRING(100), allowNull: true },
  token_verificacion_expira: { type: DataTypes.DATE, allowNull: true },
  token_verificacion_envio: { type: DataTypes.DATE, allowNull: true },
  token_recuperacion: { type: DataTypes.STRING(100), allowNull: true },
  token_recuperacion_expira: { type: DataTypes.DATE, allowNull: true },
  preferencias: { type: DataTypes.TEXT, allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  puesto: { type: DataTypes.STRING(60), allowNull: true },
  foto: { type: DataTypes.STRING(120), allowNull: true },
  sesion_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  codigo_cpr: { type: DataTypes.SMALLINT, allowNull: true, unique: true },
  rfc: { type: DataTypes.STRING(13), allowNull: true },
  razon_social: { type: DataTypes.STRING(100), allowNull: true },
};

/** Actualiza instalaciones históricas. No se puede revertir sin riesgo de pérdida de datos. */
export async function up({ transaction }) {
  for (const [nombre, definicion] of Object.entries(COLUMNAS_USUARIO)) {
    await asegurarColumna('usuario', nombre, definicion, transaction);
  }

  await asegurarColumna(
    'especie',
    'id_cat',
    {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'catalogo_especie', key: 'id_cat' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    transaction,
  );
  await asegurarAncho('especie', 'nombre', 40, transaction);
  await asegurarAncho('comprador', 'nombre', 40, transaction);
  await asegurarAncho('comprador', 'apellido_paterno', 40, transaction);
  await asegurarAncho('comprador', 'apellido_materno', 40, transaction);

  await asegurarColumna(
    'compra',
    'id_ped',
    {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'pedido', key: 'id_ped' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    transaction,
  );

  await rellenarCatalogoEspecies({ transaction });
}

export default { id: '001_esquema_actual', up };
