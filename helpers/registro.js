const normalizarError = (error) => {
  if (error instanceof Error) return { nombre: error.name, mensaje: error.message };
  if (error === undefined || error === null) return undefined;
  return String(error);
};

const emitir = (nivel, evento, contexto = {}) => {
  const datos = Object.fromEntries(Object.entries(contexto).filter(([, valor]) => valor !== undefined));
  if (datos.error !== undefined) datos.error = normalizarError(datos.error);
  console[nivel](JSON.stringify({ fecha: new Date().toISOString(), nivel, evento, ...datos }));
};

/** Registro estructurado con contexto breve y sin volcar objetos de aplicación completos. */
export const registro = Object.freeze({
  info: (evento, contexto) => emitir("info", evento, contexto),
  warn: (evento, contexto) => emitir("warn", evento, contexto),
  error: (evento, contexto) => emitir("error", evento, contexto),
});
