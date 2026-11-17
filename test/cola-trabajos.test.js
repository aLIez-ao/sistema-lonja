import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, modelos } from './ayuda.js';
import {
  encolarTrabajo,
  esperarColaTrabajos,
  iniciarColaTrabajos,
  registrarProcesadorTrabajo,
} from '../helpers/colaTrabajos.js';

const { Trabajo } = modelos;
let servidor;
const ejecutados = [];

registrarProcesadorTrabajo('prueba', async (carga) => {
  ejecutados.push(carga);
  return { ok: true };
});
registrarProcesadorTrabajo('prueba_falla', async () => {
  throw new Error('error temporal');
});

before(async () => {
  servidor = await arrancar();
});

after(async () => {
  await servidor.cerrar();
});

test('guarda el payload y completa el trabajo persistido en el orden recibido', async () => {
  ejecutados.length = 0;
  assert.equal(await encolarTrabajo('prueba', { orden: 1 }), true);
  assert.equal(await encolarTrabajo('prueba', { orden: 2 }), true);
  await esperarColaTrabajos();

  assert.deepEqual(ejecutados, [{ orden: 1 }, { orden: 2 }]);
  const trabajos = await Trabajo.findAll({ where: { tipo: 'prueba' }, order: [['id_trabajo', 'ASC']] });
  assert.deepEqual(
    trabajos.map((trabajo) => trabajo.estado),
    ['completado', 'completado'],
  );
});

test('guarda el fallo y programa un reintento con espera creciente', async () => {
  assert.equal(await encolarTrabajo('prueba_falla', {}), true);
  await esperarColaTrabajos();

  const trabajo = await Trabajo.findOne({ where: { tipo: 'prueba_falla' } });
  assert.equal(trabajo.estado, 'pendiente');
  assert.equal(trabajo.intentos, 1);
  assert.match(trabajo.ultimo_error, /error temporal/);
  assert.ok(new Date(trabajo.proximo_intento) > new Date());
});

test('al iniciar recupera trabajos que quedaron marcados en proceso', async () => {
  await Trabajo.create({
    tipo: 'prueba',
    carga: { recuperado: true },
    estado: 'procesando',
    intentos: 0,
    proximo_intento: new Date(),
  });
  await iniciarColaTrabajos();
  await esperarColaTrabajos();

  assert.deepEqual(ejecutados.at(-1), { recuperado: true });
  const trabajo = await Trabajo.findOne({
    where: { tipo: 'prueba', estado: 'completado' },
    order: [['id_trabajo', 'DESC']],
  });
  assert.ok(trabajo);
});
