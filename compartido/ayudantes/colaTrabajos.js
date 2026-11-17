import { Op } from 'sequelize';
import { Trabajo } from '../../models/index.js';
import { registro } from './registro.js';

const MAX_PENDIENTES = 500;
const MAX_REINTENTOS = 3;
const ESPERAS_REINTENTO_MS = [60_000, 300_000, 900_000];
const procesadores = new Map();
let procesando = false;
let programado = false;
let tareaActual = Promise.resolve();
let temporizador;

export function registrarProcesadorTrabajo(tipo, procesar) {
  if (!tipo || typeof procesar !== 'function') throw new TypeError('El procesador requiere tipo y función.');
  procesadores.set(tipo, procesar);
}

async function reclamarSiguiente() {
  const trabajo = await Trabajo.findOne({
    where: { estado: 'pendiente', proximo_intento: { [Op.lte]: new Date() } },
    order: [['id_trabajo', 'ASC']],
  });
  if (!trabajo) return null;
  await trabajo.update({ estado: 'procesando', actualizado_en: new Date() });
  return trabajo;
}

async function ejecutar(trabajo) {
  const procesador = procesadores.get(trabajo.tipo);
  if (!procesador) {
    await trabajo.update({ estado: 'fallido', ultimo_error: `No hay procesador registrado para ${trabajo.tipo}.` });
    return;
  }

  try {
    const resultado = await procesador(trabajo.carga, {
      guardarCarga: async (carga) => {
        await trabajo.update({ carga, actualizado_en: new Date() });
      },
    });
    if (resultado?.ok === false)
      throw new Error(resultado.error || resultado.mensaje || 'El trabajo no fue confirmado.');
    await trabajo.update({ estado: 'completado', ultimo_error: null, actualizado_en: new Date() });
  } catch (error) {
    const reintentos = trabajo.intentos + 1;
    const terminal = reintentos > MAX_REINTENTOS;
    const proximo = terminal ? null : new Date(Date.now() + ESPERAS_REINTENTO_MS[reintentos - 1]);
    await trabajo.update({
      estado: terminal ? 'fallido' : 'pendiente',
      intentos: Math.min(reintentos, MAX_REINTENTOS),
      proximo_intento: proximo,
      ultimo_error: String(error?.message || error).slice(0, 2000),
      actualizado_en: new Date(),
    });
    registro.error('Falló un trabajo en segundo plano', {
      trabajo: trabajo.tipo,
      id: trabajo.id_trabajo,
      intentos: Math.min(reintentos, MAX_REINTENTOS),
      error,
    });
  }
}

async function procesarPendientes() {
  if (procesando) return tareaActual;
  procesando = true;
  tareaActual = (async () => {
    try {
      while (true) {
        const trabajo = await reclamarSiguiente();
        if (!trabajo) break;
        await ejecutar(trabajo);
      }
    } catch (error) {
      registro.error('No se pudo consultar la cola persistente', { error });
    } finally {
      procesando = false;
    }
  })();
  return tareaActual;
}

function programarProcesamiento() {
  if (procesando || programado) return;
  programado = true;
  tareaActual = new Promise((resolver) => {
    setImmediate(() => {
      programado = false;
      procesarPendientes().then(resolver, resolver);
    });
  });
}

/** Reanuda trabajos interrumpidos y sondea vencimientos en el mismo proceso. */
export async function iniciarColaTrabajos() {
  await Trabajo.update({ estado: 'pendiente', actualizado_en: new Date() }, { where: { estado: 'procesando' } });
  if (!temporizador) {
    temporizador = setInterval(() => void procesarPendientes(), 5_000);
    temporizador.unref?.();
  }
  await procesarPendientes();
}

/** Guarda un trabajo serializable y lo ejecuta en segundo plano. */
export async function encolarTrabajo(tipo, carga) {
  try {
    const pendientes = await Trabajo.count({ where: { estado: { [Op.in]: ['pendiente', 'procesando'] } } });
    if (pendientes >= MAX_PENDIENTES) return false;
    await Trabajo.create({ tipo, carga, estado: 'pendiente', intentos: 0, proximo_intento: new Date() });
    programarProcesamiento();
    return true;
  } catch (error) {
    registro.error('No se pudo guardar un trabajo en segundo plano', { tipo, error });
    return false;
  }
}

/** Espera solo a los trabajos que ya están ejecutándose; los reintentos se conservan en BD. */
export async function esperarColaTrabajos() {
  await tareaActual;
}

export async function detenerColaTrabajos() {
  if (temporizador) clearInterval(temporizador);
  temporizador = undefined;
  await esperarColaTrabajos();
}
