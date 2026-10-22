import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install();await page.goto('http://127.0.0.1:5174/');
 await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
 for(let turn=0;turn<10;turn++){
  const id=await page.locator('#board').evaluate(board=>{
   const right=[...board.querySelectorAll('[data-side="right"]')].map(el=>el.dataset.symbol);
   return [...board.querySelectorAll('[data-side="left"]')].find(el=>right.includes(el.dataset.symbol)).dataset.symbol;
  });
  await page.locator(`[data-side="left"][data-symbol="${id}"]`).click();await page.clock.runFor(1400);
 }
 assert.equal(await page.locator('.result-panel h1').textContent(),'1. Oyuncu kazandı!');
 await page.locator('.result-panel img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 assert.ok(await page.locator('.result-mascots img').getAttribute('src').then(src=>src.includes('player-cheer')));
 assert.deepEqual(await page.locator('.result-score-avatar').evaluateAll(images=>images.map(image=>image.src.split('/').pop())),['player-idle-v27.webp','kofen-idle-v26.webp']);
 assert.ok(await page.locator('.forest-background').evaluate(el=>getComputedStyle(el).backgroundImage.includes('forest-clearing-v1.webp')));
 assert.equal(await page.locator('.result-home .icon path').getAttribute('fill'),'currentColor');
 assert.equal(await page.locator('.result-home>span').textContent(),'Ana ekrana dön');
 assert.equal(await page.locator('.result-replay>span').textContent(),'Bir daha oynayalım');
 assert.ok(await page.locator('.result-portrait').evaluateAll(portraits=>portraits.every(el=>{
  const rect=el.getBoundingClientRect();return Math.abs(rect.width-rect.height)<1;
 })), 'portraits keep circular proportions');
 assert.equal(await page.locator('.save-note').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('comind.scores.v1')),null);
 assert.equal(await page.locator('canvas').count(),0);
 assert.ok(await page.locator('.illustrated-result').evaluate(panel=>panel.getBoundingClientRect().bottom<=innerHeight));
 await page.screenshot({path:'test-results/result-player-v28-mobile.png',fullPage:true});
 console.log('PASS player result, winner mascot, mobile layout and renderer teardown');
 await page.locator('.result-replay').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
 assert.equal(await page.locator('#score-left').textContent(),'0');
 assert.equal(await page.locator('#score-right').textContent(),'0');
 assert.equal(await page.locator('.player-parrot').getAttribute('src'),'/assets/game-ui/player-idle-v27.webp');
 assert.equal(await page.locator('.avatar-slot[data-player="0"] .avatar-cheer').getAttribute('src'),'/assets/game-ui/player-cheer-v27.webp');
 assert.ok(await page.locator('.forest-background').evaluate(el=>getComputedStyle(el).backgroundImage.includes('forest-calm-warm-v23.webp')));
 console.log('PASS replay starts a fresh match');
 await page.locator('[data-action="leave"]').click();await page.locator('[data-action="confirm-home"]').click();
 await page.setViewportSize({width:1366,height:768});
 await page.locator('[data-mode="solo"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');await page.clock.runFor(91000);
 assert.equal(await page.locator('.result-panel h1').textContent(),'Bu kez Kofen kazandı!');
 assert.ok(await page.locator('.result-mascots img').getAttribute('src').then(src=>src.includes('kofen-cheer')));
 await page.locator('.result-panel img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 await page.screenshot({path:'test-results/result-kofen-v28-desktop.png',fullPage:true});
 console.log('PASS computer victory uses Kofen celebration');
 await page.locator('.result-panel [data-action="home"]').click();
 await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');await page.clock.runFor(91000);
 assert.equal(await page.locator('.result-panel h1').textContent(),'Dostluk kazandı!');
 assert.equal(await page.locator('.result-mascots img').count(),2);
 assert.deepEqual(await page.locator('.result-mascots img').evaluateAll(images=>images.map(image=>image.src.split('/').pop())),['player-cheer-v27.webp','kofen-cheer-v26.webp']);
 for(const [width,height] of [[1920,869],[1920,1080],[1440,900],[1366,768],[1130,621],[390,844],[360,640],[844,390]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
  assert.ok(await page.evaluate(()=>{
   const panel=document.querySelector('.illustrated-result').getBoundingClientRect();
   const hero=document.querySelector('.result-mascots').getBoundingClientRect();
   return panel.bottom<=innerHeight&&hero.top>=0&&document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight;
  }),`result fits ${width}x${height}`);
  if(width>=1366&&height>=768) assert.ok(await page.locator('.illustrated-result').evaluate(el=>{
   const rect=el.getBoundingClientRect();
   const title=document.querySelector('.illustrated-result h1');
   return rect.width>=590&&rect.height>=430&&parseFloat(getComputedStyle(title).fontSize)>=40;
  }),`result remains prominent and readable at ${width}x${height}`);
  await page.screenshot({path:`test-results/result-tie-v28-${width}-${height}.png`});
 }
 await page.locator('.result-panel [data-action="home"]').click();
 await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
 for(let turn=0;turn<10;turn++){
  const id=await page.locator('#board').evaluate(board=>{
   const left=[...board.querySelectorAll('[data-side="left"]')].map(el=>el.dataset.symbol);
   return [...board.querySelectorAll('[data-side="right"]')].find(el=>left.includes(el.dataset.symbol)).dataset.symbol;
  });
  await page.locator(`[data-side="right"][data-symbol="${id}"]`).click();await page.clock.runFor(1400);
 }
 assert.equal(await page.locator('.result-panel h1').textContent(),'2. Oyuncu kazandı!');
 assert.ok(await page.locator('.result-mascots img').getAttribute('src').then(src=>src.includes('kofen-cheer-v26')));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS both identities, compact result controls, no casual ranking, all winner states, responsive results and replay');
}finally{await browser.close();}
