import { registro } from './compartido/ayudantes/registro.js';
import './compartido/config/entorno.js';
import db from './compartido/config/db.js';
import './models/index.js';
import app from './app.js';
import { crearAdministradorInicial, crearTiposIniciales } from './modulos/cuentas/index.js';
import { asegurarEsquema } from './migraciones/ejecutor.js';
import { verificarTransporte } from './compartido/ayudantes/email.js';
import { liberarPedidosVencidos } from './modulos/pedidos/index.js';
import { validarSecretosInicio } from './compartido/config/validacionSecretos.js';
import { detenerColaTrabajos, iniciarColaTrabajos } from './compartido/ayudantes/colaTrabajos.js';
import './compartido/ayudantes/procesadoresTrabajos.js';

const port = process.env.PORT || 2800;
let servidor;
let barridoReservas;

const apagar = (senal) => {
  if (!servidor) return;
  clearInterval(barridoReservas);
  servidor.close(async (error) => {
    if (error) {
      registro.error(`Error al cerrar el servidor tras ${senal}:`, error);
      process.exitCode = 1;
    }
    try {
      await detenerColaTrabajos();
      await db.close();
    } catch (errorDb) {
      registro.error('Error al cerrar la conexión a la base de datos:', errorDb);
      process.exitCode = 1;
    }
  });
};

process.once('SIGINT', () => apagar('SIGINT'));
process.once('SIGTERM', () => apagar('SIGTERM'));

(async () => {
  try {
    const validacion = validarSecretosInicio();
    for (const aviso of validacion.avisos) registro.warn(`Configuración de seguridad: ${aviso}`);
    if (validacion.errores.length)
      throw new Error(`Configuración de seguridad inválida: ${validacion.errores.join(' ')}`);
    await db.authenticate();
    registro.info('Conexión a la base de datos establecida.');

    // BD_SYNC: safe (solo crea lo que falta) | alter | force (borra todo)
    const modo = process.env.BD_SYNC || 'safe';
    if (process.env.NODE_ENV === 'production' && ['alter', 'force'].includes(modo)) {
      throw new Error('BD_SYNC=alter/force está prohibido en producción.');
    }
    await db.sync(modo === 'force' ? { force: true } : modo === 'alter' ? { alter: true } : {});
    registro.info(`Modelos sincronizados (${modo}).`);

    await asegurarEsquema();
    await iniciarColaTrabajos();
    await crearAdministradorInicial();
    await crearTiposIniciales();

    // Diagnóstico del correo: informa sin detener el servidor
    const correo = await verificarTransporte();
    if (correo.configurado && !correo.error) registro.info('Correo configurado');
    else if (correo.error) registro.warn('Gmail rechazó las credenciales', { error: correo.error });
    else registro.warn('Correo no configurado; se usará el simulador');

    barridoReservas = setInterval(() => {
      liberarPedidosVencidos().catch((error) =>
        registro.warn('No se pudieron limpiar reservas vencidas:', error.message),
      );
    }, 60_000);
    barridoReservas.unref();

    servidor = app.listen(port, () => {
      registro.info(`Servidor corriendo en \x1b[36mhttp://localhost:${port}\x1b[0m`);
    });
  } catch (err) {
    registro.error('Error al iniciar:', err);
    process.exit(1);
  }
})();
