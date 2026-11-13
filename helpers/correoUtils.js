/** Enmascara la parte local del correo para mostrar solo una referencia segura. */
export function enmascararCorreo(correo) {
  const [local, dominio] = String(correo || "").split("@");
  if (!dominio) return "—";
  const visibles = local.slice(0, 2);
  return `${visibles}${"*".repeat(Math.max(2, local.length - 2))}@${dominio}`;
}
