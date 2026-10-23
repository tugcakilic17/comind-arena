// Pixel checks for hover, a single click-to-match arc, and clean symbol backing.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {symbolRects} from '../src/game-ui.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
await mkdir('test-results',{recursive:true});
async function pixels(page,id){
 return page.evaluate(([id,rect])=>{
  const canvas=document.querySelector('canvas'),bounds=canvas.getBoundingClientRect(),ratio=canvas.width/bounds.width;
  return [...document.querySelectorAll(`#board [data-symbol="${id}"]`)].map(el=>{
   // Replay only this sprite's actual canvas draw. Dense layouts put neighbors
   // inside the sample square, which otherwise masks its hover enlargement.
   const r=el.getBoundingClientRect(),size=Math.ceil(Math.max(r.width,r.height)*1.35*ratio);
   const side=el.closest('[data-owner]').dataset.owner;
   const draw=window.symbolDraws.get(`${rect[0]-2}:${rect[1]-2}:${side}`);
   if(!draw) throw new Error('Missing rendered symbol');
   const isolated=document.createElement('canvas');isolated.width=size;isolated.height=size;
   const ctx=isolated.getContext('2d'),m=draw.matrix;
   ctx.setTransform(m.a,m.b,m.c,m.d,m.e-Math.round((r.x+r.width/2-bounds.x)*ratio-size/2),m.f-Math.round((r.y+r.height/2-bounds.y)*ratio-size/2));
   ctx.drawImage(...draw.args);
   const data=ctx.getImageData(0,0,size,size).data;
   let ink=0,hash=2166136261;
   for(let i=0;i<data.length;i+=4){if(data[i+3]>100)ink++;hash=Math.imul(hash^data[i],16777619);hash=Math.imul(hash^data[i+3],16777619);}
   return {ink,hash:hash>>>0};
  });
 },[id,symbolRects[Number(id)]]);
}
try{
 for(const rotating of [false,true]){
 const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const draw=CanvasRenderingContext2D.prototype.drawImage;
  window.symbolDraws=new Map();
  CanvasRenderingContext2D.prototype.drawImage=function(...args){
   if(this.canvas.isConnected&&args[0]?.width===1774){
    const matrix=this.getTransform(),side=matrix.e<this.canvas.width/2?0:1;
    window.symbolDraws.set(`${args[1]}:${args[2]}:${side}`,{args,matrix});
   }
   return draw.apply(this,args);
  };
 });
 await page.clock.install();await page.goto('http://127.0.0.1:5174/');
 await page.locator('[data-mode="solo"]').click();
 if(rotating) await page.locator('[data-option="rotating"]').click();
 await page.locator('.setup-start').click();await page.waitForSelector('.screen-game:not(.is-preparing)');await page.waitForSelector('[data-motion="ready"]');
 // Hold the optional group rotation at 90 degrees to isolate the unchanged
 // per-symbol hover/click arc from the separately tested continuous rotation.
 if(rotating) await page.locator('#board .hex-turntable').evaluateAll(tables=>tables.forEach(table=>table.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=8000;})));
 // Closing the loader can reveal a symbol under the pointer. Give its 170 ms
 // pointer-out tween time to settle before recording the resting pose.
 await page.evaluate(()=>document.fonts.ready);await page.mouse.move(5,5);await page.clock.runFor(300);
 const id=await page.locator('#board').evaluate(board=>{
  const right=[...board.querySelectorAll('[data-side="right"]')].map(el=>el.dataset.symbol);
  return [...board.querySelectorAll('[data-side="left"]')].find(el=>right.includes(el.dataset.symbol)).dataset.symbol;
 });
 const target=page.locator(`[data-side="left"][data-symbol="${id}"]`);
 const idle=await pixels(page,id);await target.hover();await page.clock.runFor(450);
 const hover=await pixels(page,id);
 assert.ok(hover[0].ink>idle[0].ink*1.08,'hover gently enlarges the symbol');
 assert.notEqual(hover[0].hash,idle[0].hash,'hover also changes the artwork pose');
 assert.equal(await target.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
 assert.equal(await target.evaluate(el=>getComputedStyle(el).boxShadow),'none');
 await page.screenshot({path:`test-results/symbol-hover-${rotating?'rotating':'static'}.png`});
 console.log('PASS hover animates the artwork with no circular backing');
 await page.mouse.move(5,5);await page.clock.runFor(250);
 const returned=await pixels(page,id);
 assert.equal(returned[0].hash,idle[0].hash,'leaving hover restores the exact resting pose');
 await target.hover();await page.clock.runFor(450);
 const before=await pixels(page,id);
 await page.mouse.down();await page.clock.runFor(90);
 const held=await pixels(page,id);
 assert.equal(held[0].hash,before[0].hash,'pressing does not insert an extra squash before matching');
 await page.mouse.up();await page.clock.runFor(80);
 const growing=await pixels(page,id);
 assert.ok(growing.every((p,i)=>p.ink>=before[i].ink*.98),'both matching symbols grow immediately without a second dip');
 assert.equal(await page.locator('.play-panel').getAttribute('data-matched-sprites'),'2');
 assert.equal(await page.locator('#score-left').textContent(),'1');
 await page.clock.runFor(130);
 await page.screenshot({path:`test-results/symbol-match-${rotating?'rotating':'static'}.png`});
 console.log('PASS click flows directly from hover into one synchronized match arc');
 await page.clock.runFor(1400);
 assert.equal(await page.locator('#round-label').textContent(),'2. eşleşme');
 assert.equal(errors.length,0,errors.join('\n'));
 await page.close();
 }
 console.log('INTERACTION QA COMPLETE');
}finally{await browser.close();}
