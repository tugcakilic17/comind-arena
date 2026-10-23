import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import EmbeddedPostgres from 'embedded-postgres';
import { createDatabase } from '../server/database.js';
import { createArena } from '../server/arena.js';
import { buildApp, readConfig, hashToken } from '../server/app.js';
import { sharedSymbol } from '../src/game.js';

let directory, postgres, db, arena, app, clock, users;
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'kesif-arena-'));
  postgres = new EmbeddedPostgres({ databaseDir: path.join(directory, 'postgres'), user: 'test', password: 'test-only', port: 55434, persistent: true, authMethod: 'scram-sha-256', initdbFlags: ['--encoding=UTF8','--locale=C'], postgresFlags: ['-h','127.0.0.1','-c','io_method=sync'], onLog() {}, onError() {} });
  await postgres.initialise(); await postgres.start();
  db = createDatabase('postgresql://test:test-only@127.0.0.1:55434/postgres'); await db.migrate();
  app = await buildApp({ db, config: readConfig({ APP_URL:'http://localhost:5174/', KESIF_URL:'http://localhost:5173/' }) });
});
beforeEach(async () => {
  await db.pool.query('TRUNCATE accounts.users,accounts.sessions,accounts.google_flows CASCADE');
  clock = Date.now(); arena = createArena(db, { now: () => clock }); users = [];
  for (let index=0; index<5; index++) {
    const secret = randomBytes(32).toString('hex');
    const user = await db.signIn({ sub:`person-${index}`,email:`${index}@example.test`,name:`Oyuncu ${index}` }, hashToken(secret), new Date(clock+3600_000));
    users.push({ ...user, cookie:`kesif_session=${secret}` });
  }
});
after(async () => {
  await app?.close(); await db?.close(); await postgres?.stop();
  if (directory && path.dirname(path.resolve(directory)) === path.resolve(tmpdir()) && path.basename(directory).startsWith('kesif-arena-')) await rm(directory, { recursive:true, force:true, maxRetries:10, retryDelay:200 });
});
async function begin(options={}) {
  let room=await arena.create(users[0].id,options);
  for(let i=1;i<room.options.capacity;i++) await arena.join(users[i].id,room.code);
  for(let i=0;i<room.options.capacity;i++) room=await arena.ready(users[i].id,room.code);
  assert.equal(room.status,'playing');return room;
}
async function answer(room, index) {
  clock = room.turnAt+200;
  return arena.answer(users[index].id,room.code,{ round:room.round,symbol:sharedSymbol(room.pair) });
}
async function seedBalance(index, points) {
  const old=await arena.create(users[index].id);
  await arena.leave(users[index].id,old.code);
  await db.pool.query("INSERT INTO arena.awards(room_id,user_id,points,outcome) VALUES($1,$2,$3,'win')",[old.id,users[index].id,points]);
}
test('rooms validate their fixed settings, account ownership, capacity and CSRF',async()=>{
  for(const value of [{capacity:5},{capacity:'3'},{winTarget:7},{symbolCount:9},{rule:'collect'},{theme:'classic'},{theme:'toString'},{theme:null},{theme:[]},null])
    await assert.rejects(arena.create(users[0].id,value),{statusCode:400});
  const room=await arena.create(users[0].id,{capacity:2,winTarget:5,symbolCount:8});
  assert.equal(room.options.theme,'kofen');
  assert.equal((await arena.join(users[0].id,room.code)).you,0); // safe link re-open, no duplicate seat
  assert.equal((await arena.ready(users[0].id,room.code)).status,'waiting');
  await arena.join(users[1].id,room.code);
  await assert.rejects(arena.join(users[2].id,room.code),{statusCode:409});
  await assert.rejects(arena.read(users[2].id,room.code),{statusCode:403});
  assert.equal((await app.inject({method:'POST',url:'/api/arena/rooms',headers:{origin:'http://localhost:5174'}})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url:'/api/arena/rooms',headers:{origin:'https://attacker.test',cookie:users[2].cookie}})).statusCode,403);
});

