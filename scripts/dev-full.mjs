import 'dotenv/config';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const localDir = path.join(root, '.local');
await mkdir(localDir, { recursive: true });
let localPg;
if (!process.env.DATABASE_URL) {
  const credentialFile = path.join(localDir, 'database.json');
  let credentials;
  try { credentials = JSON.parse(await readFile(credentialFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    credentials = { user: 'kesif_local', password: randomBytes(32).toString('hex') };
    await writeFile(credentialFile, JSON.stringify(credentials), { mode: 0o600, flag: 'wx' });
  }
  const port = 55432;
  localPg = new EmbeddedPostgres({
    databaseDir: path.join(localDir, 'postgres'), user: credentials.user, password: credentials.password,
    port, persistent: true, authMethod: 'scram-sha-256',
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    // Synchronous I/O avoids an orphaned Windows io_worker keeping the port open on restart.
    postgresFlags: ['-h', '127.0.0.1', '-c', 'io_method=sync'],
    onLog() {}, onError(message) { if (String(message).includes('FATAL')) console.error(String(message)); },
  });
  let initialized = true;
  try { await access(path.join(localDir, 'postgres', 'PG_VERSION')); } catch { initialized = false; }
  if (!initialized) await localPg.initialise();
  await localPg.start();
  const admin = new pg.Client({ host: '127.0.0.1', port, ...credentials, database: 'postgres' });
  await admin.connect();
  const found = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['kesif_dunyasi']);
  if (!found.rowCount) await admin.query('CREATE DATABASE kesif_dunyasi');
  await admin.end();
  process.env.DATABASE_URL = `postgresql://${credentials.user}:${credentials.password}@127.0.0.1:${port}/kesif_dunyasi`;
}
process.env.APP_URL ||= 'http://localhost:5174/';
const children = [];
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  await Promise.all(children.map(child => child.exitCode !== null ? undefined : new Promise(resolve => child.once('exit', resolve))));
  if (localPg) await localPg.stop();
  process.exit(code);
}
const launches = [
  { file: 'server/index.js', args: [], cwd: root },
  { file: 'node_modules/vite/bin/vite.js', args: [], cwd: root },
];
if (process.argv.includes('--with-kesif')) {
  const kesifRoot = process.env.KESIF_PROJECT_DIR || path.resolve(root, '../guncel_projeler/kesif-dunyasi');
  await access(path.join(kesifRoot, 'apps/web/vite.config.ts'));
  launches.push({ file: 'node_modules/vite/bin/vite.js', args: ['apps/web','--host','127.0.0.1','--port','5173','--strictPort'], cwd: kesifRoot });
}
for (const { file, args, cwd } of launches) {
  const child = spawn(process.execPath, [file, ...args], { cwd, env: process.env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('exit', code => { if (!stopping) stop(code || 0); });
  child.on('error', () => stop(1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('CoMind Arena + ortak hesap servisi: http://localhost:5174/');
if (process.argv.includes('--with-kesif')) console.log('Keşif Dünyası: http://localhost:5173/');
