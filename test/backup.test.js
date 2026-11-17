import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { rotarBackups } from '../scripts/backup.js';

test('rotación conserva siete respaldos diarios y hasta cuatro semanas anteriores', async () => {
  const temporal = await mkdtemp(path.join(os.tmpdir(), 'lonja-backup-test-'));
  try {
    const hoy = new Date('2026-11-16T02:00:00Z');
    for (let dias = 0; dias < 35; dias += 1) {
      const fecha = new Date(hoy.getTime() - dias * 86400000);
      const nombre = `lonja-${fecha
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z')
        .replaceAll(':', '-')}`;
      await mkdir(path.join(temporal, nombre));
    }

    await rotarBackups(temporal);
    const conservados = await readdir(temporal);
    assert.equal(conservados.length, 11);
    for (let dias = 0; dias < 7; dias += 1) {
      const fecha = new Date(hoy.getTime() - dias * 86400000);
      assert.ok(
        conservados.includes(
          `lonja-${fecha
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z')
            .replaceAll(':', '-')}`,
        ),
      );
    }
  } finally {
    await rm(temporal, { recursive: true, force: true });
  }
});
