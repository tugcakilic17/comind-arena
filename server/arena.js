import { randomUUID, randomInt } from 'node:crypto';
import { createDeck, getPair, sharedSymbol } from '../src/game.js';
import { currentPair } from '../src/match-rules.js';
import { friendsRoutes } from './friends.js';
import { gameWorlds } from '../src/game-worlds.js';

export const SCORE_RULES = Object.freeze({
  placements: { 2: [30, -10], 3: [30, 10, -10], 4: [30, 10, 0, -10] },
  minimum: 0,
});
const deck = createDeck();
const random = () => randomInt(0, 0x100000000) / 0x100000000;
export class ApiError extends Error {
  constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
}
const fail = (status, message) => { throw new ApiError(status, message); };
const ids = room => room.state.memberIds || [room.host_id, room.guest_id];
const codePattern = /^[A-HJ-NP-Z2-9]{8}$/;
function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
}
function options(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['capacity','symbolCount','winTarget','theme'].includes(key))) fail(400, 'Geçersiz oda ayarı.');
  const result = { capacity: 2, symbolCount: 6, winTarget: 10, theme: 'kofen', ...value };
  if (![2,3,4].includes(result.capacity) || ![3,4,5,6,7,8].includes(result.symbolCount) || ![5,10,15,20].includes(result.winTarget)) fail(400, 'Oyuncu, simge veya doğru hedefini kontrol et.');
  if (typeof result.theme !== 'string' || !Object.hasOwn(gameWorlds, result.theme)) fail(400, 'Geçersiz oyun dünyası.');
  return result;
}
function normalize(room) {
  const state = room.state;
  state.memberIds ||= [room.host_id, room.guest_id];
  state.options ||= { capacity: 2, symbolCount: 6, winTarget: 10 };
  state.departed ||= state.memberIds.map(() => false);
  if (state.status === 'finished' && !Object.hasOwn(state,'winner')) {
    const best=Math.max(...state.scores), leaders=state.scores.map((score,i)=>score===best?i:null).filter(i=>i!==null);
    state.winner=state.forfeiter != null ? 1-state.forfeiter : leaders.length===1 ? leaders[0] : null;
  }
}
function nextPair(state) {
  const pair = getPair(deck, random);
  return currentPair({ hands: pair.map(card => [card]), symbolCount: state.options.symbolCount,
    symbolPoolSize: Object.hasOwn(gameWorlds, state.options.theme) ? 15 : 31 }, random);
}
export function createArena(db, { now = Date.now } = {}) {
  async function transaction(callback) {
    const client = await db.pool.connect();
    try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async function finish(client, room, reason, winner = null) {
    const state = room.state;
    if (['finished','cancelled'].includes(state.status)) return;
    state.status = reason === 'cancelled' ? 'cancelled' : 'finished';
    state.reason = reason; state.finishedAt = now(); state.winner = winner;
    state.points = ids(room).map(() => 0);
    if (state.status === 'finished') {
      const members=ids(room), order=members.map((id,i)=>id?i:null).filter(i=>i!==null);
      order.sort((a,b)=>Number(b===winner)-Number(a===winner) || Number(state.departed[a])-Number(state.departed[b]) || state.scores[b]-state.scores[a]);
      state.placements=members.map(()=>null);
      for (const [position,i] of order.entries()) {
        const previous=order[position-1];
        const tied=position>0 && previous!==winner && i!==winner && state.departed[previous]===state.departed[i] && state.scores[previous]===state.scores[i];
        state.placements[i]=tied?state.placements[previous]:position+1;
      }
      // A player may leave one match and finish another: lock balances in a fixed
      // order so concurrent results cannot overdraw or overwrite each other.
      await client.query('SELECT id FROM accounts.users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[members.filter(Boolean)]);
      const totals=(await client.query('SELECT user_id,sum(points)::integer AS total FROM arena.awards WHERE user_id=ANY($1::uuid[]) GROUP BY user_id',[members.filter(Boolean)])).rows;
      state.rankingTotals=members.map(()=>0);
      for (const i of order) {
        const before=totals.find(row=>row.user_id===members[i])?.total || 0;
        const scheduled=SCORE_RULES.placements[state.options.capacity][state.placements[i]-1];
        const after=Math.max(SCORE_RULES.minimum,before+scheduled);
        state.points[i]=after-before;state.rankingTotals[i]=after;
        await client.query('INSERT INTO arena.awards(room_id,user_id,points,outcome) VALUES($1,$2,$3,$4)',[room.id,members[i],state.points[i],i===winner?'win':'loss']);
      }
    }
    await client.query('DELETE FROM arena.active_players WHERE room_id=$1', [room.id]);
  }
  async function drop(client, room, index, reason) {
    room.state.departed[index] = true;
    await client.query('DELETE FROM arena.active_players WHERE room_id=$1 AND user_id=$2', [room.id,ids(room)[index]]);
    const remaining = ids(room).map((id,i) => id && !room.state.departed[i] ? i : null).filter(i => i !== null);
    if (remaining.length < 2) await finish(client,room,remaining.length ? reason : 'cancelled',remaining[0] ?? null);
  }
  async function advance(client, room) {
    normalize(room);
    const state = room.state, time = now();
    if (['finished','cancelled'].includes(state.status)) return;
    if (state.status === 'waiting' && time > state.createdAt + 15 * 60_000) return finish(client,room,'cancelled');
    if (state.status === 'playing') {
      const active = ids(room).map((id,i) => id && !state.departed[i] ? i : null).filter(i => i !== null);
      const missing = active.filter(i => time - state.lastSeen[i] > 45_000);
      if (missing.length === active.length) return finish(client,room,'cancelled');
      // Mark all disconnected players together, so a stale player cannot win by iteration order.
      for (const i of missing) state.departed[i] = true;
      for (const i of missing) await drop(client,room,i,'disconnect');
    }
  }
  async function save(client, room) {
    room.state.revision = (room.state.revision || 0) + 1;
    room.guest_id = ids(room).slice(1).find(Boolean) || null;
    await client.query('UPDATE arena.rooms SET guest_id=$2,state=$3 WHERE id=$1', [room.id,room.guest_id,room.state]);
  }
  async function snapshot(client, room, userId, notice = '') {
    normalize(room);
    const names = (await client.query('SELECT id,display_name,avatar FROM accounts.users WHERE id=ANY($1::uuid[])', [ids(room).filter(Boolean)])).rows;
    const state = room.state;
    return { id:room.id,code:room.code,status:state.status,revision:state.revision || 0,you:ids(room).indexOf(userId),
      players:ids(room).map(id => id ? {id,name:names.find(row => row.id === id)?.display_name || 'Oyuncu',avatar:names.find(row => row.id === id)?.avatar || 'white'} : null),
      options:state.options,departed:state.departed,scores:state.scores,winners:state.winners,round:state.round,
      pair:state.status === 'playing' ? state.pair : null,ready:state.ready,startsAt:state.startsAt,turnAt:state.turnAt,
      serverTime:now(),points:state.points || ids(room).map(() => 0),placements:state.placements || null,rankingTotals:state.rankingTotals || null,reason:state.reason || null,winner:state.winner ?? null,notice,
    };
  }
  async function withRoom(userId, roomCode, callback) {
    if (!codePattern.test(roomCode || '')) fail(400, 'Oda kodu 8 harf/rakam olmalı.');
    return transaction(async client => {
      const room = (await client.query('SELECT * FROM arena.rooms WHERE code=$1 FOR UPDATE', [roomCode])).rows[0];
      if (!room) fail(404, 'Bu oda bulunamadı. Kodu kontrol et.');
      if (!ids(room).includes(userId)) fail(403, 'Bu maça katılmadın.');
      await advance(client,room);
      const notice = callback ? await callback(client,room) || '' : '';
      await save(client,room);
      return snapshot(client,room,userId,notice);
    });
  }
  return {
    async create(userId, value) {
      const setup = options(value);
      return transaction(async client => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
        const existing = (await client.query('SELECT r.* FROM arena.active_players p JOIN arena.rooms r ON r.id=p.room_id WHERE p.user_id=$1 FOR UPDATE OF r', [userId])).rows[0];
        if (existing) {
          await advance(client,existing); await save(client,existing);
          if (!['finished','cancelled'].includes(existing.state.status)) return snapshot(client,existing,userId,'Açık odana geri döndün.');
        }
        const blank = () => Array(setup.capacity).fill(0);
        const room = {id:randomUUID(),code:code(),host_id:userId,guest_id:null,
          state:{status:'waiting',createdAt:now(),options:setup,memberIds:[userId,...Array(setup.capacity-1).fill(null)],
            ready:blank().map(Boolean),departed:blank().map(Boolean),scores:blank(),winners:[],round:1,pair:null,lastSeen:blank()}};
        room.state.lastSeen[0] = now();
        let inserted;
        for (let attempt=0;attempt<5;attempt++) {
          inserted = await client.query('INSERT INTO arena.rooms(id,code,host_id,state) VALUES($1,$2,$3,$4) ON CONFLICT(code) DO NOTHING RETURNING id',[room.id,room.code,userId,room.state]);
          if (inserted.rowCount) break;
          room.code = code();
        }
        if (!inserted.rowCount) fail(503,'Oda açılamadı. Yeniden dene.');
        await client.query('INSERT INTO arena.active_players(user_id,room_id) VALUES($1,$2)', [userId,room.id]);
        return snapshot(client,room,userId);
      });
    },
    async join(userId, roomCode) {
      if (!codePattern.test(roomCode || '')) fail(400,'Geçerli bir oda kodu gir.');
      return transaction(async client => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
        const room = (await client.query('SELECT * FROM arena.rooms WHERE code=$1 FOR UPDATE',[roomCode])).rows[0];
        if (!room) fail(404,'Bu oda bulunamadı.');
        await advance(client,room);
        if (['finished','cancelled'].includes(room.state.status)) fail(410,'Bu oda sona erdi. Yeni bir davet oluştur.');
        const index = ids(room).indexOf(userId);
        if (index >= 0 && !room.state.departed[index]) return snapshot(client,room,userId);
        if (room.state.status !== 'waiting') fail(409,'Maç başladı. Yeni bir odada buluşabilirsiniz.');
        const slot = ids(room).indexOf(null);
        if (slot < 0) fail(409,'Bu oda dolu. Yeni bir oda oluşturabilirsin.');
        const current = (await client.query('SELECT room_id FROM arena.active_players WHERE user_id=$1',[userId])).rows[0];
        if (current && current.room_id !== room.id) fail(409,'Önce açık odandan ayrıl.');
        room.state.memberIds[slot] = userId;
        room.state.ready.fill(false); room.state.departed[slot] = false; room.state.lastSeen[slot] = now();
        await client.query('INSERT INTO arena.active_players(user_id,room_id) VALUES($1,$2)',[userId,room.id]);
        await client.query("UPDATE arena.invites SET status='accepted' WHERE room_id=$1 AND receiver_id=$2 AND status='pending'",[room.id,userId]);
        await save(client,room);
        return snapshot(client,room,userId);
      });
    },
    read(userId,roomCode) {
      return withRoom(userId,roomCode,(client,room) => { const i=ids(room).indexOf(userId); if (!room.state.departed[i]) room.state.lastSeen[i]=now(); });
    },
    ready(userId,roomCode) {
      return withRoom(userId,roomCode,(client,room) => {
        const state=room.state,index=ids(room).indexOf(userId);
        if (state.status !== 'waiting') return;
        state.ready[index]=true;state.lastSeen[index]=now();
        if (ids(room).every(Boolean) && state.ready.every(Boolean)) {
          state.status='playing';state.pair=nextPair(state);state.startsAt=now()+3000;state.turnAt=state.startsAt;
          state.lastAttempts=ids(room).map(() => 0);state.lastSeen=ids(room).map(() => now());
        }
      });
    },
    answer(userId,roomCode,answer) {
      if (!answer || Object.keys(answer).sort().join(',') !== 'round,symbol' || !Number.isInteger(answer.round) || !Number.isInteger(answer.symbol) || answer.symbol < 0 || answer.symbol > 30) fail(400,'Geçersiz simge seçimi.');
      return withRoom(userId,roomCode,async (client,room) => {
        const state=room.state,index=ids(room).indexOf(userId),time=now();
        if (state.departed[index]) fail(403,'Bu maçtan ayrıldın.');
        if (state.status !== 'playing' || time < state.turnAt+180 || answer.round !== state.round) return 'Bu tur henüz hazır değil veya tamamlandı.';
        if (time-state.lastAttempts[index] < 350) return 'Biraz bekle ve yeniden dene.';
        state.lastSeen[index]=time;state.lastAttempts[index]=time;
        if (answer.symbol !== sharedSymbol(state.pair)) return 'Tekrar dene!';
        state.scores[index]++;state.winners.push(index);
        if (state.scores[index] >= state.options.winTarget) await finish(client,room,'target',index);
        else { state.round++;state.pair=nextPair(state);state.turnAt=time+1100; }
      });
    },
    leave(userId,roomCode) {
      return withRoom(userId,roomCode,async (client,room) => {
        if (['finished','cancelled'].includes(room.state.status)) return;
        const index=ids(room).indexOf(userId);
        if (room.state.status === 'waiting') {
          if (index === 0) return finish(client,room,'cancelled');
          room.state.memberIds[index]=null;room.state.ready.fill(false);
          await client.query('DELETE FROM arena.active_players WHERE user_id=$1 AND room_id=$2',[userId,room.id]);
        } else await drop(client,room,index,'forfeit');
      });
    },
    async sweep() {
      const rows=(await db.pool.query("SELECT code,host_id FROM arena.rooms WHERE state->>'status' IN ('waiting','playing')")).rows;
      for (const row of rows) await withRoom(row.host_id,row.code);
    },
    async leaderboard(userId, offset = 0, center = false) {
      const result = await db.pool.query(`WITH totals AS (
        SELECT a.user_id,u.display_name AS name,sum(a.points)::integer AS score,
          count(*)::integer AS games,count(*) FILTER(WHERE a.outcome='win')::integer AS wins
        FROM arena.awards a JOIN accounts.users u ON u.id=a.user_id GROUP BY a.user_id,u.display_name
      ), ranked AS (
        SELECT *,row_number() OVER(ORDER BY score DESC,wins DESC,games ASC,user_id)::integer AS rank FROM totals
      ), own AS (SELECT * FROM ranked WHERE user_id=$1), bounds AS (
        SELECT LEAST(GREATEST(0,(SELECT count(*)::integer FROM ranked)-9),GREATEST(0,CASE WHEN $3::boolean THEN COALESCE((SELECT rank-5 FROM own),0) ELSE $2::integer END)) AS start
      ) SELECT (SELECT count(*)::integer FROM ranked) AS total,(SELECT row_to_json(own) FROM own) AS self,
        (SELECT start FROM bounds) AS start,
        COALESCE((SELECT json_agg(page ORDER BY page.rank) FROM (SELECT * FROM ranked ORDER BY rank OFFSET (SELECT start FROM bounds) LIMIT 9) page),'[]'::json) AS players`, [userId || null, offset, center]);
      const data = result.rows[0];
      return { ...data, players: data.players.map(row => ({ ...row, isSelf: row.user_id === userId })), scoreRules: SCORE_RULES };
    },
  };
}

