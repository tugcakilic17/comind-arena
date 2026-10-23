import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({reducedMotion:'reduce'});
const base=process.env.TEST_URL || 'http://localhost:5174';
const user={id:'sample',name:'Ada',publicCode:'ABCD1234',avatar:'white'};
const players=[user,{...user,id:'b',name:'Bora',avatar:'lilac'},{...user,id:'c',name:'Cem',avatar:'rose'},{...user,id:'d',name:'Deniz'}];
let state='create';
const now=Date.now();
const room=()=>({id:'sample-room',code:'ABCDEFGH',status:state==='result'?'finished':state==='playing'?'playing':'waiting',revision:1,you:0,players,options:{capacity:4,symbolCount:8,winTarget:5},departed:[false,false,false,false],scores:state==='result'?[5,2,1,0]:[0,0,0,0],winners:[],round:1,pair:[[0,1,2,3,4,5,6,7],[0,8,9,10,11,12,13,14]],ready:[false,false,false,false],startsAt:now,turnAt:now,serverTime:Date.now(),winner:state==='result'?0:null,reason:state==='result'?'target':null});
await page.route('**/api/auth/me',route=>route.fulfill({json:{configured:true,user}}));
await page.route('**/api/arena/rooms/ABCDEFGH',route=>route.fulfill({json:room()}));
await page.route('**/api/arena/friends',route=>route.fulfill({json:{friends:players.slice(1),incoming:[{...players[1],id:'e',name:'Ece'}],outgoing:[{...players[2],id:'f',name:'Fırat'}],invites:[]}}));
const dimensions=[[1436,692],[1178,582],[1366,768],[1024,600],[390,844],[360,640],[320,568],[844,390],[667,375]];
await mkdir('test-results/online',{recursive:true});
let count=0;
const frameSizes=new Map();
try{
 for(state of ['create','waiting','friends','playing','result']){
  await page.setViewportSize({width:1366,height:768});
  await page.goto(`${base}/${['waiting','playing','result'].includes(state)?'?room=ABCDEFGH':''}`);
  if(['create','friends'].includes(state)) await page.getByRole('button',{name:'Arkadaşını Çağır',exact:true}).click();
  if(state==='friends') await page.getByRole('button',{name:/Arkadaşlarım/}).click();
  await page.locator(state==='playing'?'#online-board':state==='waiting'?'.online-seats':state==='result'?'.online-result':'.online-panel').waitFor();
  await page.locator('.surface-resultPanel img').evaluateAll(els=>Promise.all(els.map(img=>img.decode())));
  await page.evaluate(()=>document.fonts.ready);
  for(const [width,height] of dimensions){
   await page.setViewportSize({width,height});
   const metrics=await page.evaluate(()=>{
    const content=document.querySelector('.online-tab-content');
    const board=document.querySelector('.online-cards');
    const cards=[...document.querySelectorAll('.hex-card')].map(el=>el.getBoundingClientRect().width);
    const hidden=[...document.querySelectorAll('.online-setup .online-primary,.online-share-box .online-whatsapp,.online-share-box .online-secondary,.online-lobby-actions button')].filter(el=>{
     const b=el.getBoundingClientRect(),parent=content?.getBoundingClientRect();
     return b.width>0 && (b.top<0 || b.bottom>innerHeight || (parent&&b.bottom>parent.bottom+1));
    }).map(el=>el.textContent.trim());
    return {outer:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,overflow:content?content.scrollHeight-content.clientHeight:0,hidden,cards,parts:[...document.querySelectorAll(".online-panel,.online-heading,.online-tabs,.online-tab-content,.online-setup,.online-join-card,.online-choice,.online-friends-grid,.online-add-friend,.online-friend-list,.online-lobby-grid>.online-box,.online-room-title,.online-seats,.online-lobby-actions")].map(el=>({class:el.className,h:el.getBoundingClientRect().height,pad:getComputedStyle(el).padding}))};
   });
   assert.ok(!metrics.outer,`${state} outer fit ${width}x${height}`);
   if(['create','waiting','friends'].includes(state))assert.ok(metrics.overflow<=2&&metrics.hidden.length===0,`${state} controls fit ${width}x${height}: ${JSON.stringify(metrics)}`);
   if(['create','waiting','friends'].includes(state)){
    const frame=await page.locator('.online-hub').boundingBox(),key=`${width}x${height}`;
    if(state==='create')frameSizes.set(key,frame);
    else {const original=frameSizes.get(key);assert.ok(['x','y','width','height'].every(k=>Math.abs(original[k]-frame[k])<1),`frame stays the same size across tabs ${state} ${key}`);}
    const margins=await page.locator('.online-tab-content>.online-create-grid>.online-box,.online-tab-content>.online-lobby-grid>.online-box,.online-tab-content>.online-friends-grid>.online-box').evaluateAll(els=>els.map(el=>{const box=el.getBoundingClientRect(),panel=el.closest('.online-panel').getBoundingClientRect();return Math.min(box.left-panel.left,panel.right-box.right,panel.bottom-box.bottom);}));
    assert.ok(margins.every(n=>n>=20),`cards inset from frame ${state} ${width}x${height}: ${margins} ${JSON.stringify(metrics.parts)}`);
    const painted=await page.locator('.online-hub').evaluate(panel=>{
     const img=panel.querySelector('.surface-resultPanel img'),r=img.getBoundingClientRect();
     const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
     return [...panel.querySelectorAll('.online-tab-content>div>.online-box')].map(el=>{
      const b=el.getBoundingClientRect();
      const points=[[b.left+12,b.top+12],[b.right-12,b.top+12],[b.right-12,b.bottom-12],[b.left+12,b.bottom-12],[b.left+b.width/2,b.bottom-1],[b.left+1,b.top+b.height/2],[b.right-1,b.top+b.height/2]];
      const failed=points.filter(([x,y])=>{const [red,green,blue,alpha]=ctx.getImageData(Math.floor((x-r.left)/r.width*img.naturalWidth),Math.floor((y-r.top)/r.height*img.naturalHeight),1,1).data;return !(alpha>200&&red>215&&green>205&&blue>160);});
      return {card:el.className,failed};
     });
    });
    assert.ok(painted.every(card=>!card.failed.length),`cards stay on painted cream, clear of rim/leaves ${state} ${width}x${height}: ${JSON.stringify(painted)}`);
    assert.equal(await page.locator('.online-tabs button').count(),2);
    assert.equal(await page.getByText('Ayrı ekranlarda, aynı eğlencede!',{exact:true}).count(),0);
    assert.ok(await page.locator('.online-peeker').evaluate(el=>el.complete&&el.naturalWidth>0&&el.getBoundingClientRect().top>=0));
   }
   if(state==='friends'){const clipped=await page.locator('.online-own-code').evaluate(el=>el.getBoundingClientRect().bottom>document.querySelector('.online-tab-content').getBoundingClientRect().bottom+1);assert.ok(!clipped,`own ID visible ${width}x${height}`);}
   if(state==='playing')assert.ok(metrics.cards.every(n=>n>145),`cards fill ${width}x${height}: ${JSON.stringify(metrics)}`);
   await page.screenshot({path:`test-results/online/${state}-fit-${width}x${height}.png`});count++;
  }
 }
 console.log(`PASS ${count} friend hub, lobby, friends, match and result layouts; essential controls visible without scrolling`);
}catch(error){await page.screenshot({path:'test-results/online/fit-failure.png'});throw error;}
finally{await browser.close();}
