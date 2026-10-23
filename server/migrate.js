import 'dotenv/config';
import { createDatabase } from './database.js';
const db = createDatabase(process.env.DATABASE_URL);
try { await db.migrate(); console.log('Ortak hesap tabloları hazır.'); }
finally { await db.close(); }