export async function arenaRoutes(app, { db, authenticate, validOrigin, arena = createArena(db) }) {
  const protectedRoute = { preHandler: async (request, reply) => {
    if (!validOrigin(request)) return reply.code(403).send({ error: 'Geçersiz istek kaynağı.' });
    request.account = await authenticate(request);
    if (!request.account) return reply.code(401).send({ error: 'Arkadaşınla oynamak için Google ile giriş yap.' });
  } };
  const guarded = { ...protectedRoute, config: { rateLimit: { max: 120, timeWindow: '1 minute' } } };
  app.post('/api/arena/rooms', guarded, request => arena.create(request.account.id, request.body));
  app.post('/api/arena/rooms/:code/join', guarded, request => arena.join(request.account.id, request.params.code));
  app.post('/api/arena/rooms/:code/ready', guarded, request => arena.ready(request.account.id, request.params.code));
  app.post('/api/arena/rooms/:code/answer', guarded, request => arena.answer(request.account.id, request.params.code, request.body));
  app.post('/api/arena/rooms/:code/leave', guarded, request => arena.leave(request.account.id, request.params.code));
  app.get('/api/arena/rooms/:code', { preHandler: async (request, reply) => {
    request.account = await authenticate(request);
    if (!request.account) return reply.code(401).send({ error: 'Google ile giriş yap.' });
  } }, request => arena.read(request.account.id, request.params.code));
  await friendsRoutes(app, { db, arena, protectedRoute, guarded });
  app.get('/api/arena/leaderboard', async request => {
    const user = await authenticate(request);
    const raw = request.query.start || '0';
    if (!/^\d{1,7}$/.test(String(raw))) fail(400, 'Geçersiz sayfa.');
    return arena.leaderboard(user?.id, Number(raw), request.query.center === 'self');
  });
  app.get('/api/kesif/progress', { preHandler: protectedRoute.preHandler }, async request => {
    const row = (await db.pool.query("SELECT data,revision FROM accounts.app_progress WHERE user_id=$1 AND app='kesif'", [request.account.id])).rows[0];
    return { ...(row || { data: null, revision: 0 }), ownerId: request.account.id };
  });
  app.put('/api/kesif/progress', { ...protectedRoute, bodyLimit: 512 * 1024 }, async (request, reply) => {
    const { data, revision, ownerId } = request.body || {};
    if (ownerId !== request.account.id) fail(409, 'Hesabın değişti. Kaydı göndermeden önce sayfayı yenile.');
    if (!data || data.version !== 1 || !Number.isSafeInteger(data.totalPoints) || data.totalPoints < 0 || !data.games || !data.realms || !Number.isInteger(revision) || revision < 0) fail(400, 'Geçersiz keşif kaydı.');
    // Exploration snapshots are separate from authoritative competitive awards.
    const result = revision === 0
      ? await db.pool.query("INSERT INTO accounts.app_progress(user_id,app,data) VALUES($1,'kesif',$2) ON CONFLICT DO NOTHING RETURNING revision", [request.account.id, data])
      : await db.pool.query("UPDATE accounts.app_progress SET data=$2,revision=revision+1,updated_at=now() WHERE user_id=$1 AND app='kesif' AND revision=$3 RETURNING revision", [request.account.id, data, revision]);
    if (!result.rowCount) return reply.code(409).send({ error: 'İlerlemen başka bir cihazda değişti. Sayfayı yenile.' });
    return result.rows[0];
  });
  return arena;
}
