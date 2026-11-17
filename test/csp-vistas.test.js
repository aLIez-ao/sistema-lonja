import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const raiz = path.resolve('views');

async function archivosEjs(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const grupos = await Promise.all(
    entradas.map(async (entrada) => {
      const ruta = path.join(directorio, entrada.name);
      if (entrada.isDirectory()) return archivosEjs(ruta);
      return entrada.isFile() && entrada.name.endsWith('.ejs') ? [ruta] : [];
    }),
  );
  return grupos.flat();
}

test('las vistas respetan la CSP: sin estilos ni manejadores en línea', async () => {
  const archivos = await archivosEjs(raiz);
  assert.ok(archivos.length > 0, 'se encontraron vistas EJS');

  for (const archivo of archivos) {
    const contenido = await readFile(archivo, 'utf8');
    assert.doesNotMatch(contenido, /\son[a-z]+\s*=/i, `${archivo}: manejador inline`);
    assert.doesNotMatch(contenido, /\sstyle\s*=/i, `${archivo}: estilo inline`);

    for (const [, atributos] of contenido.matchAll(/<script\b([^>]*)>/gi)) {
      if (!/\bsrc\s*=/i.test(atributos)) {
        assert.match(atributos, /\btype\s*=\s*["']application\/json["']/i, `${archivo}: solo se permite JSON inline`);
      }
    }
  }
});
