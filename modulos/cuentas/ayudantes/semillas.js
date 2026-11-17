import { registro } from '../../../compartido/ayudantes/registro.js';
import '../../../compartido/config/entorno.js';
import { Tipo, Usuario } from '../../../models/index.js';

/** Crea el administrador inicial (ADMIN_USER / ADMIN_PASSWORD) si no existe. */
export async function crearAdministradorInicial() {
  const { ADMIN_USER, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    registro.warn('No se definieron ADMIN_USER o ADMIN_PASSWORD. Se omite la creación del administrador.');
    return;
  }
  const existe = await Usuario.findOne({ where: { usuario: ADMIN_USER } });
  if (existe) return;
  await Usuario.create({
    usuario: ADMIN_USER,
    nombre_completo: 'Administrador',
    password: ADMIN_PASSWORD, // el hook beforeSave la cifra con bcrypt
    rol: 'admin',
  });
  registro.info(`Usuario administrador inicial creado: ${ADMIN_USER}`);
}

/** Catálogo inicial de tipos si la tabla está vacía. */
export async function crearTiposIniciales() {
  if ((await Tipo.count()) > 0) return;
  await Tipo.bulkCreate([{ nombre: 'Pescado' }, { nombre: 'Marisco' }, { nombre: 'Molusco' }]);
}