test('the host world persists for every player, fixes the fifteen-symbol pool and cannot change after room creation',async()=>{
  for(const theme of ['koak','kofen','komat','kuik']){
    let room=await begin({theme,capacity:2,symbolCount:8,winTarget:5});
    assert.equal(room.options.theme,theme);
    const attempted=await arena.create(users[0].id,{theme:theme==='koak'?'kuik':'koak'});
    assert.equal(attempted.code,room.code);
    assert.equal(attempted.options.theme,theme);
    for(let round=0;round<3;round++){
      const guest=await arena.read(users[1].id,room.code);
      assert.equal(guest.options.theme,theme);
      assert.deepEqual(guest.pair,room.pair);
      for(const card of room.pair){
        assert.equal(card.length,8);
        assert.equal(new Set(card).size,8);
        assert.ok(card.every(id=>Number.isInteger(id)&&id>=0&&id<15));
      }
      assert.equal(room.pair[0].filter(id=>room.pair[1].includes(id)).length,1);
      room=await answer(room,0);
    }
    const restored=await createArena(db,{now:()=>clock}).read(users[1].id,room.code);
    assert.equal(restored.options.theme,theme);
    assert.deepEqual(restored.pair,room.pair);
    await arena.leave(users[0].id,room.code);
    await arena.leave(users[1].id,room.code);
  }
});
test('all 3–8 symbol settings yield exactly one shared symbol and correct capacity',async()=>{
  for(let count=3;count<=8;count++){
    const room=await begin({capacity:count%2?3:4,symbolCount:count,winTarget:5});
    assert.equal(room.players.filter(Boolean).length,room.options.capacity);
    for(const card of room.pair){assert.equal(card.length,count);assert.equal(new Set(card).size,count);}
    assert.equal(room.pair[0].filter(id=>room.pair[1].includes(id)).length,1);
    await arena.leave(users[0].id,room.code);
    for(let i=1;i<room.options.capacity;i++) await arena.leave(users[i].id,room.code);
  }
});
test('waiting guests can leave, seats refill, and every player must ready again',async()=>{
  let room=await arena.create(users[0].id,{capacity:3});
  await arena.join(users[1].id,room.code);await arena.ready(users[0].id,room.code);
  room=await arena.leave(users[1].id,room.code);
  assert.equal(room.status,'waiting');assert.deepEqual(room.ready,[false,false,false]);
  await assert.rejects(arena.read(users[1].id,room.code),{statusCode:403});
  await arena.join(users[2].id,room.code);await arena.join(users[3].id,room.code);
  await arena.ready(users[0].id,room.code);
  assert.equal((await arena.ready(users[2].id,room.code)).status,'waiting');
  room=await arena.ready(users[3].id,room.code);
  assert.equal(room.status,'playing');
  await assert.rejects(arena.join(users[4].id,room.code),{statusCode:409});
  const another=await arena.create(users[4].id);
  await assert.rejects(arena.join(users[2].id,another.code),{statusCode:409});
});
test('wrong, early, stale and forged selections never award points; simultaneous clicks award just one round', async () => {
  let room = await begin();
  room = await arena.answer(users[0].id,room.code,{round:1,symbol:sharedSymbol(room.pair)});
  assert.deepEqual(room.scores,[0,0]);
  assert.throws(() => arena.answer(users[0].id,room.code,{round:1,symbol:2,score:10000}),{statusCode:400});
  clock=room.turnAt+200;
  const wrong=(sharedSymbol(room.pair)+1)%31;
  assert.deepEqual((await arena.answer(users[0].id,room.code,{round:1,symbol:wrong})).scores,[0,0]);
  clock+=400;
  const body={round:1,symbol:sharedSymbol(room.pair)};
  await Promise.all([arena.answer(users[0].id,room.code,body),arena.answer(users[1].id,room.code,body)]);
  room=await arena.read(users[0].id,room.code);
  assert.equal(room.scores.reduce((a,b)=>a+b),1);
  assert.equal(room.round,2);
  assert.equal((await arena.leaderboard(users[0].id)).total,0);
});
test('first player to target wins and a completed friend match awards ranking exactly once',async()=>{
  let room=await begin({capacity:4,winTarget:5,symbolCount:8});
  for(let i=0;i<8;i++) room=await answer(room,i%2);
  assert.deepEqual(room.scores,[4,4,0,0]);assert.equal(room.status,'playing');
  room=await answer(room,1);
  assert.equal(room.status,'finished');assert.equal(room.winner,1);assert.deepEqual(room.scores,[4,5,0,0]);
  const restarted=createArena(db,{now:()=>clock});
  const restored=await restarted.read(users[0].id,room.code);
  assert.equal(restored.winner,1);assert.deepEqual(restored.options,{capacity:4,winTarget:5,symbolCount:8,theme:'kofen'});
  await restarted.leave(users[1].id,room.code);
  assert.deepEqual(room.points,[10,30,0,0]);assert.deepEqual(room.placements,[2,1,3,3]);
  await Promise.all(Array.from({length:5},()=>restarted.read(users[0].id,room.code)));
  assert.equal((await db.pool.query('SELECT count(*)::integer AS count FROM arena.awards')).rows[0].count,4);
  const table=await restarted.leaderboard(users[0].id);
  assert.equal(table.total,4);assert.equal(table.self.score,10);
});

