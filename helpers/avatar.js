// Foto de perfil: el navegador la recorta a 256x256 y la envía como data URL en un campo oculto,
// así no hace falta multipart ni dependencias nuevas. Aquí se valida y se guarda en disco.
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DIR_AVATARES = path.join(__dirname, "..", "public", "uploads", "avatares");
const URL_BASE = "/uploads/avatares/";
const MAX_BYTES = 300 * 1024;

const FIRMAS = [
  { ext: "jpg", mime: "image/jpeg", ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", ok: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", mime: "image/webp", ok: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

async function borrarArchivo(url) {
  if (!url || !url.startsWith(URL_BASE)) return;
  await fs.unlink(path.join(DIR_AVATARES, path.basename(url))).catch(() => {});
}

/**
 * Aplica al usuario la foto recibida del formulario.
 *   fotoData: data URL de la imagen nueva (o vacío si no cambió)
 *   quitar:   true para eliminar la foto actual
 * Lanza Error con un mensaje para el usuario si la imagen no es válida.
 */
export async function aplicarFoto(usuario, { fotoData, quitar }) {
  if (quitar && !fotoData) {
    await borrarArchivo(usuario.foto);
    usuario.foto = null;
    return;
  }
  if (!fotoData) return;

  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(fotoData);
  if (!m) throw new Error("La foto debe ser una imagen JPG, PNG o WebP");
  const datos = Buffer.from(m[2], "base64");
  if (datos.length > MAX_BYTES) throw new Error("La foto es demasiado grande");
  const formato = FIRMAS.find((f) => f.mime === m[1] && f.ok(datos));
  if (!formato) throw new Error("El archivo no es una imagen válida");

  await fs.mkdir(DIR_AVATARES, { recursive: true });
  const nombre = `u${usuario.id}-${crypto.randomBytes(6).toString("hex")}.${formato.ext}`;
  await fs.writeFile(path.join(DIR_AVATARES, nombre), datos);
  await borrarArchivo(usuario.foto);
  usuario.foto = URL_BASE + nombre;
}

export const borrarFoto = (usuario) => borrarArchivo(usuario.foto);
