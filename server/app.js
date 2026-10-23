import Fastify, { LogController } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { OAuth2Client } from 'google-auth-library';
import { arenaRoutes } from './arena.js';
import { readinessQuery } from './database.js';

export const hashToken = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const matches = (a, b) => typeof a === 'string' && typeof b === 'string'
  && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const appUrl = new URL(env.APP_URL || 'http://localhost:5174/');
  if (!['http:', 'https:'].includes(appUrl.protocol)) throw new Error('APP_URL HTTP veya HTTPS olmalı.');
  if (appUrl.search || appUrl.hash || appUrl.username || appUrl.password) throw new Error('APP_URL yalnızca site adresini ve varsa yolunu içermeli.');
  if (!appUrl.pathname.endsWith('/')) appUrl.pathname += '/';
  if (production && appUrl.protocol !== 'https:') throw new Error('Üretimde APP_URL HTTPS olmalı.');
  if (!production && appUrl.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(appUrl.hostname)) throw new Error('HTTP yalnızca yerel geliştirmede kullanılabilir.');
  const kesifUrl = new URL(env.KESIF_URL || (production ? new URL('/kesif-dunyasi/', appUrl).href : 'http://localhost:5173/'));
  if (kesifUrl.hostname !== appUrl.hostname || kesifUrl.protocol !== appUrl.protocol || kesifUrl.username || kesifUrl.password || kesifUrl.search || kesifUrl.hash) throw new Error('Keşif Dünyası ortak oturum için aynı site adresinde çalışmalı.');
  if (!kesifUrl.pathname.endsWith('/')) kesifUrl.pathname += '/';
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 1–65535 arasında olmalı.');
  const trustProxy = env.TRUST_PROXY && env.TRUST_PROXY !== 'false' ? env.TRUST_PROXY : false;
  if (trustProxy && /^(true|\d+)$/.test(trustProxy)) throw new Error('TRUST_PROXY için güvenilen proxy IP/CIDR adresini kullanın.');
  return {
    production, appUrl: appUrl.href, origin: appUrl.origin,
    kesifUrl: kesifUrl.href,
    clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    callback: new URL('/api/auth/google/callback', appUrl).href,
    port, host: env.HOST || '127.0.0.1', trustProxy,
    serveStatic: env.SERVE_STATIC === 'true' || (production && env.SERVE_STATIC !== 'false'),
    kesifDist: env.KESIF_DIST || '',
  };
}

