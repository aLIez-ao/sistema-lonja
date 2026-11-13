import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Writable, PassThrough } from "node:stream";
import { actualizarEnv, escribirEnv, validarConfiguracionCorreo, ejecutarAsistente } from "../scripts/configurar-correo.js";

const datos = { GMAIL_USER: "lonja@example.com", GMAIL_PASS: "AbCd1234EfGh5678", APP_URL: "https://lonja.example" };

test("asistente valida correo, clave y URL", () => {
  assert.deepEqual(validarConfiguracionCorreo({ usuario: datos.GMAIL_USER, clave: datos.GMAIL_PASS, appUrl: datos.APP_URL }), []);
  assert.equal(validarConfiguracionCorreo({ ...datos, usuario: "invalido", clave: "con espacios", appUrl: "ftp://lonja.example" }).length, 3);
});

test("actualizarEnv solo reemplaza las tres claves y preserva comentarios y valores restantes", () => {
  const original = "# comentario existente\nPORT=2800\nGMAIL_USER=viejo@example.com\nGMAIL_PASS=viejaClave123456\n# URL local\nAPP_URL=http://localhost:2800\nOTRA=conservar\n";
  const actualizado = actualizarEnv(original, datos);
  assert.match(actualizado, /# comentario existente/); assert.match(actualizado, /# URL local/);
  assert.match(actualizado, /PORT=2800/); assert.match(actualizado, /OTRA=conservar/);
  for (const clave of Object.keys(datos)) assert.equal(actualizado.split("\n").filter((linea) => linea.startsWith(`${clave}=`)).length, 1);
  assert.match(actualizado, /GMAIL_PASS=AbCd1234EfGh5678/);
});

test("escribirEnv inicializa desde la plantilla y no escribe si los valores son inválidos", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lonja-mail-test-"));
  try {
    const env = path.join(dir, ".env"), ejemplo = path.join(dir, ".env.example");
    await writeFile(ejemplo, "PORT=99\n# correo\nGMAIL_USER=plantilla@example.com\nGMAIL_PASS=plantillaClave12345\nAPP_URL=http://localhost:2800\n", "utf8");
    await escribirEnv({ rutaEnv: env, rutaEjemplo: ejemplo, valores: datos });
    const texto = await readFile(env, "utf8");
    assert.match(texto, /PORT=99/); assert.match(texto, /# correo/); assert.match(texto, /GMAIL_USER=lonja@example.com/);
    await assert.rejects(escribirEnv({ rutaEnv: env, rutaEjemplo: ejemplo, valores: { ...datos, GMAIL_PASS: "invalida" } }));
    assert.equal(await readFile(env, "utf8"), texto);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("asistente oculta GMAIL_PASS y enmascara el correo en su resumen", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lonja-mail-prompt-"));
  try {
    const env = path.join(dir, ".env"), ejemplo = path.join(dir, ".env.example");
    await writeFile(ejemplo, "PORT=2800\n", "utf8");
    const entrada = new PassThrough();
    setTimeout(() => entrada.write(`${datos.GMAIL_USER}\n`), 5); setTimeout(() => entrada.write(`${datos.GMAIL_PASS}\n`), 15); setTimeout(() => entrada.write(`${datos.APP_URL}\n`), 25);
    const chunks = []; const salida = new Writable({ write(c, _e, cb) { chunks.push(c); cb(); } });
    const resultado = await ejecutarAsistente({ input: entrada, output: salida, rutaEnv: env, rutaEjemplo: ejemplo, args: ["--sin-prueba"], verificar: async () => ({ mensaje: "no ejecutar" }) });
    const texto = Buffer.concat(chunks).toString("utf8");
    assert.equal(resultado.ok, true); assert.equal(resultado.probada, false);
    assert.equal(texto.includes(datos.GMAIL_PASS), false); assert.equal(texto.includes(datos.GMAIL_USER), false);
    assert.match(texto, /lo\*{3}@example\.com/);
    assert.match(await readFile(env, "utf8"), new RegExp(`GMAIL_PASS=${datos.GMAIL_PASS}`));

    const entradaMala = new PassThrough();
    setTimeout(() => entradaMala.write("mal\n"), 5); setTimeout(() => entradaMala.write(`${datos.GMAIL_PASS}\n`), 15); setTimeout(() => entradaMala.write(`${datos.APP_URL}\n`), 25);
    const chunksMala = []; const salidaMala = new Writable({ write(c, _e, cb) { chunksMala.push(c); cb(); } });
    const invalido = await ejecutarAsistente({ input: entradaMala, output: salidaMala, rutaEnv: env, rutaEjemplo: ejemplo, args: ["--sin-prueba"] });
    assert.equal(invalido.ok, false); assert.equal((await readFile(env, "utf8")).includes("GMAIL_USER=lonja@example.com"), true);
    assert.equal(Buffer.concat(chunksMala).toString("utf8").includes(datos.GMAIL_PASS), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
