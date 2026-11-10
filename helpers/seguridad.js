// Utilidades de seguridad: tokens de un solo uso, política de contraseñas y límite de intentos.
import crypto from "crypto";

/** Token aleatorio para enlaces de correo. En la BD solo se guarda su hash. */
export const nuevoToken = () => crypto.randomBytes(32).toString("hex");
export const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

/** Contraseña que nadie conoce: para cuentas creadas por invitación. */
export const passwordInutilizable = () => crypto.randomBytes(24).toString("base64url");

/** Devuelve la lista de problemas de una contraseña nueva (vacía si es aceptable). */
export function problemasPassword(password, { usuario } = {}) {
  const p = String(password ?? "");
  const problemas = [];
  if (p.length < 8 || p.length > 72) problemas.push("La contraseña debe tener entre 8 y 72 caracteres");
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(p) || !/\d/.test(p)) problemas.push("La contraseña debe incluir al menos una letra y un número");
  if (usuario && p.toLowerCase() === String(usuario).toLowerCase()) problemas.push("La contraseña no puede ser igual al nombre de usuario");
  return problemas;
}

/**
 * Límite de intentos en memoria (suficiente para una sola instancia del servidor).
 * const limite = crearLimite({ max: 5, ventanaMs: 15 * 60 * 1000 });
 * limite.bloqueado(clave) / limite.fallo(clave) / limite.limpiar(clave)
 */
export function crearLimite({ max, ventanaMs }) {
  const intentos = new Map(); // clave -> { n, vence }
  const vigente = (clave) => {
    const reg = intentos.get(clave);
    if (reg && reg.vence <= Date.now()) { intentos.delete(clave); return null; }
    return reg;
  };
  const limpieza = setInterval(() => { for (const clave of intentos.keys()) vigente(clave); }, ventanaMs);
  limpieza.unref();
  return {
    bloqueado: (clave) => (vigente(clave)?.n ?? 0) >= max,
    minutosRestantes: (clave) => Math.max(1, Math.ceil(((vigente(clave)?.vence ?? Date.now()) - Date.now()) / 60000)),
    fallo: (clave) => {
      const reg = vigente(clave) ?? { n: 0, vence: Date.now() + ventanaMs };
      reg.n += 1;
      intentos.set(clave, reg);
    },
    limpiar: (clave) => intentos.delete(clave),
    reiniciar: () => intentos.clear(),
  };
}
