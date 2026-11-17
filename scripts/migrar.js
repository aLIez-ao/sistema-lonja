import '../compartido/config/entorno.js';
import db from '../compartido/config/db.js';
import { asegurarEsquema, revertirUltimaMigracion } from '../helpers/migraciones.js';

const argumentos = new Set(process.argv.slice(2));
const revertir = argumentos.has('--revertir');
const aplicar = argumentos.has('--aplicar');

try {
  if (revertir && !argumentos.has('--confirmar')) {
    throw new Error('La reversión requiere confirmación: npm run migrar:revertir -- --confirmar');
  }
  if (revertir === aplicar) {
    throw new Error('Indica una sola operación: --aplicar o --revertir --confirmar.');
  }

  await db.authenticate();
  await db.sync();
  if (revertir) {
    const id = await revertirUltimaMigracion();
    console.log(id ? `Migración revertida: ${id}` : 'No hay migraciones para revertir.');
  } else {
    await asegurarEsquema();
    console.log('Migraciones pendientes aplicadas.');
  }
} catch (error) {
  console.error(`No se pudieron gestionar las migraciones: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
