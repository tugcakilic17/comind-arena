// Isolated local playground: real room APIs, disposable accounts and database.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import EmbeddedPostgres from 'embedded-postgres';
import { createDatabase } from '../server/database.js';
import { buildApp, readConfig, hashToken } from '../server/app.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const check=process.argv.includes('--check');
const url='http://localhost:5178/';
let folder,postgres,db,app,front,browser;
let endDemo;
const stopped=new Promise(resolve=>{endDemo=resolve;});
process.once('SIGINT',()=>endDemo());
process.once('SIGTERM',()=>endDemo());
try {
  console.log('Arkadaş testi hazırlanıyor. Gerçek hesapların kullanılmayacak.');
  folder=await mkdtemp(path.join(tmpdir(),'comind-friends-demo-'));
  const password=randomBytes(24).toString('hex');
  postgres=new EmbeddedPostgres({databaseDir:path.join(folder,'postgres'),user:'demo',password,port:55436,persistent:true,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1','-c','io_method=sync'],onLog(){},onError(){}});
  await postgres.initialise();await postgres.start();
  db=createDatabase(`postgresql://demo:${password}@127.0.0.1:55436/postgres`);await db.migrate();
  app=await buildApp({db,config:readConfig({APP_URL:url,KESIF_URL:url})});
  await app.listen({host:'127.0.0.1',port:3012});
  front=await createServer({root,configFile:path.join(root,'vite.config.js'),server:{host:'127.0.0.1',port:5178,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:3012',changeOrigin:false}}},logLevel:'error'});await front.listen();
  const accounts=[];
  for (const [index,name] of ['Ada','Bora','Cem'].entries()) {
    const token=randomBytes(32).toString('hex');
    const user=await db.signIn({sub:`local-demo-${index}`,email:`demo-${index}@example.test`,name},hashToken(token),new Date(Date.now()+8*3600_000));
    await db.pool.query('UPDATE accounts.users SET avatar=$2 WHERE id=$1',[user.id,['white','lilac','rose'][index]]);
    accounts.push({...user,token,name});
  }
  for (let a=0;a<accounts.length;a++) for (let b=a+1;b<accounts.length;b++) {
    const pair=[accounts[a].id,accounts[b].id].sort();
    await db.pool.query("INSERT INTO accounts.friendships(user_a,user_b,requester_id,status) VALUES($1,$2,$3,'accepted')",[...pair,accounts[a].id]);
  }
  browser=await chromium.launch({channel:'msedge',headless:check,args:['--window-size=1180,780']});
  browser.on('disconnected',()=>endDemo());
  const pages=[];
  for (const account of accounts) {
    const context=await browser.newContext({viewport:{width:1180,height:760},reducedMotion:check?'reduce':'no-preference',permissions:['clipboard-read','clipboard-write']});
    await context.addCookies([{name:'kesif_session',value:account.token,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
    await context.addInitScript(name=>document.addEventListener('DOMContentLoaded',()=>{document.title=`TEST · ${name} · 6gen`;}),account.name);
    const page=await context.newPage();page.setDefaultTimeout(20_000);pages.push(page);
    await page.goto(url);
    await page.getByRole('button',{name:`${account.name}, profilim`,exact:true}).waitFor();
    await page.getByRole('button',{name:'Arkadaşını Çağır',exact:true}).click();
    await page.locator('.online-hub').waitFor();await page.locator('#app:not([inert])').waitFor();
  }
  const [ada,bora,cem]=pages;
  await ada.getByRole('button',{name:'Oyuncu sayısı: 3',exact:true}).click();
  await ada.getByRole('button',{name:'Kazanmak için doğru sayısı: 5',exact:true}).click();
  for (const page of [bora,cem]) await page.getByRole('button',{name:/Arkadaşlarım/}).click();
  if (check) {
    await ada.locator('.online-setup [data-action="online-create"]').click();
    await ada.locator('#invite-link').waitFor();
    if (await ada.locator('.online-code,[data-action="online-copy-code"]').count()) throw new Error('Oda kodu arayüzde bulunmamalı.');
    await ada.getByRole('button',{name:'Arkadaş listemden davet et',exact:true}).click();
    for (const [name,page] of [['Bora',bora],['Cem',cem]]) {
      const row=ada.locator('.online-friend-row').filter({has:ada.getByText(name,{exact:true})});
      await row.getByRole('button',{name:'Davet et',exact:true}).click();
      await page.getByRole('button',{name:'Katıl',exact:true}).click();
      await page.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).waitFor();
    }
    await ada.getByRole('button',{name:'Odam',exact:true}).click();
    await ada.getByText('3 / 3 oyuncu',{exact:true}).waitFor();
    for (const page of pages) await page.getByRole('button',{name:'Hazırım, başlayalım',exact:true}).click();
    for (const page of pages) await page.locator('#online-board').waitFor();
    await ada.waitForFunction(()=>!document.querySelector('#online-board').inert);
    const shared=await ada.locator('.online-cards .player-card').evaluateAll(cards=>{
      const ids=card=>[...card.querySelectorAll('[data-symbol]')].map(el=>el.dataset.symbol);
      return ids(cards[0]).find(id=>ids(cards[1]).includes(id));
    });
    await ada.locator('.online-cards .player-card').first().locator(`[data-symbol="${shared}"]`).click();
    await bora.waitForFunction(()=>document.querySelector('.online-scores li b')?.textContent==='1');
    console.log('PASS üç ayrı test oturumu: davetler, Katıl, 3/3 oyuncu, Hazırım ve ortak skor.');
  } else {
    console.log('\nÜç ayrı Edge penceresi hazır: TEST · Ada, TEST · Bora, TEST · Cem.');
    console.log('1. Ada: Oda oluştur → Arkadaş listemden davet et → Bora ve Cem için Davet et.');
    console.log('2. Bora/Cem: Arkadaşlarım → Oyun davetleri → Katıl.');
    console.log('3. Üç pencerede de Hazırım, başlayalım. İlk 5 doğruyu bilen kazanır.');
    console.log('Bağlantıyla katılımı denemek için Ada’nın davetini kopyalayıp diğer test penceresinde açabilirsin.');
    console.log('Bitirmek için üç test penceresini kapat veya bu konsolda Ctrl+C bas.');
    for (const page of pages) page.on('close',()=>{if(pages.every(p=>p.isClosed()))endDemo();});
    await ada.bringToFront();
    await stopped;
  }
} catch(error) {
  console.error('Arkadaş testi açılamadı:',error.message);
  console.error('Başka bir arkadaş testi açıksa kapatıp yeniden deneyebilirsin.');
  process.exitCode=1;
} finally {
  await browser?.close();await front?.close();await app?.close();await db?.close();await postgres?.stop();
  if(folder&&path.dirname(path.resolve(folder))===path.resolve(tmpdir())&&path.basename(folder).startsWith('comind-friends-demo-')) await rm(folder,{recursive:true,force:true,maxRetries:10,retryDelay:200});
}
