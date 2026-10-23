import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

await mkdir('test-results/pile-scale',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [width,height] of [[2560,1440],[3840,2160]])for(const rule of ['empty','collect']){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/auth/me',r=>r.fulfill({json:{configured:true,user:{id:'preview',name:'Ada',avatar:'white'}}}));
  await page.clock.install();
  await page.goto('http://localhost:5174/');
  await page.locator('[data-mode="solo"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await page.locator(`[data-option="parrot"][data-value="${rule==='empty'?'koak':'kofen'}"]`).click();
  await page.locator(`[data-option="rule"][data-value="${rule}"]`).click();
  await page.locator('[data-level="easy"]').click();
  await page.locator('.setup-start').click();
  await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
  await page.locator('.play-panel[data-motion="ready"]').waitFor();
  const metrics=await page.locator('.player-card').evaluateAll(players=>players.map(player=>{
   const card=player.querySelector('.hex-card').getBoundingClientRect(),pile=player.querySelector('.card-pile').getBoundingClientRect();
   return {ratio:pile.width/card.width,width:pile.width,inside:pile.left>=0&&pile.right<=innerWidth&&pile.top>=0&&pile.bottom<=innerHeight,badge:parseFloat(getComputedStyle(player.querySelector('.card-pile b')).fontSize)};
  }));
  assert.ok(metrics.every(m=>Math.abs(m.ratio-.18)<.001&&m.inside&&m.badge>=18),JSON.stringify(metrics));
  await page.screenshot({path:`test-results/pile-scale/${rule}-${width}.png`});
  const id=await page.locator('#board').evaluate(board=>{
   const right=[...board.querySelectorAll('[data-side="right"]')].map(el=>el.dataset.symbol);
   return [...board.querySelectorAll('[data-side="left"]')].find(el=>right.includes(el.dataset.symbol)).dataset.symbol;
  });
  await page.locator(`[data-side="left"][data-symbol="${id}"]`).click();
  const to=rule==='empty'?1:0;
  const landing=await page.locator('.card-transfer').evaluate((host,to)=>{
   const frame=host.getAnimations()[0].effect.getKeyframes().at(-1),matrix=new DOMMatrix(frame.transform);
   const start={x:parseFloat(host.style.left),y:parseFloat(host.style.top),w:parseFloat(host.style.width),h:parseFloat(host.style.height)};
   const panel=host.parentElement.getBoundingClientRect(),top=host.parentElement.querySelector(`[data-pile-owner="${to}"] .pile-cards img:last-child`),pile=top.getBoundingClientRect();
   return {x:Math.abs(start.x+start.w/2+matrix.m41-(pile.left+pile.width/2-panel.left)),y:Math.abs(start.y+start.h/2+matrix.m42-(pile.top+pile.height/2-panel.top)),width:Math.abs(Math.hypot(matrix.a,matrix.b)*start.w-top.offsetWidth),height:Math.abs(Math.hypot(matrix.c,matrix.d)*start.h-top.offsetHeight),sameArt:host.querySelector('.hex-art').src===top.src};
  },to);
  assert.ok(landing.x<1&&landing.y<1&&landing.width<.01&&landing.height<.01&&landing.sameArt,JSON.stringify(landing));
  await page.clock.runFor(1800);
  await page.setViewportSize({width:1920,height:1080});await page.clock.runFor(100);
  assert.ok(await page.locator('.card-pile').evaluateAll(piles=>piles.every(p=>Math.abs(p.getBoundingClientRect().width-76)<.1)),'Full HD keeps 76px piles');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}x${height} ${rule}: 18% piles, readable counts, exact landing, Full HD unchanged`);
  await page.close();
 }
}finally{await browser.close();}
