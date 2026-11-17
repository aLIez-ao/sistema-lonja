import '../config/entorno.js';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { cp, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const proyecto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relativo = (base, destino) => path.relative(base, destino);
const dentroDe = (base, destino) => {
  const rel = relativo(base, destino);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
};

function semanaUTC(fecha) {
  const dia = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  dia.setUTCDate(dia.getUTCDate() + 4 - (dia.getUTCDay() || 7));
  const inicio = new Date(Date.UTC(dia.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((dia - inicio) / 86400000 + 1) / 7);
  return `${dia.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

async function guardarVolcado(destino) {
  const ejecutable = process.env.MARIADB_DUMP || (os.platform() === 'win32' ? 'mariadb-dump.exe' : 'mariadb-dump');
  const args = ['--single-transaction', '--quick', '--routines', '--events', '--triggers', '--hex-blob'];
  if (process.env.BD_HOST) args.push('--host', process.env.BD_HOST);
  if (process.env.BD_PORT) args.push('--port', String(process.env.BD_PORT));
  if (process.env.BD_USUARIO) args.push('--user', process.env.BD_USUARIO);
  args.push(process.env.BD_NOMBRE);

  const salida = createWriteStream(destino, { flags: 'wx' });
  const proceso = spawn(ejecutable, args, {
    env: { ...process.env, MYSQL_PWD: process.env.BD_CLAVE || '' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const errores = [];
  proceso.stdout.pipe(salida);
  proceso.stderr.on('data', (fragmento) => errores.push(fragmento));

  try {
    const [codigo] = await Promise.all([
      new Promise((resolve, reject) => {
        proceso.once('error', reject);
        proceso.once('close', resolve);
      }),
      new Promise((resolve, reject) => {
        salida.once('finish', resolve);
        salida.once('error', reject);
      }),
    ]);
    if (codigo !== 0)
      throw new Error(`mariadb-dump terminó con código ${codigo}: ${Buffer.concat(errores).toString().trim()}`);
  } catch (error) {
    salida.destroy();
    proceso.kill();
    throw error;
  }
}

export async function rotarBackups(directorio, retencionDiaria = 7, retencionSemanal = 4) {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const backups = entradas
    .filter((entrada) => entrada.isDirectory() && /^lonja-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/.test(entrada.name))
    .map((entrada) => {
      const sello = entrada.name.slice(6);
      const [fecha, hora] = sello.split('T');
      return { nombre: entrada.name, fecha: new Date(`${fecha}T${hora.replaceAll('-', ':')}`) };
    })
    .filter((backup) => !Number.isNaN(backup.fecha.getTime()))
    .sort((a, b) => b.fecha - a.fecha);

  const conservar = new Set(backups.slice(0, retencionDiaria).map((backup) => backup.nombre));
  const semanas = new Set();
  for (const backup of backups.slice(retencionDiaria)) {
    const semana = semanaUTC(backup.fecha);
    if (semanas.has(semana)) continue;
    if (semanas.size >= retencionSemanal) break;
    semanas.add(semana);
    conservar.add(backup.nombre);
  }

  for (const backup of backups) {
    if (!conservar.has(backup.nombre)) await rm(path.join(directorio, backup.nombre), { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.BD_DIALEC !== 'mariadb') throw new Error('El respaldo requiere BD_DIALEC=mariadb.');
  if (!process.env.BD_NOMBRE || !process.env.BD_USUARIO || !process.env.BD_CLAVE) {
    throw new Error('Configura BD_NOMBRE, BD_USUARIO y BD_CLAVE en el entorno.');
  }
  if (!process.env.BACKUP_DIR) throw new Error('Define BACKUP_DIR fuera del directorio del proyecto.');

  const directorio = path.resolve(process.env.BACKUP_DIR);
  const uploads = path.resolve(process.env.UPLOADS_DIR || path.join(proyecto, 'public', 'uploads'));
  if (dentroDe(proyecto, directorio)) throw new Error('BACKUP_DIR debe estar fuera del directorio del proyecto.');
  if (dentroDe(uploads, directorio) || dentroDe(directorio, uploads)) {
    throw new Error('BACKUP_DIR y UPLOADS_DIR deben ser directorios independientes.');
  }
  await mkdir(directorio, { recursive: true, mode: 0o700 });

  const fecha = new Date();
  const marca = fecha
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replaceAll(':', '-');
  const nombre = `lonja-${marca}`;
  const temporal = path.join(directorio, `.temporal-${nombre}`);
  const final = path.join(directorio, nombre);
  await mkdir(temporal, { mode: 0o700 });
  try {
    await guardarVolcado(path.join(temporal, 'database.sql'));
    try {
      await stat(uploads);
      await cp(uploads, path.join(temporal, 'uploads'), { recursive: true, force: false, errorOnExist: true });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(path.join(temporal, 'uploads'), { mode: 0o700 });
    }
    await writeFile(
      path.join(temporal, 'manifest.json'),
      `${JSON.stringify({ creadoEn: fecha.toISOString(), base: process.env.BD_NOMBRE, uploads }, null, 2)}\n`,
      { mode: 0o600, flag: 'wx' },
    );
    await rename(temporal, final);
    await rotarBackups(directorio);
    console.log(`Respaldo creado: ${nombre}`);
  } catch (error) {
    await rm(temporal, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`No se pudo crear el respaldo: ${error.message}`);
    process.exitCode = 1;
  });
}
