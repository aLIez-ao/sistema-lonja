// Guardado de imágenes subidas como data URL (fotos de perfil y del catálogo).
// El navegador reduce la imagen antes de enviarla; aquí se valida la firma real
// del archivo y se escribe en la carpeta pública correspondiente.
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const FIRMAS = [
  { ext: "jpg", mime: "image/jpeg", ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", ok: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", mime: "image/webp", ok: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

/** Borra una imagen solo si pertenece a la carpeta indicada (nunca rutas externas). */
export async function borrarImagen(url, { dir, urlBase }) {
  if (!url || !url.startsWith(urlBase)) return;
  await fs.unlink(path.join(dir, path.basename(url))).catch(() => {});
}

/**
 * Valida y guarda una imagen recibida como data URL.
 * Devuelve la URL pública; lanza Error con un mensaje para el usuario si no es válida.
 */
export async function guardarImagenDataURL(dataUrl, {
  dir,
  urlBase,
  prefijo = "img",
  maxBytes = 300 * 1024,
} = {}) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) throw new Error("La imagen debe ser un archivo JPG, PNG o WebP");
  const datos = Buffer.from(m[2], "base64");
  if (datos.length > maxBytes) throw new Error("La imagen es demasiado grande");
  const formato = FIRMAS.find((f) => f.mime === m[1] && f.ok(datos));
  if (!formato) throw new Error("El archivo no es una imagen válida");

  await fs.mkdir(dir, { recursive: true });
  const nombre = `${prefijo}-${crypto.randomBytes(6).toString("hex")}.${formato.ext}`;
  await fs.writeFile(path.join(dir, nombre), datos);
  return urlBase + nombre;
}
