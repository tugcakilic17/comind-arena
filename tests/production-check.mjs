import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {buildApp,readConfig} from '../server/app.js';

test('production config validates HTTPS, port and explicitly trusted proxy addresses',()=>{
 assert.throws(()=>readConfig({NODE_ENV:'production',APP_URL:'http://example.com/'}));
 for(const PORT of ['oops','0','65536'])assert.throws(()=>readConfig({PORT}));
 for(const TRUST_PROXY of ['true','1'])assert.throws(()=>readConfig({TRUST_PROXY}));
 const config=readConfig({NODE_ENV:'production',APP_URL:'https://game.example/comind-arena/',TRUST_PROXY:'127.0.0.1,::1'});
 assert.equal(config.serveStatic,true);
 assert.equal(config.callback,'https://game.example/api/auth/google/callback');
 assert.equal(config.trustProxy,'127.0.0.1,::1');
});

test('production serves real built files and reports database readiness without exposing failures',async()=>{
 const {base}=JSON.parse(await readFile(new URL('../dist/deployment.json',import.meta.url),'utf8'));
 let available=true;
 const db={pool:{query:async()=>{if(!available)throw new Error('postgres://secret');return {rows:[]};}}};
 const config=readConfig({NODE_ENV:'production',APP_URL:`https://game.example${base}`,TRUST_PROXY:'127.0.0.1'});
 const app=await buildApp({db,config});
 try {
  const home=await app.inject({url:`${base}?room=ABCDEFGH`});
  assert.equal(home.statusCode,200);assert.match(home.body,/<div id="app">/);
  assert.equal(home.headers['x-content-type-options'],'nosniff');
  const js=home.body.match(/src="([^"]+\.js)"/)[1];
  assert.equal((await app.inject(js)).statusCode,200);
  assert.equal((await app.inject(`${base}assets/game-ui/koak-symbols-atlas-v2.webp`)).statusCode,200);
  assert.equal((await app.inject('/api/ready')).statusCode,200);
  available=false;
  const failed=await app.inject('/api/ready');assert.equal(failed.statusCode,503);
  assert.deepEqual(failed.json(),{ok:false});assert.equal(failed.headers['cache-control'],'no-store');
  assert.equal((await app.inject('/api/health')).statusCode,200);
 }finally{await app.close();}
 const mismatched={...config,appUrl:`https://game.example${base==='/'?'/wrong/':'/'}`};
 await assert.rejects(buildApp({db,config:mismatched}),/Derleme yolu APP_URL/);
});

test('release folder includes backend shared imports, migrations and excludes local credentials',async()=>{
 const dirs=await readdir(new URL('../release/',import.meta.url),{withFileTypes:true});
 const ordered=await Promise.all(dirs.filter(d=>d.isDirectory()&&d.name.startsWith('comind-arena-')).map(async ({name})=>({name,mtime:(await stat(new URL(`../release/${name}`,import.meta.url))).mtimeMs})));
 const release=new URL(`../release/${ordered.sort((a,b)=>b.mtime-a.mtime)[0].name}/`,import.meta.url);
 for(const file of ['server/index.js','server/migrations/005-ranking-losses.sql','src/game.js','src/match-rules.js','src/game-worlds.js','dist/deployment.json','package-lock.json','Dockerfile','deploy/compose.yaml'])await readFile(new URL(file,release));
 const entries=await readdir(release);
 for(const name of ['.env','.local','node_modules','design','tests'])assert.ok(!entries.includes(name),`${name} must not be shipped`);
 const {buildApp:buildReleased,readConfig:configReleased}=await import(new URL('server/app.js',release));
 const {base}=JSON.parse(await readFile(new URL('dist/deployment.json',release),'utf8'));
 const app=await buildReleased({db:{pool:{query:async()=>({rows:[]})}},config:configReleased({NODE_ENV:'production',APP_URL:`https://game.example${base}`})});
 try{assert.equal((await app.inject(base)).statusCode,200);}finally{await app.close();}
});