export async function buildApp({ db, config = readConfig(), googleClient, logger = false }) {
  const app = Fastify({ logger, bodyLimit: 8192, trustProxy: config.trustProxy || false, logController: new LogController({ disableRequestLogging: true }) });
  const oauth = googleClient || new OAuth2Client(config.clientId, config.clientSecret, config.callback);
  const configured = Boolean(config.clientId && config.clientSecret);
  const sessionName = config.production ? '__Host-kesif_session' : 'kesif_session';
  const flowName = config.production ? '__Host-kesif_google' : 'kesif_google';
  const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/' };
  const allowedOrigins = new Set([config.origin, new URL(config.kesifUrl || config.appUrl).origin]);
  const validOrigin = request => request.method === 'GET' || allowedOrigins.has(request.headers.origin);
  const publicUser = user => user ? { id: user.id, name: user.display_name, email: user.email, publicCode: user.public_code, avatar: user.avatar || 'white' } : null;
  const authenticate = request => request.cookies[sessionName] ? db.findSession(hashToken(request.cookies[sessionName])) : null;
  const returnToApp = (reply, result, returnUrl = config.appUrl) => {
    const destination = new URL(returnUrl);
    destination.searchParams.set('auth', result);
    return reply.redirect(destination.href);
  };
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'SAMEORIGIN');
    if (request.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('X-Content-Type-Options', 'nosniff');
    }
    return payload;
  });
  app.setErrorHandler((error, request, reply) => {
    // Never log callback URLs, authorization codes, tokens or profile details.
    if (error.statusCode === 429) return reply.code(429).send({ error: 'Çok fazla deneme yaptın. Biraz bekleyip yeniden dene.' });
    if (error.statusCode >= 400 && error.statusCode < 500) return reply.code(error.statusCode).send({ error: error.validation ? 'Geçersiz istek.' : error.message });
    app.log.error({ code: error.code || 'AUTH_SERVICE_ERROR' }, 'Hesap servisi isteği tamamlanamadı.');
    return reply.code(503).send({ error: 'Hesap servisine şu an ulaşılamıyor. Lütfen yeniden dene.' });
  });

  app.get('/api/health', async () => ({ ok: true }));
  app.get('/api/ready', async (request, reply) => {
    try {
      const result = await db.pool.query(readinessQuery);
      if (!result.rows.length) return reply.code(503).send({ ok: false });
      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
  // Campaigns are intentionally inactive. Future redemption must validate and
  // grant rewards transactionally on the server; the UI never grants rewards.
  app.post('/api/gifts/redeem', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', required: ['code'], additionalProperties: false,
      properties: { code: { type: 'string', pattern: '^[A-Z0-9][A-Z0-9-]{2,63}$' } } } },
  }, async (request, reply) => {
    if (!validOrigin(request)) return reply.code(403).send({ error: 'Geçersiz istek kaynağı.' });
    return { status: 'inactive', message: 'Hediye kodları henüz kullanıma açılmadı. Şu an aktif bir kampanya yok.' };
  });
  app.get('/api/auth/me', async (request, reply) => {
    const current = request.cookies[sessionName];
    const user = await authenticate(request);
    if (current && !user) reply.clearCookie(sessionName, cookieOptions);
    return { user: publicUser(user), configured };
  });

  app.patch('/api/auth/profile', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', required: ['avatar'], additionalProperties: false,
      properties: { avatar: { type: 'string', enum: ['white', 'lilac', 'rose'] } } } },
  }, async (request, reply) => {
    if (!validOrigin(request)) return reply.code(403).send({ error: 'Geçersiz istek kaynağı.' });
    const user = await authenticate(request);
    if (!user) return reply.code(401).send({ error: 'Profilini kaydetmek için giriş yapmalısın.' });
    const updated = await db.updateProfile(user.id, request.body.avatar);
    if (!updated) return reply.code(401).send({ error: 'Hesabına yeniden giriş yapmalısın.' });
    return { user: publicUser(updated) };
  });

  app.get('/api/auth/google', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (!configured) return returnToApp(reply, 'unavailable');
    const target = new URL(request.query.app === 'kesif' ? config.kesifUrl || config.appUrl : config.appUrl);
    if (/^[A-HJ-NP-Z2-9]{8}$/.test(request.query.room || '')) target.searchParams.set('room', request.query.room);
    if (request.headers.host !== new URL(config.appUrl).host) {
      const canonical = new URL('/api/auth/google', config.appUrl);
      if (request.query.app === 'kesif') canonical.searchParams.set('app', 'kesif');
      if (target.searchParams.has('room')) canonical.searchParams.set('room', target.searchParams.get('room'));
      return reply.redirect(canonical.href);
    }
    // Bind the flow to the browser that opened the button, and use PKCE + nonce.
    const state = token(), nonce = token();
    const { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
    await db.createFlow(hashToken(state), codeVerifier, nonce, target.href);
    reply.setCookie(flowName, state, { ...cookieOptions, maxAge: 600 });
    const url = oauth.generateAuthUrl({
      scope: ['openid', 'email', 'profile'], prompt: 'select_account',
      access_type: 'online', state, nonce,
      code_challenge: codeChallenge, code_challenge_method: 'S256',
    });
    return reply.redirect(url);
  });

  app.get('/api/auth/google/callback', { config: { rateLimit: { max: 40, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { state, code, error } = request.query;
    const browserState = request.cookies[flowName];
    reply.clearCookie(flowName, cookieOptions);
    if (!configured || !matches(state, browserState)) return returnToApp(reply, 'failed');
    const flow = await db.takeFlow(hashToken(state));
    if (!flow) return returnToApp(reply, 'expired');
    const finish = result => returnToApp(reply, result, flow.return_url || config.appUrl);
    if (error) return finish(error === 'access_denied' ? 'cancelled' : 'failed');
    if (typeof code !== 'string' || code.length > 4096) return finish('failed');
    let identity;
    try {
      const { tokens } = await oauth.getToken({ code, codeVerifier: flow.verifier, redirect_uri: config.callback });
      if (!tokens.id_token) return finish('failed');
      const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const payload = ticket.getPayload();
      if (!payload || !matches(payload.nonce, flow.nonce) || typeof payload.sub !== 'string'
        || !payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) return finish('failed');
      identity = { sub: payload.sub, email: payload.email.slice(0, 320), name: String(payload.given_name || payload.name || 'Oyuncu').slice(0, 100) };
    } catch {
      return finish('failed');
    }
    const session = token();
    const maxAge = 60 * 60 * 24 * 7;
    await db.signIn(identity, hashToken(session), new Date(Date.now() + maxAge * 1000), request.cookies[sessionName] ? hashToken(request.cookies[sessionName]) : null);
    reply.setCookie(sessionName, session, { ...cookieOptions, maxAge });
    return finish('success');
  });

  app.post('/api/auth/logout', async (request, reply) => {
    if (!validOrigin(request)) return reply.code(403).send({ error: 'Geçersiz istek kaynağı.' });
    const current = request.cookies[sessionName];
    if (current) await db.deleteSession(hashToken(current));
    reply.clearCookie(sessionName, cookieOptions);
    return { ok: true };
  });

  const arena = await arenaRoutes(app, { db, authenticate, validOrigin });
  app.decorate('arena', arena);

  if (config.serveStatic) {
    if (config.production) {
      const metadata = JSON.parse(await readFile(new URL('../dist/deployment.json', import.meta.url), 'utf8'));
      if (metadata.base !== new URL(config.appUrl).pathname) throw new Error('Derleme yolu APP_URL ile eşleşmiyor. npm run release -- --base=/yayın-yolu/ ile yeniden hazırlayın.');
    }
    await app.register(staticFiles, {
      root: fileURLToPath(new URL('../dist/', import.meta.url)),
      prefix: new URL(config.appUrl).pathname,
    });
    if (config.kesifDist) {
      const prefix = new URL(config.kesifUrl).pathname;
      if (prefix === new URL(config.appUrl).pathname) throw new Error('İki oyunun yayın yolları farklı olmalı.');
      await app.register(staticFiles, { root: path.resolve(config.kesifDist), prefix, decorateReply: false });
    }
  }
  return app;
}