for (const capacity of [2,3,4]) test(`${capacity}-player ranking awards follow placement, including the last-place deduction`,async()=>{
  for(let i=0;i<capacity;i++) await seedBalance(i,50);
  let room=await begin({capacity,winTarget:5});
  for(let i=0;i<capacity-1;i++) for(let count=0;count<i;count++) room=await answer(room,i);
  for(let count=0;count<5;count++) room=await answer(room,capacity-1);
  const expected={2:[-10,30],3:[-10,10,30],4:[-10,0,10,30]}[capacity];
  assert.deepEqual(room.points,expected);
  assert.deepEqual(room.rankingTotals,expected.map(points=>50+points));
  assert.deepEqual(room.placements,Array.from({length:capacity},(_,i)=>capacity-i));
  for(let i=0;i<capacity;i++) assert.equal((await arena.leaderboard(users[i].id)).self.score,50+expected[i]);
  await db.migrate(); // Signed deductions survive repeatable migrations and a restart.
  assert.deepEqual((await createArena(db,{now:()=>clock}).read(users[0].id,room.code)).points,expected);
});

test('the first loss stays at zero and a partial balance loses only what is available',async()=>{
  let room=await begin({winTarget:5});
  for(let i=0;i<5;i++) room=await answer(room,1);
  assert.deepEqual(room.points,[0,30]);assert.equal((await arena.leaderboard(users[0].id)).self.score,0);
  await seedBalance(0,5);
  room=await begin({winTarget:5});
  for(let i=0;i<5;i++) room=await answer(room,1);
  assert.deepEqual(room.points,[-5,30]);assert.equal((await arena.leaderboard(users[0].id)).self.score,0);
});

test('equal scores share their place and ranking award',async()=>{
  for(let i=0;i<4;i++) await seedBalance(i,50);
  let room=await begin({capacity:4,winTarget:5});
  for(const index of [0,1,0,1,3,3,3,3,3]) room=await answer(room,index);
  assert.deepEqual(room.placements,[2,2,4,1]);assert.deepEqual(room.points,[10,10,-10,30]);
});

