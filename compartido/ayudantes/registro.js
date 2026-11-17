const normalizarError = (error) => {
  if (error instanceof Error) return { nombre: error.name, mensaje: error.message };
  if (error === undefined || error === null) return undefined;
  return String(error);
};

const prioridades = { error: 0, warn: 1, info: 2 };

const nivelMinimo = () => {
  const configurado = String(process.env.LOG_NIVEL || 'info').toLowerCase();
  return Object.hasOwn(prioridades, configurado) ? configurado : 'info';
};

const emitir = (nivel, evento, contexto = {}) => {
  if (prioridades[nivel] > prioridades[nivelMinimo()]) return;
  const datos = Object.fromEntries(Object.entries(contexto).filter(([, valor]) => valor !== undefined));
  for (const clave of ['error', 'detalle']) {
    if (datos[clave] !== undefined) datos[clave] = normalizarError(datos[clave]);
  }
  console[nivel](JSON.stringify({ fecha: new Date().toISOString(), nivel, evento, ...datos }));
};

const registrarArgumentos = (nivel, argumentos) => {
  const [primero, ...resto] = argumentos;
  const evento = typeof primero === 'string' ? primero : 'Evento de aplicación';
  const contexto = {};
  if (primero instanceof Error) contexto.error = primero;
  else if (primero !== undefined && typeof primero !== 'string') contexto.detalle = primero;

  if (resto.length === 1 && resto[0] && typeof resto[0] === 'object' && !(resto[0] instanceof Error)) {
    Object.assign(contexto, resto[0]);
  } else if (resto.length) {
    contexto.detalle = resto.length === 1 ? resto[0] : resto;
    if (resto[0] instanceof Error) {
      contexto.error = resto[0];
      delete contexto.detalle;
    }
  }
  emitir(nivel, evento, contexto);
};

/** Registro estructurado con contexto breve y sin volcar objetos de aplicación completos. */
export const registro = Object.freeze({
  info: (...argumentos) => registrarArgumentos('info', argumentos),
  warn: (...argumentos) => registrarArgumentos('warn', argumentos),
  error: (...argumentos) => registrarArgumentos('error', argumentos),
});
