import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { OAuth2Client } from 'google-auth-library';
import { buildApp, readConfig, hashToken } from '../server/app.js';
import { createDatabase, requiredSchemaVersion } from '../server/database.js';

let postgres, db, directory, app, nonce, identity, invalidSignature;
const config = readConfig({ APP_URL: 'http://localhost:5174/', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret' });
const google = {
  async generateCodeVerifierAsync() { return { codeVerifier: 'private-pkce', codeChallenge: 'public-challenge' }; },
  generateAuthUrl(options) { nonce = options.nonce; return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ ...options, scope: options.scope.join(' ') })}`; },
  async getToken(options) { assert.equal(options.codeVerifier, 'private-pkce'); assert.equal(options.redirect_uri, config.callback); return { tokens: { id_token: 'signed-test-token' } }; },
  async verifyIdToken(options) {
    assert.equal(options.audience, 'test-client');
    if (invalidSignature) throw new Error('invalid signature');
    return { getPayload: () => ({ sub: 'google-person-a', email: 'a@example.com', email_verified: true, given_name: 'Ada', nonce, ...identity }) };
  },
};
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'kesif-auth-'));
  postgres = new EmbeddedPostgres({ databaseDir: path.join(directory, 'postgres'), user: 'test', password: 'test-only-password', port: 55433,
    persistent: true, authMethod: 'scram-sha-256', initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1', '-c', 'io_method=sync'], onLog() {}, onError() {} });
  await postgres.initialise();
  await postgres.start();
  db = createDatabase('postgresql://test:test-only-password@127.0.0.1:55433/postgres');
  await db.migrate();
  app = await buildApp({ db, config, googleClient: google });
});
beforeEach(async () => {
  identity = {}; invalidSignature = false;
  await db.pool.query('TRUNCATE accounts.google_flows,accounts.sessions,accounts.users CASCADE');
});
after(async () => {
  await app?.close(); await db?.close(); await postgres?.stop();
  if (directory) {
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith('kesif-auth-')) throw new Error('Unexpected test directory');
    await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
test('readiness rejects missing and outdated schema markers, and migration restores readiness', async () => {
  assert.equal((await app.inject('/api/ready')).statusCode, 200);
  try {
    await db.pool.query('ALTER TABLE accounts.schema_version RENAME TO schema_version_audit');
    const missing = await app.inject('/api/ready');
    assert.equal(missing.statusCode, 503);assert.deepEqual(missing.json(), { ok: false });
  } finally { await db.pool.query('ALTER TABLE accounts.schema_version_audit RENAME TO schema_version'); }
  await db.pool.query('UPDATE accounts.schema_version SET version=$1', [requiredSchemaVersion - 1]);
  try {
    assert.equal((await app.inject('/api/ready')).statusCode, 503);
  } finally { await db.migrate(); }
  assert.equal((await app.inject('/api/ready')).statusCode, 200);
});

async function start(query = '', remoteAddress = '127.0.0.1') {
  const response = await app.inject({ url: `/api/auth/google${query}`, remoteAddress, headers: { host: 'localhost:5174' } });
  assert.equal(response.statusCode, 302);
  const url = new URL(response.headers.location);
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('prompt'), 'select_account');
  const state = url.searchParams.get('state');
  const browserCookie = response.cookies.find(item => item.name === 'kesif_google');
  assert.ok(browserCookie.httpOnly);
  return { state, remoteAddress, cookie: `kesif_google=${browserCookie.value}` };
}
async function finish(flow, extra = {}) {
  return app.inject({ url: `/api/auth/google/callback?${new URLSearchParams({ state: flow.state, code: 'test-code', ...extra })}`, remoteAddress:flow.remoteAddress, headers: { cookie: flow.cookie } });
}
const getSessionCookie = response => `kesif_session=${response.cookies.find(item => item.name === 'kesif_session').value}`;

test('Google sign-up persists a common user and only a hashed opaque session; logout revokes it', async () => {
  const response = await finish(await start());
  assert.equal(new URL(response.headers.location).searchParams.get('auth'), 'success');
  const session = getSessionCookie(response);
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie: session } });
  assert.equal(me.json().user.name, 'Ada');
  assert.ok(me.json().user.id);
  assert.equal(me.headers['cache-control'], 'no-store');
  const stored = await db.pool.query('SELECT token_hash FROM accounts.sessions');
  assert.equal(stored.rows[0].token_hash, hashToken(session.split('=')[1]));
  assert.ok(!JSON.stringify(me.json()).includes('google-person-a'));
  const forbidden = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: session, origin: 'https://attacker.example' } });
  assert.equal(forbidden.statusCode, 403);
  assert.ok((await app.inject({ url: '/api/auth/me', headers: { cookie: session } })).json().user);
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: session, origin: config.origin } })).statusCode, 200);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: session } })).json().user, null);
});

test('returning Google subject keeps user id even if email changes; same email never merges different subjects', async () => {
  const first = await finish(await start());
  const firstId = (await app.inject({ url: '/api/auth/me', headers: { cookie: getSessionCookie(first) } })).json().user.id;
  identity = { email: 'changed@example.com' };
  const second = await finish(await start());
  const secondUser = (await app.inject({ url: '/api/auth/me', headers: { cookie: getSessionCookie(second) } })).json().user;
  assert.equal(secondUser.id, firstId);
  assert.equal(secondUser.email, 'changed@example.com');
  identity = { sub: 'google-person-b', email: 'changed@example.com' };
  const third = await finish(await start());
  assert.notEqual((await app.inject({ url: '/api/auth/me', headers: { cookie: getSessionCookie(third) } })).json().user.id, firstId);
});

test('login rejects missing browser state, mismatched state, expired flows and replayed callback', async () => {
  const flow = await start();
  const missing = await app.inject({ url: `/api/auth/google/callback?state=${flow.state}&code=fake` });
  assert.equal(new URL(missing.headers.location).searchParams.get('auth'), 'failed');
  assert.equal(new URL((await finish({ ...flow, state: 'x'.repeat(43) })).headers.location).searchParams.get('auth'), 'failed');
  assert.equal(new URL((await finish(flow)).headers.location).searchParams.get('auth'), 'success');
  assert.equal(new URL((await finish(flow)).headers.location).searchParams.get('auth'), 'expired');
  const expired = await start();
  await db.pool.query("UPDATE accounts.google_flows SET expires_at=now()-interval '1 second'");
  assert.equal(new URL((await finish(expired)).headers.location).searchParams.get('auth'), 'expired');
});

test('bad signatures, bad nonce, unverified identity and cancellation cannot create users', async () => {
  invalidSignature = true;
  assert.equal(new URL((await finish(await start())).headers.location).searchParams.get('auth'), 'failed');
  invalidSignature = false;
  identity = { nonce: 'attacker' };
  assert.equal(new URL((await finish(await start())).headers.location).searchParams.get('auth'), 'failed');
  identity = { email_verified: false };
  assert.equal(new URL((await finish(await start())).headers.location).searchParams.get('auth'), 'failed');
  identity = {};
  assert.equal(new URL((await finish(await start(), { error: 'access_denied' })).headers.location).searchParams.get('auth'), 'cancelled');
  assert.equal((await db.pool.query('SELECT count(*)::integer AS count FROM accounts.users')).rows[0].count, 0);
  await assert.rejects(new OAuth2Client().verifyIdToken({ idToken: 'not-a-google-token', audience: 'test-client' }));
});

test('expired sessions are not accepted, and login canonicalizes localhost before setting cookies', async () => {
  const login = await finish(await start());
  await db.pool.query("UPDATE accounts.sessions SET expires_at=now()-interval '1 second'");
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: getSessionCookie(login) } })).json().user, null);
  const redirect = await app.inject({ url: '/api/auth/google', headers: { host: '127.0.0.1:5174' } });
  assert.equal(redirect.headers.location, 'http://localhost:5174/api/auth/google');
});

test('production requires HTTPS and sets Secure, HttpOnly, host-only cookies', async () => {
  assert.throws(() => readConfig({ NODE_ENV: 'production', APP_URL: 'http://example.com' }));
  const production = await buildApp({ db, config: { ...config, production: true, appUrl: 'https://game.example/', origin: 'https://game.example' }, googleClient: google });
  try {
    const response = await production.inject({ url: '/api/auth/google', headers: { host: 'game.example' } });
    const flowCookie = response.cookies.find(item => item.name === '__Host-kesif_google');
    assert.equal(flowCookie.secure, true);
    assert.equal(flowCookie.httpOnly, true);
    assert.equal(flowCookie.path, '/');
    assert.equal(flowCookie.domain, undefined);
  } finally { await production.close(); }
});

test('Keşif login returns only to the configured app and uses the same account session', async () => {
  const canonical = await app.inject({ url:'/api/auth/google?app=kesif', headers:{host:'localhost:5173'} });
  assert.equal(canonical.headers.location,'http://localhost:5174/api/auth/google?app=kesif');
  const response = await app.inject({url:'/api/auth/google?app=kesif&returnTo=https://attacker.test',headers:{host:'localhost:5174'}});
  const state=new URL(response.headers.location).searchParams.get('state');
  const browserCookie=response.cookies.find(item=>item.name==='kesif_google');
  const finished=await finish({state,cookie:`kesif_google=${browserCookie.value}`});
  assert.equal(new URL(finished.headers.location).origin,'http://localhost:5173');
  assert.equal(new URL(finished.headers.location).searchParams.get('auth'),'success');
  const me=await app.inject({url:'/api/auth/me',headers:{cookie:getSessionCookie(finished)}});
  assert.equal(me.json().user.name,'Ada');
  assert.equal((await db.pool.query('SELECT count(*)::integer AS count FROM accounts.users')).rows[0].count,1);
});


test('player codes are short, unique and permanent; avatar changes survive Google sign-in', async () => {
  const firstLogin = await finish(await start());
  const cookie = getSessionCookie(firstLogin);
  const initial = (await app.inject({ url:'/api/auth/me', headers:{cookie} })).json().user;
  assert.match(initial.publicCode, /^[A-Z]{4}[0-9]{4}$/);
  assert.equal(initial.avatar, 'white');
  assert.match(initial.id, /^[a-f0-9-]{36}$/);
  const patch = (body, headers={cookie,origin:config.origin}) => app.inject({method:'PATCH',url:'/api/auth/profile',headers,payload:body});
  assert.equal((await patch({avatar:'lilac'},{origin:config.origin})).statusCode,401);
  assert.equal((await patch({avatar:'lilac'},{cookie,origin:'https://attacker.example'})).statusCode,403);
  assert.equal((await patch({avatar:'koak'})).statusCode,400);
  const injectedIdentity = await patch({avatar:'rose',id:'someone-else'});
  assert.equal(injectedIdentity.statusCode,200);
  assert.equal(injectedIdentity.json().user.id,initial.id,'an extra body id cannot target another account');
  const saved = await patch({avatar:'lilac'});
  assert.equal(saved.statusCode,200);
  assert.equal(saved.json().user.avatar,'lilac');
  assert.equal(saved.json().user.publicCode,initial.publicCode);
  const returning = (await app.inject({url:'/api/auth/me',headers:{cookie:getSessionCookie(await finish(await start()))}})).json().user;
  assert.equal(returning.avatar,'lilac');
  assert.equal(returning.id,initial.id);
  assert.equal(returning.publicCode,initial.publicCode);
  identity = {sub:'google-person-b'};
  const other = (await app.inject({url:'/api/auth/me',headers:{cookie:getSessionCookie(await finish(await start()))}})).json().user;
  assert.notEqual(other.publicCode,initial.publicCode);
  assert.equal(other.avatar,'white');
  await db.migrate();
  assert.equal((await app.inject({url:'/api/auth/me',headers:{cookie}})).json().user.publicCode,initial.publicCode,'rerunning migrations keeps public codes and sessions');
});

test('migration backfills old accounts without changing identity, sessions or avatar', async () => {
  const login = await finish(await start());
  const cookie=getSessionCookie(login);
  const before=(await app.inject({url:'/api/auth/me',headers:{cookie}})).json().user;
  await db.pool.query('ALTER TABLE accounts.users ALTER COLUMN public_code DROP NOT NULL');
  await db.pool.query("UPDATE accounts.users SET public_code=NULL,avatar='rose'");
  await db.migrate();
  const after=(await app.inject({url:'/api/auth/me',headers:{cookie}})).json().user;
  assert.equal(after.id,before.id);
  assert.match(after.publicCode,/^[A-Z]{4}[0-9]{4}$/);
  assert.equal(after.avatar,'rose');
  await db.pool.query(`INSERT INTO accounts.users(id,google_subject,email,display_name)
    SELECT gen_random_uuid(),'batch-'||n,'test@example.com','Test' FROM generate_series(1,200) n`);
  const codes=(await db.pool.query('SELECT public_code FROM accounts.users')).rows.map(row=>row.public_code);
  assert.equal(new Set(codes).size,codes.length);
  assert.ok(codes.every(code=>/^[A-Z]{4}[0-9]{4}$/.test(code)));
});

test('new sign-in retries a public-code collision inside a fresh transaction', async () => {
  await db.pool.query("INSERT INTO accounts.users(id,google_subject,email,display_name,public_code) VALUES(gen_random_uuid(),'existing','test@example.com','Existing','ABCD1234')");
  await db.pool.query('CREATE SEQUENCE accounts.test_code_attempt');
  try {
    await db.pool.query(`CREATE OR REPLACE FUNCTION accounts.new_player_code() RETURNS text AS $$
      SELECT CASE WHEN nextval('accounts.test_code_attempt')=1 THEN 'ABCD1234' ELSE 'EFGH5678' END;
      $$ LANGUAGE sql VOLATILE`);
    const user=await db.signIn({sub:'new-person',email:'test@example.com',name:'New'},'new-session',new Date(Date.now()+60000));
    assert.equal(user.public_code,'EFGH5678');
    assert.equal((await db.findSession('new-session')).id,user.id);
  } finally {
    await db.migrate();
    await db.pool.query('DROP SEQUENCE accounts.test_code_attempt');
  }
});

test('room invitations survive Google success/cancellation and malformed room values cannot redirect',async()=>{
  const success=await finish(await start('?room=ABCDEFGH','127.0.0.2'));
  let destination=new URL(success.headers.location);
  assert.equal(destination.origin,'http://localhost:5174');assert.equal(destination.searchParams.get('room'),'ABCDEFGH');
  const cancelled=await finish(await start('?room=ABCDEFGH','127.0.0.2'),{error:'access_denied'});
  destination=new URL(cancelled.headers.location);assert.equal(destination.searchParams.get('room'),'ABCDEFGH');
  const invalid=await finish(await start('?room=https%3A%2F%2Fattacker.test%2F&returnTo=https%3A%2F%2Fattacker.test','127.0.0.2'));
  destination=new URL(invalid.headers.location);assert.equal(destination.origin,'http://localhost:5174');assert.equal(destination.searchParams.has('room'),false);
});
