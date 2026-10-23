// Real HTTP + PostgreSQL + two isolated browser sessions. No test login route.
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import EmbeddedPostgres from 'embedded-postgres';
import { createDatabase } from '../server/database.js';
import { buildApp, readConfig, hashToken } from '../server/app.js';
import { getSymbolSet } from '../src/symbol-sets.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const kesif=process.env.KESIF_PROJECT_DIR || path.resolve(root,'../guncel_projeler/kesif-dunyasi');
const withKesif=process.env.COMIND_TEST_KESIF!=='false';
let directory, postgres, db, app, front, world, browser;
try {
  directory=await mkdtemp(path.join(tmpdir(),'kesif-browser-'));
  postgres=new EmbeddedPostgres({databaseDir:path.join(directory,'postgres'),user:'test',password:'browser-test-only',port:55435,persistent:true,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1','-c','io_method=sync'],onLog(){},onError(){}});
  await postgres.initialise();await postgres.start();
  db=createDatabase('postgresql://test:browser-test-only@127.0.0.1:55435/postgres');await db.migrate();
  app=await buildApp({db,config:readConfig({APP_URL:'http://localhost:5176/',KESIF_URL:'http://localhost:5177/',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-only'})});
  await app.listen({host:'127.0.0.1',port:3011});
  const proxy={'/api':{target:'http://127.0.0.1:3011',changeOrigin:false}};
  front=await createServer({root,configFile:path.join(root,'vite.config.js'),server:{host:'127.0.0.1',port:5176,strictPort:true,proxy},logLevel:'error'});await front.listen();
  if(withKesif){world=await createServer({root:path.join(kesif,'apps/web'),configFile:path.join(kesif,'apps/web/vite.config.ts'),server:{host:'127.0.0.1',port:5177,strictPort:true,proxy},logLevel:'error'});await world.listen();}
  browser=await chromium.launch({channel:'msedge',headless:true});
  const contexts=[],accounts=[];
  for(const [index,name] of ['Ada','Bora','Cem','Deniz'].entries()){
    const secret=randomBytes(32).toString('hex');
    const user=await db.signIn({sub:`browser-player-${index}`,email:`${index}@example.test`,name},hashToken(secret),new Date(Date.now()+3600_000));
    const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
    await context.addCookies([{name:'kesif_session',value:secret,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
    contexts.push(context);accounts.push(user);
  }
  const errors=[],pages=[];
  for(const context of contexts){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));pages.push(page);}
  const [a,b,c,d]=pages;
  await mkdir(path.join(root,'test-results/online'),{recursive:true});
  const checkFit=async(page,label)=>{
    const box=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
    assert.ok(box.sw<=box.w+1&&box.sh<=box.h+1,`${label} fits: ${JSON.stringify(box)}`);
  };
  const scanQr=async page=>{
    const png=PNG.sync.read(await page.getByRole('img',{name:'Odanın davet QR kodu',exact:true}).screenshot());
    return jsQR(new Uint8ClampedArray(png.data),png.width,png.height)?.data;
  };
  for(const page of pages) await page.goto('http://localhost:5176/');
  for(const [i,page] of pages.entries()) await page.getByRole('button',{name:`${['Ada','Bora','Cem','Deniz'][i]}, profilim`,exact:true}).waitFor();
  for(const page of [a,b]) await page.getByRole('button',{name:'Arkadaşını Çağır',exact:true}).click();
  await a.getByRole('button',{name:'Arkadaşlarım',exact:true}).click();
  const bora=(await db.pool.query('SELECT public_code FROM accounts.users WHERE id=$1',[accounts[1].id])).rows[0].public_code;
  await a.getByLabel('Arkadaşının kullanıcı ID’si').fill(bora);
  await a.getByRole('button',{name:'İstek gönder',exact:true}).click();
  await a.getByText('Arkadaşlık isteği gönderildi!',{exact:true}).waitFor();
  await b.getByRole('button',{name:/Arkadaşlarım/}).click();
  await b.getByRole('button',{name:'Kabul et',exact:true}).click();
  await b.getByText('Artık arkadaşsınız!',{exact:true}).waitFor();
  await a.locator('.online-friend-list').getByText('Bora',{exact:true}).waitFor();
  assert.equal(await a.getByRole('button',{name:'Davet et',exact:true}).count(),0);
  await a.getByRole('button',{name:'Oda oluştur',exact:true}).click();
  await a.locator('.online-setup').waitFor();
  assert.equal((await db.pool.query('SELECT count(*)::integer AS count FROM arena.rooms')).rows[0].count,0,'Opening room settings never creates a room or sends an invitation');
  assert.equal((await db.pool.query('SELECT count(*)::integer AS count FROM arena.invites')).rows[0].count,0);
  await a.getByLabel('Oyun dünyası: Kofen',{exact:true}).click();
  await a.getByRole('button',{name:'Koak · Deniz',exact:true}).click();
  assert.equal(await a.locator('.online-world-picker').getAttribute('open'),null);
  assert.ok(await a.getByLabel('Oyun dünyası: Koak',{exact:true}).isVisible());
  assert.equal((await db.pool.query('SELECT count(*)::integer AS count FROM arena.rooms')).rows[0].count,0,'Selecting a world does not create a room');
  await a.getByLabel('Oyun dünyası: Koak',{exact:true}).click();
  await a.screenshot({path:path.join(root,'test-results/online/world-picker-desktop.png')});
  await a.keyboard.press('Escape');
  await a.getByRole('button',{name:'Oyuncu sayısı: 4',exact:true}).click();
  await a.getByRole('button',{name:'Kazanmak için doğru sayısı: 5',exact:true}).click();
  await a.getByRole('button',{name:'Altıgendeki simge sayısı: 8',exact:true}).click();
  for(const [width,height] of [[1366,768],[1024,600],[390,844],[360,640],[844,390]]){
    await a.setViewportSize({width,height});await checkFit(a,`setup ${width}x${height}`);
    await a.screenshot({path:path.join(root,`test-results/online/setup-${width}x${height}.png`)});
    await a.getByLabel('Oyun dünyası: Koak',{exact:true}).click();
    assert.ok(await a.locator('.online-world-menu').evaluate(el=>{
      const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;
    }),`world picker fits ${width}x${height}`);
    if(width===390)await a.screenshot({path:path.join(root,'test-results/online/world-picker-mobile.png')});
    await a.keyboard.press('Escape');
  }
  await a.setViewportSize({width:1366,height:768});
  await a.locator('.online-setup').getByRole('button',{name:'Oda oluştur',exact:true}).click();
  await a.locator('#invite-link').waitFor();
  const link=await a.locator('#invite-link').inputValue();
  const code=new URL(link).searchParams.get('room');
  assert.equal((await a.request.get(`http://localhost:5176/api/arena/rooms/${code}`)).status(),200);
  assert.equal((await (await a.request.get(`http://localhost:5176/api/arena/rooms/${code}`)).json()).options.theme,'koak');
  const scannedLink=await scanQr(a);
  assert.equal(scannedLink,link,'Scanning the displayed QR returns exactly the invitation link');
  assert.equal(await a.getByText('Telefondan katılım için oyunun internet adresinde açılması gerekir.',{exact:true}).count(),0);
  assert.equal(await a.locator('.online-code,[data-action="online-copy-code"]').count(),0);
  assert.equal(new URL(link).searchParams.get('room'),code);
  const whatsapp=new URL(await a.getByRole('link',{name:'WhatsApp ile paylaş'}).getAttribute('href'));
  assert.equal(whatsapp.hostname,'wa.me');assert.ok(whatsapp.searchParams.get('text').includes(link));assert.ok(!whatsapp.searchParams.get('text').includes('Oda kodu'));
  await a.locator('[data-action="online-copy"]').click();
  assert.equal(await a.evaluate(()=>navigator.clipboard.readText()),link);
  await a.getByRole('button',{name:'Arkadaş listemden davet et',exact:true}).click();
  await a.getByRole('button',{name:'Davet et',exact:true}).click();
  await b.getByRole('button',{name:'Katıl',exact:true}).click();
  await b.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).waitFor();
  await c.getByRole('button',{name:'Arkadaşını Çağır',exact:true}).click();
  await c.getByLabel('Davet bağlantısı').fill(link);
  // Polling must preserve a partly typed invite and its caret.
  await c.waitForTimeout(1700);assert.equal(await c.getByLabel('Davet bağlantısı').inputValue(),link);
  await c.getByRole('button',{name:'Odaya katıl',exact:true}).click();
  await d.goto(scannedLink);await d.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).waitFor();
  await a.getByRole('button',{name:'Odam',exact:true}).click();
  await a.getByText('4 / 4 oyuncu',{exact:true}).waitFor();
  for(const [width,height] of [[1366,768],[390,844],[360,640],[844,390]]){
    await a.setViewportSize({width,height});await checkFit(a,`lobby ${width}x${height}`);
    assert.equal(await scanQr(a),link,`QR remains readable at ${width}x${height}`);
    assert.ok(await a.locator('.online-share-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Share controls stay inside their card');
    await a.mouse.move(0,0);
    const buttonStyles=await a.evaluate(()=>{
      const appearance=selector=>{
        const style=getComputedStyle(document.querySelector(selector));
        return ['backgroundImage','color','borderColor','borderRadius','boxShadow'].map(key=>style[key]);
      };
      return {ready:appearance('.online-lobby-actions .online-primary'),whatsapp:appearance('.online-whatsapp'),friend:appearance('.online-share-actions [data-action="online-tab"]')};
    });
    assert.deepEqual(buttonStyles.whatsapp,buttonStyles.ready,`WhatsApp matches ready button styling at ${width}x${height}`);
    assert.deepEqual(buttonStyles.friend,buttonStyles.ready,`Friend invitation matches ready button styling at ${width}x${height}`);
    await a.screenshot({path:path.join(root,`test-results/online/lobby-${width}x${height}.png`)});
  }
  await a.setViewportSize({width:1366,height:768});
  for(const page of pages) await page.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).click();
  for(const page of pages) await page.locator('#online-board').waitFor();
  assert.equal(await a.locator('.online-cards .symbol').count(),16);
  assert.ok(await a.locator('.board-title img[src$="title-find-leafy-v17.webp"]').isVisible());
  assert.equal(await a.locator('.online-game-hint').count(),0);
  for(const [width,height] of [[1366,768],[390,844],[360,640],[844,390]]){
    await a.setViewportSize({width,height});await checkFit(a,`match ${width}x${height}`);
    const dimensions=await a.locator('.online-cards .hex-card').first().boundingBox();assert.ok(dimensions.width>100&&dimensions.height>100);
    await a.screenshot({path:path.join(root,`test-results/online/match-${width}x${height}.png`)});
  }
  await a.setViewportSize({width:1366,height:768});
  await b.emulateMedia({reducedMotion:'no-preference'});
  await b.evaluate(()=>{
    const original=document.startViewTransition?.bind(document);
    if(original) document.startViewTransition=callback=>{
      const start=performance.now(),transition=original(callback);
      transition.finished.then(()=>{window.__resultTransitionDuration=performance.now()-start;});return transition;
    };
  });
  await a.waitForFunction(()=>!document.querySelector('#online-board')?.inert);
  for(const page of pages){
    assert.ok(await page.locator('.forest-background').evaluate(el=>getComputedStyle(el).backgroundImage.includes('sea-calm-v1')));
    const symbols=await page.locator('#online-board [data-symbol]').evaluateAll(items=>items.map(el=>({id:Number(el.dataset.symbol),label:el.getAttribute('aria-label'),image:getComputedStyle(el.querySelector('.game-symbol-art')).backgroundImage})));
    assert.ok(symbols.every(symbol=>symbol.id<15&&symbol.label.startsWith(getSymbolSet('koak').names[symbol.id])&&symbol.image.includes('koak-symbols-atlas-v2.webp')));
  }
  const wrong=await a.locator('.online-cards .player-card').evaluateAll(cards=>{
    const opponent=[...cards[1].querySelectorAll('[data-symbol]')].map(el=>el.dataset.symbol);
    return [...cards[0].querySelectorAll('[data-symbol]')].find(el=>!opponent.includes(el.dataset.symbol)).dataset.symbol;
  });
  await b.locator('.online-cards .player-card').first().locator(`[data-symbol="${wrong}"]`).click();
  await b.waitForFunction(()=>!document.querySelector('#online-board')?.inert);
  assert.equal(await b.getByText('Tekrar dene!',{exact:true}).count(),0);
  for(let round=1;round<=9;round++){
    const player=round%2===0||round===9?b:a;
    await player.waitForFunction(expected=>document.querySelector('#online-board')?.dataset.round===String(expected)&&!document.querySelector('#online-board')?.inert,round);
    assert.equal(await player.getByText('Kendi altıgenindeki ortak simgeye dokun!',{exact:true}).count(),0);
    const symbol=await player.locator('.online-cards .player-card').evaluateAll(cards=>{
      const left=[...cards[0].querySelectorAll('[data-symbol]')].map(el=>el.dataset.symbol);
      const right=[...cards[1].querySelectorAll('[data-symbol]')].map(el=>el.dataset.symbol);
      return left.find(id=>right.includes(id));
    });
    await player.locator('.online-cards .player-card').first().locator(`[data-symbol="${symbol}"]`).click();
    assert.ok(!/Yeni eşleşme|\+1/.test(await player.locator('.online-countdown').textContent()));
  }
  for(const page of [a,c,d]) await page.getByRole('heading',{name:'Bora kazandı!',exact:true}).waitFor();
  await b.getByRole('heading',{name:'Sen kazandın!',exact:true}).waitFor();
  await b.locator('#app:not([inert])').waitFor();
  await b.locator('.online-result img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await b.screenshot({path:path.join(root,'test-results/online/winner-preview-desktop.png')});
  await b.setViewportSize({width:390,height:844});
  await b.screenshot({path:path.join(root,'test-results/online/winner-preview-mobile.png')});
  await b.setViewportSize({width:1366,height:768});
  assert.ok(await b.evaluate(()=>window.__resultTransitionDuration>=400),'The result arrives with a soft transition');
  assert.equal(await b.locator('.online-confetti i').count(),18);
  assert.equal(await b.locator('.online-result-bird img').evaluate(image=>getComputedStyle(image).animationName),'online-bird-cheer');
  for(const page of pages){
    assert.deepEqual(await page.locator('.online-scores.is-final li b').evaluateAll(items=>items.map(item=>parseInt(item.textContent,10))),[5,4,0,0]);
    assert.match(await page.locator('.online-scores.is-final li').first().innerText(),/Bora/);
    assert.equal(await page.locator('.online-scores.is-final b small').filter({hasText:'skor'}).count(),4);
    assert.deepEqual(await page.locator('.online-ranking-points').allTextContents(),['Liderlik puanı: +30','Liderlik puanı: +10','Liderlik puanı: 0','Liderlik puanı: 0']);
    assert.equal(await page.getByText('İlk 5 doğru · Arkadaş maçı',{exact:true}).count(),0);
  }
  const result=(await a.request.get(`http://localhost:5176/api/arena/rooms/${code}`)).json();
  assert.deepEqual((await result).scores,[4,5,0,0]);
  await a.reload();await a.getByRole('heading',{name:'Bora kazandı!',exact:true}).waitFor();
  await a.screenshot({path:path.join(root,'test-results/online/four-player-result.png')});
  for(const [width,height] of [[390,844],[360,640],[844,390]]){
    await a.setViewportSize({width,height});await checkFit(a,`result ${width}x${height}`);
    await a.screenshot({path:path.join(root,`test-results/online/result-${width}x${height}.png`)});
  }
  await a.setViewportSize({width:1366,height:768});
  assert.equal((await db.pool.query('SELECT count(*)::integer AS count FROM arena.awards')).rows[0].count,4);
  await b.getByRole('button',{name:'Ana ekran',exact:true}).click();
  await b.locator('#app.screen-home:not([inert])').waitFor();
  await b.locator('[data-action="leaderboard"]').click();
  await b.locator('.ranking-row.is-self').waitFor();
  assert.equal(await b.locator('.ranking-row.is-self .ranking-points').textContent(),'30');
  // A second three-player match uses a different symbol count and survives a departure.
  await a.getByRole('button',{name:'Yeniden birlikte oynayalım',exact:true}).click();
  await a.getByRole('button',{name:'Oyuncu sayısı: 3',exact:true}).click();
  await a.getByRole('button',{name:'Altıgendeki simge sayısı: 3',exact:true}).click();
  await a.getByRole('button',{name:'Kazanmak için doğru sayısı: 5',exact:true}).click();
  await a.locator('.online-setup').getByRole('button',{name:'Oda oluştur',exact:true}).click();
  await a.locator('#invite-link').waitFor();const secondCode=new URL(await a.locator('#invite-link').inputValue()).searchParams.get('room');
  assert.equal(new URL(await scanQr(a)).searchParams.get('room'),secondCode,'A new room gets its own QR');
  for(const page of [b,c]){await page.goto(`http://localhost:5176/?room=${secondCode}`);await page.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).waitFor();}
  await a.getByText('3 / 3 oyuncu',{exact:true}).waitFor();
  await a.screenshot({path:path.join(root,'test-results/online/three-player-lobby.png')});
  for(const page of [a,b,c]) await page.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).click();
  await a.locator('#online-board').waitFor();assert.equal(await a.locator('.online-cards .symbol').count(),6);
  await a.screenshot({path:path.join(root,'test-results/online/three-player-match.png')});
  await c.request.post(`http://localhost:5176/api/arena/rooms/${secondCode}/leave`,{headers:{origin:'http://localhost:5176'}});
  await a.locator('.online-scores .has-left').waitFor();assert.equal(await a.locator('#online-board').count(),1);
  await b.request.post(`http://localhost:5176/api/arena/rooms/${secondCode}/leave`,{headers:{origin:'http://localhost:5176'}});
  await a.getByRole('heading',{name:'Sen kazandın!',exact:true}).waitFor();
  // A rematch applies a real loss to an existing balance and shows its signed value.
  await a.locator('#app:not([inert])').waitFor();
  await a.getByRole('button',{name:'Yeniden birlikte oynayalım',exact:true}).click();
  await a.getByRole('button',{name:'Oyuncu sayısı: 2',exact:true}).click();
  await a.locator('.online-setup').getByRole('button',{name:'Oda oluştur',exact:true}).click();
  await a.locator('#invite-link').waitFor();const rematchLink=await a.locator('#invite-link').inputValue();
  await b.goto(rematchLink);await b.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).waitFor();
  for(const page of [a,b]) await page.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).click();
  for(let round=1;round<=5;round++){
    await a.waitForFunction(expected=>document.querySelector('#online-board')?.dataset.round===String(expected)&&!document.querySelector('#online-board')?.inert,round);
    const symbol=await a.locator('.online-cards .player-card').evaluateAll(cards=>{
      const other=[...cards[1].querySelectorAll('[data-symbol]')].map(el=>el.dataset.symbol);
      return [...cards[0].querySelectorAll('[data-symbol]')].find(el=>other.includes(el.dataset.symbol)).dataset.symbol;
    });
    await a.locator('.online-cards .player-card').first().locator(`[data-symbol="${symbol}"]`).click();
  }
  await a.getByRole('heading',{name:'Sen kazandın!',exact:true}).waitFor();
  assert.deepEqual(await a.locator('.online-ranking-points').allTextContents(),['Liderlik puanı: +30','Liderlik puanı: -10']);
  await a.screenshot({path:path.join(root,'test-results/online/two-player-result-ranking.png')});
  // The real earned total, without fixture awards, flows across the shared account.
  if(withKesif){
  const k=await contexts[0].newPage();k.on('pageerror',e=>errors.push(e.message));
  await k.goto('http://localhost:5177/');await k.getByRole('button',{name:'Ada, hesabım',exact:true}).waitFor();
  await k.getByRole('button',{name:'Ada, hesabım',exact:true}).click();
  await k.getByText('70 Arena puanı',{exact:true}).waitFor();
  await k.screenshot({path:path.join(root,'test-results/online/shared-kesif-account.png')});
  await k.getByRole('button',{name:'Pencereyi kapat',exact:true}).click();
  await k.locator('.realm-label').nth(2).click();
  await k.waitForTimeout(1000);
  const stored=(await db.pool.query("SELECT data FROM accounts.app_progress WHERE user_id=$1 AND app='kesif'",[accounts[0].id])).rows[0];
  assert.ok(stored?.data.lastRealm,'Exploration is persisted to common PostgreSQL');
  const second=await browser.newContext({viewport:{width:390,height:844}});
  await second.addCookies(await contexts[0].cookies('http://localhost:5177/'));
  const newDevice=await second.newPage();await newDevice.goto('http://localhost:5177/');await newDevice.getByRole('button',{name:'Ada, hesabım',exact:true}).waitFor();
  assert.equal((await newDevice.request.get('http://localhost:5177/api/auth/me')).status(),200);
  const restored=await newDevice.request.get('http://localhost:5177/api/kesif/progress');
  assert.equal((await restored.json()).data.lastRealm,stored.data.lastRealm);
  await newDevice.getByRole('button',{name:'Ada, hesabım',exact:true}).click();await newDevice.getByRole('button',{name:'Çıkış yap',exact:true}).click();
  await newDevice.getByRole('button',{name:'Google ile devam et',exact:true}).waitFor();
  }else{
    console.log('SKIP sibling Keşif frontend integration (COMIND_TEST_KESIF=false); all Arena room and ranking checks ran.');
    assert.equal((await a.request.post('http://localhost:5176/api/auth/logout',{headers:{origin:'http://localhost:5176'}})).status(),200);
  }
  await a.goto('http://localhost:5176/');await a.getByRole('button',{name:'Google ile giriş yap',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log(`PASS friend requests/invitations, links/QR/copy/WhatsApp, 2–4 player games, signed ranking awards, leaderboard, exact symbols, responsive results, transitions, reload recovery, logout${withKesif?', shared Keşif total/progress':''}`);
} catch(error) {
  const page=browser?.contexts()[0]?.pages()[0];
  if(page) { await mkdir(path.join(root,'test-results/online'),{recursive:true}); await page.screenshot({path:path.join(root,'test-results/online/failure.png'),fullPage:true}); console.error((await page.locator('body').innerText()).slice(0,1500)); }
  throw error;
} finally {
  await browser?.close();await front?.close();await world?.close();await app?.close();await db?.close();await postgres?.stop();
  if(directory&&path.dirname(path.resolve(directory))===path.resolve(tmpdir())&&path.basename(directory).startsWith('kesif-browser-'))await rm(directory,{recursive:true,force:true});
}
