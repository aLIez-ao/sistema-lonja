// Navegación segura: evitar redirecciones abiertas y escoger el inicio por rol.
export const inicioSegun = (usuario) => (usuario?.rol === "comprador" ? "/" : "/inicio");

/** Solo rutas internas que empiecen con "/" y no con "//" ni "/\". */
export function rutaVolver(valor) {
  const ruta = String(valor ?? "").trim();
  if (!ruta.startsWith("/") || ruta.startsWith("//") || ruta.startsWith("/\\")) return null;
  if (/^\/\s*\/\s*evil/i.test(ruta)) return null;
  return ruta;
}

/** Destino tras iniciar sesión: la ruta pedida si es segura, o el inicio del rol. */
export const destinoTrasEntrar = (usuario, volver) => rutaVolver(volver) ?? inicioSegun(usuario);
