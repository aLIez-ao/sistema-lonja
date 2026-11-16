const MAX_PENDIENTES = 500;
const cola = [];
const esperas = [];
let procesando = false;

function resolverEsperas() {
  if (procesando || cola.length) return;
  while (esperas.length) esperas.shift()();
}

function iniciar() {
  if (procesando || !cola.length) return;
  procesando = true;
  setImmediate(async () => {
    while (cola.length) {
      const trabajo = cola.shift();
      try { await trabajo.ejecutar(); }
      catch (error) { console.warn(`Falló el trabajo en segundo plano (${trabajo.nombre}):`, error.message); }
    }
    procesando = false;
    resolverEsperas();
    if (cola.length) iniciar();
  });
}

/** Encola trabajo no crítico para liberar la respuesta HTTP; la cola es volátil y acotada. */
export function encolarTrabajo(nombre, ejecutar) {
  if (cola.length >= MAX_PENDIENTES) return false;
  cola.push({ nombre: String(nombre), ejecutar });
  iniciar();
  return true;
}

/** Espera la cola para apagado ordenado y pruebas. */
export function esperarColaTrabajos() {
  if (!procesando && !cola.length) return Promise.resolve();
  return new Promise((resolve) => esperas.push(resolve));
}
