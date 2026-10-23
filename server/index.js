import 'dotenv/config';
import { buildApp, readConfig } from './app.js';
import { createDatabase } from './database.js';

const config = readConfig();
if (config.production && (!config.clientId || !config.clientSecret)) throw new Error('Üretimde Google giriş bilgileri gerekli.');
const db = createDatabase(process.env.DATABASE_URL);
if (process.env.AUTO_MIGRATE === 'true' || (!config.production && process.env.AUTO_MIGRATE !== 'false')) await db.migrate();
const app = await buildApp({ db, config, logger: true });
let sweeping = false;
const sweeper = setInterval(async () => {
  if (sweeping) return;
  sweeping = true;
  try { await app.arena.sweep(); } catch { app.log.error('Oda süreleri kontrol edilemedi.'); }
  finally { sweeping = false; }
}, 5000);
sweeper.unref();
const shutdown = async () => { clearInterval(sweeper); await app.close(); await db.close(); };
process.once('SIGINT', () => shutdown().then(() => process.exit(0)));
process.once('SIGTERM', () => shutdown().then(() => process.exit(0)));
await app.listen({ port: config.port, host: config.host });
