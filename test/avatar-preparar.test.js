import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const uploads = await fs.mkdtemp(path.join(os.tmpdir(), "lonja-avatar-test-"));
process.env.UPLOADS_DIR = uploads;
const { DIR_AVATARES, prepararFoto } = await import("../helpers/avatar.js");
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const anteriorUrl = "/uploads/avatares/u7-anterior.png";

before(async () => {
  await fs.mkdir(DIR_AVATARES, { recursive: true });
  await fs.writeFile(path.join(DIR_AVATARES, path.basename(anteriorUrl)), Buffer.from("anterior"));
});
after(async () => fs.rm(uploads, { recursive: true, force: true }));

test("revierte la foto nueva y conserva la anterior si la transacción falla", async () => {
  const preparada = await prepararFoto({ id: 7, foto: anteriorUrl }, { fotoData: png });
  assert.equal(preparada.foto.startsWith("/uploads/avatares/"), true);
  await fs.access(path.join(DIR_AVATARES, path.basename(anteriorUrl)));
  await fs.access(path.join(DIR_AVATARES, path.basename(preparada.foto)));
  await preparada.revertir();
  await fs.access(path.join(DIR_AVATARES, path.basename(anteriorUrl)));
  await assert.rejects(fs.access(path.join(DIR_AVATARES, path.basename(preparada.foto))));
});

test("confirma la foto nueva y limpia la anterior después de guardar", async () => {
  const preparada = await prepararFoto({ id: 7, foto: anteriorUrl }, { fotoData: png });
  await preparada.confirmar();
  await fs.access(path.join(DIR_AVATARES, path.basename(preparada.foto)));
  await assert.rejects(fs.access(path.join(DIR_AVATARES, path.basename(anteriorUrl))));
});