test('concurrent completed matches cannot deduct a shared player below zero',async()=>{
  await seedBalance(0,5);
  let first=await begin({capacity:3,winTarget:5});
  for(let i=0;i<4;i++) first=await answer(first,1);
  await arena.leave(users[0].id,first.code);
  let second=await arena.create(users[0].id,{capacity:2,winTarget:5});
  await arena.join(users[3].id,second.code);await arena.ready(users[0].id,second.code);
  second=await arena.ready(users[3].id,second.code);
  for(let i=0;i<4;i++) second=await answer(second,3);
  clock=Math.max(first.turnAt,second.turnAt)+200;
  const results=await Promise.all([[first,1],[second,3]].map(([room,index])=>arena.answer(users[index].id,room.code,{round:room.round,symbol:sharedSymbol(room.pair)})));
  assert.equal(results[0].points[0]+results[1].points[0],-5);
  assert.equal((await arena.leaderboard(users[0].id)).self.score,0);
});
test('simultaneous four-player answers serialize into a single score and one winner',async()=>{
  let room=await begin({capacity:4,winTarget:5});
  for(let i=0;i<4;i++) room=await answer(room,0);
  clock=room.turnAt+200;
  const body={round:room.round,symbol:sharedSymbol(room.pair)};
  await Promise.all(users.slice(0,4).map(u=>arena.answer(u.id,room.code,body)));
  room=await arena.read(users[0].id,room.code);
  assert.equal(room.scores.reduce((a,b)=>a+b),5);
  assert.equal(room.winners.length,5);
});
test('3–4 player matches continue after a departure; final remaining player wins',async()=>{
  let room=await answer(await begin({capacity:4}),0);
  room=await arena.leave(users[0].id,room.code);assert.equal(room.status,'playing');
  clock=room.turnAt+200;
  await assert.rejects(arena.answer(users[0].id,room.code,{round:room.round,symbol:sharedSymbol(room.pair)}),{statusCode:403});
  await assert.rejects(arena.join(users[0].id,room.code),{statusCode:409});
  room=await arena.leave(users[1].id,room.code);assert.equal(room.status,'playing');
  room=await arena.leave(users[2].id,room.code);assert.equal(room.status,'finished');assert.equal(room.winner,3);
  assert.deepEqual(room.points,[10,0,0,30]);
  let other=await answer(await begin(),1);clock+=30_000;await arena.read(users[1].id,other.code);clock+=16_000;
  other=await arena.read(users[1].id,other.code);assert.equal(other.reason,'disconnect');assert.equal(other.winner,1);
  const waiting=await arena.create(users[0].id);clock+=15*60_000+1;await arena.sweep();
  assert.equal((await arena.read(users[0].id,waiting.code)).status,'cancelled');
});
test('simultaneous disconnects cannot crown a stale player, and existing ranking remains intact',async()=>{
  await seedBalance(0,30);
  let room=await answer(await begin({capacity:4}),0);
  clock+=30_000;await arena.read(users[3].id,room.code);clock+=16_000;
  room=await arena.read(users[3].id,room.code);assert.equal(room.winner,3);assert.equal(room.status,'finished');
  const table=await arena.leaderboard(users[0].id);assert.equal(table.self.score,40);assert.equal(table.total,4);
  assert.ok(!JSON.stringify(table).includes('example.test'));
});
test('legacy completed rooms keep their draw/winner, identity and existing awards',async()=>{
  const room=await arena.create(users[0].id);await arena.join(users[1].id,room.code);
  const state={status:'finished',ready:[true,true],scores:[5,5],winners:[0,1],round:10,lastSeen:[clock,clock],forfeiter:null,points:[10,10]};
  await db.pool.query('UPDATE arena.rooms SET state=$2 WHERE id=$1',[room.id,state]);
  const old=await arena.read(users[0].id,room.code);
  assert.equal(old.winner,null);assert.deepEqual(old.points,[10,10]);assert.equal(old.players[1].id,users[1].id);
});
const call=(index,url,payload,method='POST')=>app.inject({method,url:`/api/arena/${url}`,headers:{origin:'http://localhost:5174',cookie:users[index].cookie},...(payload?{payload}:{})});
const social=index=>call(index,'friends',null,'GET');
test('friend requests need recipient consent, stay private, and use public player IDs',async()=>{
  const code=(await db.pool.query('SELECT public_code FROM accounts.users WHERE id=$1',[users[1].id])).rows[0].public_code;
  assert.equal((await call(0,'friends/request',{code:code.toLowerCase()})).statusCode,200);
  assert.equal((await call(0,'friends/request',{code})).statusCode,409);
  assert.equal((await call(0,`friends/${users[1].id}/accept`)).statusCode,404);
  assert.equal((await social(1)).json().incoming.length,1);
  assert.equal((await social(2)).json().incoming.length,0);
  assert.equal((await call(1,`friends/${users[0].id}/accept`)).statusCode,200);
  const list=(await social(0)).json();assert.equal(list.friends.length,1);assert.equal(list.friends[0].publicCode,code);
  assert.ok(!JSON.stringify(list).includes('email'));assert.ok(!JSON.stringify(list).includes('google'));
  assert.equal((await call(0,'friends/request',{code:'bad'})).statusCode,400);
  assert.equal((await call(0,'friends/request',{code:'ZZZZ0000'})).statusCode,404);
  assert.equal((await call(2,`friends/${users[0].id}/remove`)).statusCode,200);
  assert.equal((await social(0)).json().friends.length,1);
  await call(1,`friends/${users[0].id}/remove`);
  assert.equal((await social(0)).json().friends.length,0);
});
test('friend invitations are scoped to accepted friends and a waiting room; accepting joins persistently',async()=>{
  const code=(await db.pool.query('SELECT public_code FROM accounts.users WHERE id=$1',[users[1].id])).rows[0].public_code;
  const room=(await call(0,'rooms',{capacity:3,symbolCount:8,winTarget:15})).json();
  assert.equal((await call(0,`friends/${users[1].id}/invite`,{roomCode:room.code})).statusCode,403);
  await call(0,'friends/request',{code});await call(1,`friends/${users[0].id}/accept`);
  assert.equal((await call(2,`friends/${users[1].id}/invite`,{roomCode:room.code})).statusCode,403);
  assert.equal((await call(0,`friends/${users[1].id}/invite`,{roomCode:room.code})).statusCode,200);
  assert.equal((await call(0,`friends/${users[1].id}/invite`,{roomCode:room.code})).statusCode,409);
  const invitation=(await social(1)).json().invites[0];assert.equal(invitation.code,room.code);assert.equal(invitation.options.winTarget,15);
  await call(2,`invites/${invitation.id}/decline`);assert.equal((await social(1)).json().invites.length,1);
  const joined=await call(1,`rooms/${invitation.code}/join`);assert.equal(joined.statusCode,200);assert.equal(joined.json().you,1);
  assert.equal((await social(1)).json().invites.length,0);
  assert.equal((await call(1,`rooms/${room.code}`,null,'GET')).json().players[0].id,users[0].id);
  assert.equal((await call(0,`friends/${users[1].id}/invite`,{roomCode:room.code})).statusCode,409);
});

