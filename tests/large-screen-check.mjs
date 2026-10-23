import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

await mkdir('test-results/large-screen',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/auth/me',r=>r.fulfill({json:{configured:true,user:{id:'preview',name:'Ada',publicCode:'ABCD1234',avatar:'white'}}}));
 await page.route('**/api/arena/friends',r=>r.fulfill({json:{friends:[],incoming:[],outgoing:[],invites:[]}}));
 await page.route('**/api/arena/leaderboard**',r=>r.fulfill({json:{entries:[],total:0,self:null,start:0}}));
 await page.route('**/api/arena/rooms/ABCDEFGH',r=>r.fulfill({json:{id:'preview-room',code:'ABCDEFGH',status:'playing',revision:1,you:0,players:[{id:'preview',name:'Ada',avatar:'white'},{id:'friend',name:'Ece',avatar:'rose'}],options:{capacity:2,symbolCount:8,winTarget:5,theme:'koak'},departed:[false,false],scores:[0,0],winners:[],round:1,pair:[[0,1,2,3,4,5,6,7],[0,8,9,10,11,12,13,14]],ready:[true,true],startsAt:Date.now(),turnAt:Date.now(),serverTime:Date.now(),winner:null,reason:null}}));
 const ready=async()=>{
  await page.locator('.is-preparing').waitFor({state:'detached'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 };
 const bounds=selector=>page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};});
 for(const [width,height] of [[2560,1440],[3840,2160]]) {
  await page.setViewportSize({width,height});
  await page.goto('http://localhost:5174/');await ready();
  const home=await bounds('.mode-art');
  assert.ok(home.width>width*.22,`home cards too small: ${JSON.stringify(home)}`);
  await page.screenshot({path:`test-results/large-screen/home-${width}.png`});
  for(const action of ['help','settings','account','leaderboard']) {
   await page.locator(`[data-action="${action}"]`).first().click();await ready();
   const modal=await bounds('dialog[open]');
   assert.ok(modal.y>=0&&modal.bottom<=height&&modal.x>=0&&modal.right<=width,`${action} outside screen: ${JSON.stringify(modal)}`);
   assert.ok(modal.width>=width*.26,`${action} too small: ${JSON.stringify(modal)}`);
   await page.screenshot({path:`test-results/large-screen/${action}-${width}.png`});
   await page.locator('dialog[open] .close-modal').click();
  }
  await page.locator('[data-mode="online"]').click();await ready();
  const room=await bounds('.online-hub');assert.ok(room.width>width*.58&&room.bottom<=height);
  await page.screenshot({path:`test-results/large-screen/room-${width}.png`});
  for(const parrot of ['koak','kofen']) {
   await page.goto('http://localhost:5174/');await ready();
   await page.locator('[data-mode="solo"]').click();await ready();
   const setup=await bounds('dialog[open]');assert.ok(setup.width>width*.4&&setup.bottom<=height);
   if(parrot==='koak')await page.screenshot({path:`test-results/large-screen/setup-${width}.png`});
   await page.locator(`[data-option="parrot"][data-value="${parrot}"]`).click();
   await page.locator('.setup-start').click();await page.locator('.screen-game:not(.is-preparing)').waitFor();await ready();
   const cards=await page.locator('.hex-card').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,top:r.top,bottom:r.bottom};}));
   assert.ok(cards.every(c=>c.width>width*.29&&c.top<height*.30&&c.bottom<height*.87),`game card size / placement: ${JSON.stringify(cards)}`);
   await page.screenshot({path:`test-results/large-screen/${parrot}-${width}.png`});
   await page.locator('[data-action="pause"]').click();await ready();
   const pause=await bounds('dialog[open]');await page.screenshot({path:`test-results/large-screen/pause-${width}.png`});assert.ok(pause.y>=0&&pause.bottom<=height&&pause.width>width*.26,`pause: ${JSON.stringify(pause)}`);
  }
  await page.goto('http://localhost:5174/?room=ABCDEFGH');await page.locator('#online-board').waitFor();await ready();
  const online=await bounds('.online-cards .hex-card');
  assert.ok(online.width>width*.29&&online.y<height*.30&&online.bottom<height*.87,`online game: ${JSON.stringify(online)}`);
  await page.screenshot({path:`test-results/large-screen/online-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1),false);
  console.log(`PASS ${width}x${height}: home, panels, room, sea / forest card scale and position`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();}
