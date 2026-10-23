import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'}),missing=[],errors=[];
 let user={id:'preview',name:'Ada',avatar:'white',publicCode:'ABCD1234'};
 page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)missing.push(r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/auth/me',r=>r.fulfill({json:{configured:true,user}}));
 await page.route('**/api/arena/leaderboard**',r=>r.fulfill({json:{entries:[],total:0,self:null,start:0}}));
 await page.route('**/api/arena/friends',r=>r.fulfill({json:{friends:[],incoming:[],outgoing:[],invites:[]}}));
 const ready=async()=>{await page.locator('.is-preparing').waitFor({state:'detached'});await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});};
 for(const [index,parrot] of ['koak','kofen','komat','kuik'].entries()){
  user.avatar=['white','lilac','rose'][index%3];
  await page.goto('http://localhost:5174/');await ready();
  await page.locator('[data-mode="solo"]').click();await ready();
  await page.locator(`[data-option="parrot"][data-value="${parrot}"]`).click();
  await page.locator('[data-option="winTarget"][data-value="5"]').click();
  await page.locator('[data-option="rule"][data-value="empty"]').click();
  await page.locator('.setup-start').click();await page.locator('.screen-game:not(.is-preparing)').waitFor();await ready();
  assert.equal(await page.locator('.play-panel').getAttribute('data-motion'),'ready');
  await page.setViewportSize({width:390,height:844});await ready();
  await page.setViewportSize({width:1366,height:768});
  console.log(`PASS ${parrot}: atlas, portraits, landscape / portrait backgrounds and Phaser`);
 }
 await page.goto('http://localhost:5174/');await ready();
 for(const action of ['help','settings','account','leaderboard']){
  await page.locator(`[data-action="${action}"]`).first().click();await ready();
  await page.locator('dialog .close-modal').click();
 }
 await page.locator('[data-mode="local"]').click();await ready();await page.locator('.setup-start').click();await page.locator('.screen-game:not(.is-preparing)').waitFor();await ready();
 user=null;await page.goto('http://localhost:5174/');await ready();await page.locator('[data-action="account"]').click();await ready();
 assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
 console.log('PASS local classic deck, home / profile / help / settings / ranking / login: no missing assets or runtime errors');
}finally{await browser.close();}