test('Keşif progress is account scoped, revision protected and never grants Arena ranking points', async () => {
  const headers={cookie:users[0].cookie,origin:'http://localhost:5173'};
  const data={version:1,totalPoints:123,games:{},realms:{}};
  const write=await app.inject({method:'PUT',url:'/api/kesif/progress',headers,payload:{data,revision:0,ownerId:users[0].id}});
  assert.equal(write.statusCode,200);
  const read=await app.inject({url:'/api/kesif/progress',headers}); assert.equal(read.json().data.totalPoints,123);
  const another=await app.inject({url:'/api/kesif/progress',headers:{cookie:users[1].cookie}}); assert.equal(another.json().data,null);
  assert.equal((await app.inject({method:'PUT',url:'/api/kesif/progress',headers,payload:{data,revision:0,ownerId:users[0].id}})).statusCode,409);
  assert.equal((await app.inject({method:'PUT',url:'/api/kesif/progress',headers,payload:{data,revision:1,ownerId:users[1].id}})).statusCode,409);
  assert.equal((await arena.leaderboard(users[0].id)).total,0);
  assert.equal((await app.inject({method:'POST',url:'/api/auth/logout',headers})).statusCode,200);
  assert.equal((await app.inject({url:'/api/auth/me',headers})).json().user,null);
});
