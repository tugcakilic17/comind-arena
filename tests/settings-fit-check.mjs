import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-results/settings-fit',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const failures=[],errors=[];
let checks=0;
try{
 const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
 page.on('pageerror',error=>errors.push(error.message));
 const user={id:'00000000-0000-4000-8000-000000000001',name:'Tuğça',publicCode:'ADMA9230',avatar:'white'};
 await page.route('**/api/auth/me',route=>route.fulfill({json:{configured:true,user}}));
 await page.route('**/api/arena/leaderboard**',route=>route.fulfill({json:{players:[],total:0,self:null,start:0}}));
 await page.route('**/api/gifts/redeem',route=>route.fulfill({json:{status:'inactive',message:'Hediye kodları henüz kullanıma açılmadı. Şu an aktif bir kampanya yok.'}}));
 await page.goto('http://localhost:5174/');
 await page.locator('.account-button.is-signed-in').waitFor();
 assert.equal(await page.locator('.hero-wordmark').count(),0,'central 6gen graphic removed');
 assert.equal(await page.locator('.account-button .account-nameplate').count(),1,'signed-in name/parrot use the painted game badge');
 await page.locator('[data-action="settings"]').click();
 await page.locator('dialog[open]:not(.is-preparing)').waitFor();
 await page.locator('.settings-peeker').evaluate(image=>image.decode());
 const sizes=[[320,480],[320,568],[360,480],[360,640],[390,844],[412,915],[540,720],[600,900],[601,900],[768,1024],[820,1180],[932,604],[1024,640],[1093,650],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440],[480,320],[568,320],[667,375],[844,390],[900,500],[1024,600],[600,400]];
 async function inspect(state,width,height){
  const problems=await page.locator('dialog[open]').evaluate(modal=>{
    const problems=[],frame=modal.getBoundingClientRect();
    if(modal.scrollWidth>modal.clientWidth+1)problems.push(`horizontal scroll ${modal.scrollWidth}/${modal.clientWidth}`);
    if(modal.scrollHeight>modal.clientHeight+1)problems.push(`vertical scroll ${modal.scrollHeight}/${modal.clientHeight}`);
    if(document.documentElement.scrollWidth>innerWidth)problems.push('page horizontal overflow');
    const peeker=modal.querySelector('.settings-peeker').getBoundingClientRect();
    if(peeker.top<0||frame.bottom>innerHeight+1||frame.top<0)problems.push(`frame/peeker outside viewport ${peeker.top}/${frame.bottom}`);
    for(const el of modal.querySelectorAll('button,input,p,h2,h3,code,legend')){
      if(!el.checkVisibility()||el.closest('[hidden]'))continue;
      const r=el.getBoundingClientRect();
      if(r.left<frame.left-1||r.right>frame.right+1||r.top<frame.top-1||r.bottom>frame.bottom+1)problems.push(`${el.className||el.tagName} outside frame ${[r.x,r.y,r.width,r.height].map(Math.round)}`);
      if(r.top<0||r.bottom>innerHeight+1)problems.push(`${el.className||el.tagName} outside viewport`);
      if(el.matches('button,input')&&!el.disabled){const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(hit!==el&&!el.contains(hit))problems.push(`${el.className||el.tagName} covered`);}
    }
    const title=modal.querySelector('h2').getBoundingClientRect(),ready=modal.querySelector('.settings-ready').getBoundingClientRect();
    if(Math.abs(title.x+title.width/2-(frame.x+frame.width/2))>2)problems.push('heading not centered');
    if(Math.abs(ready.x+ready.width/2-(frame.x+frame.width/2))>2)problems.push('ready not centered');
    return problems;
  });
  checks++;
  if(problems.length)failures.push({state,width,height,problems});
  if(problems.length||[[320,480],[390,844],[932,604],[1366,768],[480,320]].some(([w,h])=>w===width&&h===height))await page.screenshot({path:`test-results/settings-fit/${state}-${width}x${height}.png`});
 }
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  const tabs=await page.locator('.settings-tabs').isVisible();
  if(tabs)await page.locator('[data-action="settings-tab"][data-tab="profile"]').click();
  await inspect('profile',width,height);
  await page.locator('[data-action=copy-player-code]').click();
  await inspect('copied',width,height);
  await page.locator('[data-action="profile-edit"]').click();
  await inspect('editor',width,height);
  await page.locator('[data-action="profile-cancel"]').click();
  if(tabs){for(const tab of ['sound','redeem']){await page.locator(`[data-action="settings-tab"][data-tab="${tab}"]`).click();await inspect(tab,width,height);if(tab==='redeem'){await page.locator('#gift-code').fill('TEST2026');await page.locator('#redeem-form button').click();await page.locator('#redeem-status').filter({hasText:'henüz'}).waitFor();await inspect('redeem-feedback',width,height);}}}
 }
 await page.setViewportSize({width:1366,height:768});
 await page.keyboard.press('Escape');
 await page.locator('.account-button.is-signed-in').click();
 await page.locator('dialog[data-kind="profile"][open]:not(.is-preparing)').waitFor();
 assert.equal(await page.locator('dialog[open] h2').textContent(),'Profilim','the account badge opens the profile panel');
 assert.equal(await page.locator('dialog[open] .settings-tools').count(),0,'profile panel only contains the player profile');
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  await inspect('account-profile',width,height);
  await page.locator('[data-action="profile-edit"]').click();
  await inspect('account-editor',width,height);
  await page.locator('[data-action="profile-cancel"]').click();
 }
 await page.keyboard.press('Escape');
 user.name='Çok uzun bir oyuncu adı ve soyadı '.repeat(4).slice(0,100);
 await page.reload();await page.locator('.account-button.is-signed-in').waitFor();
 for(const kind of ['settings','profile']){
  await page.locator(kind==='settings'?'[data-action="settings"]':'.account-button.is-signed-in').click();
  await page.locator('dialog[open]:not(.is-preparing)').waitFor();
  for(const [width,height]of [[320,480],[480,320],[932,604],[1366,768]]){
   await page.setViewportSize({width,height});
   // The async score can show longer loading/error copy before the final value.
   for(const text of ['Puan yükleniyor…','Puan yüklenemedi','999.999.999 puan']){
    await page.locator('[data-profile-points]').evaluate((el,text)=>{el.textContent=text;},text);
    await inspect(`${kind}-long-name-${text}`,width,height);
   }
  }
  await page.keyboard.press('Escape');
 }
 await writeFile('test-results/settings-fit/report.json',JSON.stringify({checks,failures,errors},null,2));
 console.log(`${checks} settings fit checks; ${failures.length} failures; ${errors.length} browser errors`);
 for(const failure of failures)console.log(JSON.stringify(failure));
 assert.deepEqual(errors,[]);assert.equal(failures.length,0);
}finally{await browser.close();}
