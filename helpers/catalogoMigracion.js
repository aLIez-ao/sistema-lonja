import { col, fn, where as sqlWhere } from 'sequelize';
import { Especie, EspecieCatalogo } from '../models/index.js';

const catalogoPorNombre = (nombre, transaction) =>
  EspecieCatalogo.findOne({
    where: sqlWhere(fn('LOWER', col('nombre')), String(nombre).trim().toLowerCase()),
    transaction,
  });

/** Rellena la ficha maestra a partir de especies existentes; es seguro repetirlo. */
export async function rellenarCatalogoEspecies({ transaction } = {}) {
  const pendientes = await Especie.findAll({ where: { id_cat: null }, transaction });
  if (!pendientes.length) return { creados: 0, asignados: 0 };

  const grupos = new Map();
  for (const especie of pendientes) {
    const clave = String(especie.nombre || '')
      .trim()
      .toLowerCase();
    if (!clave) continue;
    const grupo = grupos.get(clave) || { nombres: new Map(), tipos: new Map(), imagenes: [], filas: [] };
    grupo.nombres.set(especie.nombre, (grupo.nombres.get(especie.nombre) || 0) + 1);
    grupo.tipos.set(especie.id_tpo, (grupo.tipos.get(especie.id_tpo) || 0) + 1);
    if (especie.imagen) grupo.imagenes.push(especie.imagen);
    grupo.filas.push(especie);
    grupos.set(clave, grupo);
  }

  let creados = 0;
  let asignados = 0;
  for (const [clave, grupo] of grupos) {
    const nombre = [...grupo.nombres.entries()].sort((a, b) => b[1] - a[1])[0][0].trim();
    const idTpo = [...grupo.tipos.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (grupo.tipos.size > 1) {
      console.warn(`El nombre "${nombre}" aparece con varios tipos; se usó el más frecuente (${idTpo}).`);
    }

    let catalogo = await catalogoPorNombre(clave, transaction);
    if (!catalogo) {
      catalogo = await EspecieCatalogo.create(
        { nombre, id_tpo: idTpo, imagen: grupo.imagenes[0] || null, activo: true },
        { transaction },
      );
      creados += 1;
    }
    await Especie.update(
      { id_cat: catalogo.id_cat },
      { where: { id_epe: grupo.filas.map((fila) => fila.id_epe) }, transaction },
    );
    asignados += grupo.filas.length;
  }

  if (creados || asignados) console.log(`Catálogo de especies: ${creados} creados, ${asignados} especies vinculadas`);
  return { creados, asignados };
}
