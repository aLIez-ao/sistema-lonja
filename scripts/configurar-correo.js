import { createInterface } from "node:readline";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { enmascararCorreo } from "../helpers/correoUtils.js";

const CLAVES = ["GMAIL_USER", "GMAIL_PASS", "APP_URL"];

/** Google muestra la contraseña de aplicación en bloques con espacios: se guardan sin ellos. */
export const normalizarClave = (clave) => String(clave ?? "").replace(/\s+/g, "");

export function validarConfiguracionCorreo({ usuario, clave, appUrl }) {
  const errores = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(usuario || "").trim())) errores.push("GMAIL_USER debe ser una dirección de correo válida.");
  if (!/^[A-Za-z0-9]{16}$/.test(normalizarClave(clave))) errores.push("GMAIL_PASS debe tener 16 caracteres alfanuméricos (se ignoran los espacios).");
  try {
    const url = new URL(String(appUrl || ""));
    if (!["http:", "https:"].includes(url.protocol) || /\s/.test(String(appUrl))) throw new Error();
  } catch { errores.push("APP_URL debe ser una URL http o https válida, sin espacios."); }
  return errores;
}

/** Reemplaza exclusivamente las claves indicadas; conserva comentarios y el resto del archivo. */
export function actualizarEnv(texto, valores) {
  let salida = String(texto ?? "");
  for (const clave of CLAVES) {
    const prefijo = new RegExp(`^(\\s*(?:export\\s+)?${clave}\\s*=).*?$`, "gm");
    if (prefijo.test(salida)) salida = salida.replace(prefijo, (_match, inicio) => `${inicio}${valores[clave]}`);
    else salida += `${salida && !salida.endsWith("\n") ? "\n" : ""}${clave}=${valores[clave]}\n`;
  }
  return salida;
}

export async function escribirEnv({ rutaEnv = path.resolve(".env"), rutaEjemplo = path.resolve(".env.example"), valores: valoresEntrada }) {
  const valores = { ...valoresEntrada, GMAIL_PASS: normalizarClave(valoresEntrada.GMAIL_PASS) };
  const errores = validarConfiguracionCorreo({ usuario: valores.GMAIL_USER, clave: valores.GMAIL_PASS, appUrl: valores.APP_URL });
  if (errores.length) throw new Error(errores.join(" "));
  let original;
  try { original = await readFile(rutaEnv, "utf8"); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    original = await readFile(rutaEjemplo, "utf8");
  }
  await writeFile(rutaEnv, actualizarEnv(original, valores), { encoding: "utf8", mode: 0o600 });
}

export async function ejecutarAsistente({ input = process.stdin, output = process.stdout, rutaEnv = path.resolve(".env"), rutaEjemplo = path.resolve(".env.example"), args = [], verificar } = {}) {
  const rl = createInterface({ input, output, terminal: Boolean(input.isTTY && output.isTTY) });
  const preguntar = (texto, oculto = false) => new Promise((resolve) => {
    output.write(texto);
    const original = rl._writeToOutput;
    if (oculto) rl._writeToOutput = () => {};
    rl.question("", (respuesta) => { rl._writeToOutput = original; output.write("\n"); resolve(respuesta); });
  });
  try {
    output.write("Configuración de correo de Lonja de Veracruz\n");
    const valores = {
      GMAIL_USER: (await preguntar("GMAIL_USER (correo Gmail): ")).trim(),
      GMAIL_PASS: normalizarClave(await preguntar("GMAIL_PASS (contraseña de aplicación, entrada oculta; puedes pegarla con espacios): ", true)),
      APP_URL: (await preguntar("APP_URL (http/https): ")).trim().replace(/\/$/, ""),
    };
    const errores = validarConfiguracionCorreo({ usuario: valores.GMAIL_USER, clave: valores.GMAIL_PASS, appUrl: valores.APP_URL });
    if (errores.length) { output.write(`${errores.join("\n")}\nNo se modificó el archivo.\n`); return { ok: false, errores }; }
    await escribirEnv({ rutaEnv, rutaEjemplo, valores });
    output.write(`Configuración guardada para ${enmascararCorreo(valores.GMAIL_USER)}. La contraseña no se muestra.\n`);
    if (args.includes("--sin-prueba")) { output.write("Se omitió la prueba de conexión (--sin-prueba).\n"); return { ok: true, probada: false }; }
    const anteriores = Object.fromEntries(CLAVES.map((k) => [k, process.env[k]]));
    Object.assign(process.env, valores);
    try {
      const resultado = await (verificar || (await import("../helpers/email.js")).verificarTransporte)();
      output.write(`${resultado.error || resultado.mensaje}\n`);
      return { ok: !resultado.error, probada: true, resultado };
    } finally {
      for (const clave of CLAVES) anteriores[clave] === undefined ? delete process.env[clave] : process.env[clave] = anteriores[clave];
    }
  } finally { rl.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  ejecutarAsistente({ args: process.argv.slice(2) }).then((r) => { if (!r.ok) process.exitCode = 1; }).catch((error) => {
    console.error(`No se pudo configurar el correo: ${error.message}`);
    process.exitCode = 1;
  });
}
