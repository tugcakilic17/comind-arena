import { randomUUID } from 'node:crypto';
import { ApiError } from './arena.js';

const fail = (status, message) => { throw new ApiError(status, message); };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pair = (a,b) => [a,b].sort();
const publicPlayer = row => ({ id:row.id,name:row.display_name,publicCode:row.public_code,avatar:row.avatar });

export async function friendsRoutes(app, { db, arena, protectedRoute, guarded }) {
  const checkedId = value => { if (!uuid.test(value || '')) fail(400,'Geçersiz arkadaş.'); return value; };
  app.get('/api/arena/friends', protectedRoute, async request => {
    const id=request.account.id;
    const relations=(await db.pool.query(`SELECT u.id,u.display_name,u.public_code,u.avatar,f.status,f.requester_id
      FROM accounts.friendships f JOIN accounts.users u ON u.id=CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END
      WHERE $1 IN (f.user_a,f.user_b) ORDER BY f.created_at DESC LIMIT 200`,[id])).rows;
    const invites=(await db.pool.query(`SELECT i.id,i.sender_id,i.receiver_id,r.code,r.state->'options' AS options,
      u.display_name,u.public_code,u.avatar FROM arena.invites i JOIN arena.rooms r ON r.id=i.room_id
      JOIN accounts.users u ON u.id=CASE WHEN i.receiver_id=$1 THEN i.sender_id ELSE i.receiver_id END
      WHERE $1 IN (i.sender_id,i.receiver_id) AND i.status='pending' AND r.state->>'status'='waiting'
      AND i.created_at > now()-interval '15 minutes' AND (r.state->>'createdAt')::bigint > extract(epoch from now())*1000-900000
      ORDER BY i.created_at DESC LIMIT 100`,[id])).rows;
    return { friends:relations.filter(row=>row.status==='accepted').map(publicPlayer),
      incoming:relations.filter(row=>row.status==='pending'&&row.requester_id!==id).map(publicPlayer),
      outgoing:relations.filter(row=>row.status==='pending'&&row.requester_id===id).map(publicPlayer),
      invites:invites.map(row=>({id:row.id,code:row.code,options:row.options,sent:row.sender_id===id,player:publicPlayer({...row,id:row.sender_id===id?row.receiver_id:row.sender_id})})) };
  });
  app.post('/api/arena/friends/request', { ...guarded, config:{ rateLimit:{max:20,timeWindow:'1 minute'} } }, async request => {
    const code=typeof request.body?.code==='string'?request.body.code.trim().toUpperCase():'';
    if (!/^[A-Z]{4}[0-9]{4}$/.test(code)) fail(400,'Kullanıcı ID 4 harf ve 4 rakamdan oluşmalı.');
    const other=(await db.pool.query('SELECT id FROM accounts.users WHERE public_code=$1',[code])).rows[0];
    const id=request.account.id;
    if (!other) fail(404,'Bu ID ile bir oyuncu bulunamadı.');
    if (other.id===id) fail(400,'Bu senin ID’n. Arkadaşının ID’sini girmelisin.');
    const result=await db.pool.query('INSERT INTO accounts.friendships(user_a,user_b,requester_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING status',[...pair(id,other.id),id]);
    if (!result.rowCount) {
      const existing=(await db.pool.query('SELECT status,requester_id FROM accounts.friendships WHERE user_a=$1 AND user_b=$2',pair(id,other.id))).rows[0];
      fail(409,existing?.status==='accepted'?'Zaten arkadaşsınız.':existing?.requester_id===id?'Arkadaşlık isteğin zaten gönderildi.':'Bu oyuncudan bir isteğin var. Gelen isteklerden kabul edebilirsin.');
    }
    return {message:'Arkadaşlık isteği gönderildi!'};
  });
  app.post('/api/arena/friends/:id/accept',guarded,async request => {
    const id=request.account.id,other=checkedId(request.params.id);
    const result=await db.pool.query("UPDATE accounts.friendships SET status='accepted' WHERE user_a=$1 AND user_b=$2 AND status='pending' AND requester_id<>$3 RETURNING status",[...pair(id,other),id]);
    if (!result.rowCount) fail(404,'Kabul edilecek bir istek bulunamadı.');
    return {message:'Artık arkadaşsınız!'};
  });
  for (const action of ['reject','remove']) app.post(`/api/arena/friends/:id/${action}`,guarded,async request => {
    const id=request.account.id,other=checkedId(request.params.id);
    await db.pool.query(`DELETE FROM accounts.friendships WHERE user_a=$1 AND user_b=$2 ${action==='reject'?"AND status='pending'":''}`,pair(id,other));
    await db.pool.query("UPDATE arena.invites SET status='declined' WHERE status='pending' AND ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1))",[id,other]);
    return {message:action==='reject'?'İstek kaldırıldı.':'Arkadaş listenden kaldırıldı.'};
  });
  app.post('/api/arena/friends/:id/invite',guarded,async request => {
    const id=request.account.id,other=checkedId(request.params.id);
    const relation=(await db.pool.query("SELECT 1 FROM accounts.friendships WHERE user_a=$1 AND user_b=$2 AND status='accepted'",pair(id,other))).rowCount;
    if (!relation) fail(403,'Yalnızca arkadaşlarına davet gönderebilirsin.');
    const room=await arena.read(id,request.body?.roomCode);
    if (room.status!=='waiting') fail(409,'Davet için önce bir oda oluştur.');
    if (room.players.some(player=>player?.id===other)) fail(409,'Arkadaşın zaten odada.');
    if (room.players.every(Boolean)) fail(409,'Odada boş yer kalmadı.');
    const result=await db.pool.query(`INSERT INTO arena.invites(id,room_id,sender_id,receiver_id) VALUES($1,$2,$3,$4)
      ON CONFLICT(room_id,receiver_id) DO UPDATE SET sender_id=excluded.sender_id,status='pending',created_at=now()
      WHERE arena.invites.status<>'pending' RETURNING id`,[randomUUID(),room.id,id,other]);
    if (!result.rowCount) fail(409,'Bu oda için davetin zaten gönderildi.');
    return {message:'Oda daveti gönderildi!'};
  });
  app.post('/api/arena/invites/:id/decline',guarded,async request => {
    await db.pool.query("UPDATE arena.invites SET status='declined' WHERE id=$1 AND receiver_id=$2",[checkedId(request.params.id),request.account.id]);
    return {message:'Davet kapatıldı.'};
  });
}
