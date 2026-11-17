import db from '../../../compartido/config/db.js';
import { Compra, Comprador, Especie, Lote, Tipo } from '../../../models/index.js';
import { redondea } from '../../../compartido/ayudantes/fechas.js';
import { loteDisponible } from '../../catalogo/index.js';

export async function registrarCompraMostrador({ idLote, codigoComprador, precioFinal }) {
  return db.transaction(async (transaction) => {
    const disponibilidad = await loteDisponible(idLote, { transaction });
    if (disponibilidad.motivo)
      return {
        error:
          {
            no_existe: 'El lote no existe',
            vendido: 'Ese lote ya fue comprado',
            reservado: 'Ese lote está reservado por un pedido en línea y no se puede vender en mostrador',
            reservado_propio: 'Ese lote está reservado por un pedido en línea y no se puede vender en mostrador',
          }[disponibilidad.motivo] || 'El lote no está disponible',
      };
    const lote = await Lote.findByPk(disponibilidad.lote.id_lte, {
      transaction,
      include: [{ model: Especie, as: 'especies', include: [{ model: Tipo, as: 'tipo' }] }],
    });
    const comprador = await Comprador.findByPk(codigoComprador, { transaction });
    if (!comprador) return { error: 'El comprador no existe' };
    const precio = Number(precioFinal);
    const total = redondea(Number(lote.kilos) * precio);
    const nuevaCompra = await Compra.create(
      {
        id_cmp: lote.id_lte,
        codigo_cpr: codigoComprador,
        precio_kilo_final: precio,
        precio_total: total,
      },
      { transaction },
    );
    return { nuevaCompra, lote, comprador };
  });
}
