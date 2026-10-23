import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

export function createDatabase(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL gerekli. Yerel geliştirme için npm run dev:full kullanın.');
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000 });
  return {
    pool,
    async migrate() {
      const folder = new URL('./migrations/', import.meta.url);
      const files = (await readdir(folder)).filter(name => name.endsWith('.sql')).sort();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(620261022)');
        for (const file of files) await client.query(await readFile(new URL(file, folder), 'utf8'));
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    async createFlow(hash, verifier, nonce, returnUrl) {
      await pool.query('DELETE FROM accounts.google_flows WHERE expires_at < now()');
      await pool.query('DELETE FROM accounts.sessions WHERE expires_at < now()');
      await pool.query(`INSERT INTO accounts.google_flows(state_hash,verifier,nonce,expires_at,return_url)
        VALUES($1,$2,$3,now()+interval '10 minutes',$4)`, [hash, verifier, nonce, returnUrl || null]);
    },
    async takeFlow(hash) {
      const result = await pool.query('DELETE FROM accounts.google_flows WHERE state_hash=$1 AND expires_at>now() RETURNING verifier,nonce,return_url', [hash]);
      return result.rows[0];
    },
    async signIn(identity, sessionHash, expiresAt, previousHash) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Google's immutable subject is the identity. Never merge accounts by email.
          const result = await client.query(`INSERT INTO accounts.users(id,google_subject,email,display_name)
            VALUES($1,$2,$3,$4) ON CONFLICT(google_subject) DO UPDATE
            SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,last_login_at=now()
            RETURNING id,display_name,email,public_code,avatar`, [randomUUID(), identity.sub, identity.email, identity.name]);
          const user = result.rows[0];
          if (previousHash) await client.query('DELETE FROM accounts.sessions WHERE token_hash=$1', [previousHash]);
          await client.query('INSERT INTO accounts.sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [sessionHash, user.id, expiresAt]);
          await client.query('COMMIT');
          return user;
        } catch (error) {
          await client.query('ROLLBACK');
          if (error.code === '23505' && error.constraint === 'users_public_code_key' && attempt < 7) continue;
          throw error;
        } finally { client.release(); }
      }
    },
    async findSession(hash) {
      const result = await pool.query(`SELECT u.id,u.display_name,u.email,u.public_code,u.avatar FROM accounts.sessions s
        JOIN accounts.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`, [hash]);
      return result.rows[0] || null;
    },
    async updateProfile(id, avatar) {
      const result = await pool.query('UPDATE accounts.users SET avatar=$2 WHERE id=$1 RETURNING id,display_name,email,public_code,avatar', [id, avatar]);
      return result.rows[0] || null;
    },
    async deleteSession(hash) { await pool.query('DELETE FROM accounts.sessions WHERE token_hash=$1', [hash]); },
    close() { return pool.end(); },
  };
}
