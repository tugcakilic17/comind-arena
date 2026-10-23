import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'no-preference'});
const settled=()=>page.locator('#app:not([inert])').waitFor();
const staleInvite=()=>page.evaluate(()=>{
 const button=document.createElement('button');button.dataset.action='online-invite';button.dataset.value='friend';
 document.querySelector('.online-hub').append(button);button.click();button.remove();
});
await page.addInitScript(()=>{
 window.__onlineTransitions=[];
 const original=document.startViewTransition?.bind(document);
 if(original) document.startViewTransition=callback=>{
  const record={start:performance.now(),duration:0};window.__onlineTransitions.push(record);
  const transition=original(callback);transition.finished.then(()=>{record.duration=performance.now()-record.start;});return transition;
 };
});
const base=process.env.TEST_URL || 'http://localhost:5174';
const user={id:'sample',name:'Ada',publicCode:'ABCD1234',avatar:'white'};
const friend={id:'friend',name:'Bora',publicCode:'EFGH5678',avatar:'lilac'};
let leaves=0,leaveFails=false,creates=0,full=false,invites=0;
await page.route('**/api/auth/me',route=>route.fulfill({json:{configured:true,user}}));
await page.route('**/api/arena/friends',route=>route.fulfill({json:{friends:[friend],incoming:[],outgoing:[],invites:[]}}));
await page.route('**/api/arena/friends/*/invite',route=>{invites++;return route.fulfill({json:{message:'Davet edildi'}});});
await page.route('**/api/arena/rooms/ABCDEFGH',route=>route.fulfill({json:{id:'sample-room',code:'ABCDEFGH',status:'waiting',revision:full?2:1,you:0,players:[user,full?{...friend,id:'other',name:'Cem'}:null],options:{capacity:2,symbolCount:6,winTarget:10},departed:[false,false],scores:[0,0],winners:[],round:1,ready:[false,false],serverTime:Date.now(),winner:null}}));
await page.route('**/api/arena/rooms',async route=>{creates++;await new Promise(resolve=>setTimeout(resolve,150));return route.fulfill({json:{id:'sample-room',code:'ABCDEFGH',status:'waiting',revision:1,you:0,players:[user,null],options:{capacity:2,symbolCount:6,winTarget:10},departed:[false,false],scores:[0,0],winners:[],round:1,ready:[false,false],serverTime:Date.now(),winner:null}});});
await page.route('**/api/arena/rooms/ABCDEFGH/leave',route=>{leaves++;return route.fulfill(leaveFails?{status:503,json:{error:'Odadan ayrılamadık. Yeniden dene.'}}:{json:{ok:true}});});
try{
 await page.goto(base);await page.getByRole('button',{name:'Arkadaşını Çağır',exact:true}).click();await settled();
 await page.locator('.online-panel').waitFor();
 const entry=await page.evaluate(()=>window.__onlineTransitions[0]);assert.ok(entry?.duration>=180,'entry waits for its crossfade');
 assert.equal(await page.getByRole('button',{name:'Davete katıl',exact:true}).count(),0);
 assert.ok(await page.getByLabel('Davet bağlantısı').isVisible());
 const centered=await page.locator('.online-heading h1').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.online-panel').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<1;});
 assert.ok(centered,'heading is centered in the panel, independent of home button');
 await page.locator('.online-heading h1').click();assert.equal(await page.locator('.online-hub').count(),1);
 const choice=page.getByRole('button',{name:'Oyuncu sayısı: 3',exact:true});
 await choice.hover();
 assert.equal(await choice.evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
 assert.equal(await choice.evaluate(el=>getComputedStyle(el).transform),'none');
 await page.mouse.down();assert.equal(await choice.evaluate(el=>getComputedStyle(el).transform),'none');
 await page.mouse.up();await page.locator('[data-value="capacity:3"][aria-pressed="true"]').waitFor();
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.value),'capacity:3');
 await page.waitForTimeout(450);
 const transform=await choice.evaluate(el=>getComputedStyle(el).transform);
 await page.waitForTimeout(450);assert.equal(await choice.evaluate(el=>getComputedStyle(el).transform),transform,'controls stay still on hover');
 for(const [width,height] of [[1366,768],[1178,582],[844,390]]){
  await page.setViewportSize({width,height});
  const create=await page.locator('.online-setup>.online-primary').boundingBox(),join=await page.locator('.online-join-form>.online-primary').boundingBox();
  assert.ok(Math.abs(create.y-join.y)<1&&Math.abs(create.height-join.height)<1,`create and join buttons align ${width}x${height}: ${JSON.stringify({create,join})}`);
 }
 await page.setViewportSize({width:1366,height:768});
 await page.getByRole('button',{name:'Arkadaşlarım',exact:true}).click();
 await page.locator('.online-friend-list').getByText('Bora',{exact:true}).waitFor();
 assert.equal(await page.locator('.online-friend-list [data-action="online-invite"],.online-friend-list [data-action="online-tab"]').count(),0,'No room prompts or invitations clutter friend rows before a room exists');
 await page.getByRole('button',{name:'Oda oluştur',exact:true}).click();
 await page.locator('.online-setup').waitFor();assert.equal(creates,0);assert.equal(invites,0);
 await staleInvite();
 await page.getByText('Davet göndermeden önce oda oluştur.',{exact:true}).waitFor();assert.equal(creates,0);assert.equal(invites,0);
 await page.mouse.click(6,700);await page.locator('#app.screen-home').waitFor();await settled();assert.equal(leaves,0);
 await page.goto(`${base}/?room=ABCDEFGH`);await page.locator('.online-seats').waitFor();await settled();
 await page.getByLabel('Davet bağlantısı',{exact:true}).click();assert.equal(await page.locator('.online-hub').count(),1);
 await page.getByRole('button',{name:'Arkadaşlarım',exact:true}).click();
 assert.ok(await page.getByRole('button',{name:'Davet et',exact:true}).isEnabled());
 full=true;await page.getByRole('button',{name:'Oda dolu',exact:true}).waitFor();
 assert.ok(await page.getByRole('button',{name:'Oda dolu',exact:true}).isDisabled());
 await staleInvite();
 await page.getByText('Odada boş yer kalmadı.',{exact:true}).waitFor();assert.equal(invites,0);full=false;
 await page.mouse.click(6,700);await page.locator('#app.screen-home').waitFor();await settled();assert.equal(leaves,1);
 assert.equal(new URL(page.url()).searchParams.has('room'),false);
 // Exiting while the room is being created waits and cleans up the new membership.
 await page.getByRole('button',{name:'Arkadaşını Çağır',exact:true}).click();await settled();
 await page.locator('.online-setup [data-action="online-create"]').click();
 await page.mouse.click(6,700);await page.locator('#app.screen-home').waitFor();await settled();assert.equal(leaves,2);
 // A failed leave stays in the room and exposes a retry instead of abandoning it silently.
 await page.goto(`${base}/?room=ABCDEFGH`);await page.locator('.online-seats').waitFor();await settled();leaveFails=true;
 await page.mouse.click(6,700);await page.getByText('Odadan ayrılamadık. Yeniden dene.',{exact:true}).waitFor();
 assert.equal(await page.locator('.online-hub').count(),1);leaveFails=false;
 await page.mouse.click(6,700);await page.locator('#app.screen-home').waitFor();await settled();assert.equal(leaves,4);
 const transitionCount=await page.evaluate(()=>window.__onlineTransitions.length);assert.ok(transitionCount>=2,'entry and exit use page transitions');
 // Reduced motion uses the same states without stretching the controls.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Arkadaşını Çağır',exact:true}).click();await settled();
 await page.getByRole('button',{name:'Oyuncu sayısı: 3',exact:true}).hover();
 assert.equal(await page.locator('[data-value="capacity:3"]').evaluate(el=>getComputedStyle(el).transform),'none');
 assert.equal(await page.evaluate(()=>window.__onlineTransitions.length),transitionCount,'reduced motion skips page animations');
 console.log('PASS invitations require an explicitly created room and a free seat; aligned buttons, no bubble or squash effects, soft transitions, keyboard focus, outside-click cleanup, reduced motion');
}finally{await browser.close();}
