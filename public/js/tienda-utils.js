/** Calcula el índice de tarjeta destino para un salto acotado. */
export function indiceSiguiente(indiceActual, total, paso = 4, direccion = 1) {
  if (!Number.isFinite(total) || total <= 0) return -1;
  const ultimo = Math.floor(total) - 1;
  const actual = Math.max(0, Math.min(ultimo, Math.floor(Number(indiceActual) || 0)));
  const salto = Math.max(1, Math.floor(Number(paso) || 4));
  return Math.max(0, Math.min(ultimo, actual + (direccion < 0 ? -salto : salto)));
}

/** Indica si la pista está en su inicio o en su final real de desplazamiento. */
export function extremosDeFila(scrollLeft, scrollWidth, clientWidth, tolerancia = 2) {
  const maximo = Math.max(0, Number(scrollWidth) - Number(clientWidth));
  const actual = Math.max(0, Number(scrollLeft) || 0);
  return { alInicio: actual <= tolerancia, alFinal: actual >= maximo - tolerancia };
}
