// Foto de perfil: el navegador la recorta a 256x256 y la envía como data URL en un campo oculto,
// así no hace falta multipart ni dependencias nuevas. Aquí se valida y se guarda en disco.
import path from "path";
import { fileURLToPath } from "url";
import { borrarImagen, guardarImagenDataURL } from "./imagenes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DIR_AVATARES = path.join(process.env.UPLOADS_DIR || path.join(__dirname, "..", "public", "uploads"), "avatares");
const URL_BASE = "/uploads/avatares/";
const MAX_BYTES = 300 * 1024;

const opciones = { dir: DIR_AVATARES, urlBase: URL_BASE, maxBytes: MAX_BYTES };

/**
 * Aplica al usuario la foto recibida del formulario.
 *   fotoData: data URL de la imagen nueva (o vacío si no cambió)
 *   quitar:   true para eliminar la foto actual
 * Lanza Error con un mensaje para el usuario si la imagen no es válida.
 */
export async function aplicarFoto(usuario, { fotoData, quitar }) {
  if (quitar && !fotoData) {
    await borrarImagen(usuario.foto, opciones);
    usuario.foto = null;
    return;
  }
  if (!fotoData) return;

  const nueva = await guardarImagenDataURL(fotoData, { ...opciones, prefijo: `u${usuario.id}` });
  await borrarImagen(usuario.foto, opciones);
  usuario.foto = nueva;
}

/** Prepara el cambio sin borrar la foto anterior hasta confirmar la transacción de BD. */
export async function prepararFoto(usuario, { fotoData, quitar }) {
  const anterior = usuario.foto;
  if (quitar && !fotoData) {
    return { foto: null, confirmar: () => borrarImagen(anterior, opciones), revertir: async () => {} };
  }
  if (!fotoData) return { foto: anterior, confirmar: async () => {}, revertir: async () => {} };
  const nueva = await guardarImagenDataURL(fotoData, { ...opciones, prefijo: `u${usuario.id}` });
  return {
    foto: nueva,
    confirmar: () => borrarImagen(anterior, opciones),
    revertir: () => borrarImagen(nueva, opciones),
  };
}

export const borrarFoto = (usuario) => borrarImagen(usuario.foto, opciones);
