// Pixel checks for hover, a single click-to-match arc, and clean symbol backing.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
async function pixels(page,id){
 return page.evaluate(id=>{
  const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),bounds=canvas.getBoundingClientRect(),ratio=canvas.width/bounds.width;
  return [...document.querySelectorAll(`#board [data-symbol="${id}"]`)].map(el=>{
   // Isolate this smaller symbol; a wider sample can include neighboring artwork.
   const r=el.getBoundingClientRect(),size=Math.ceil(Math.max(r.width,r.height)*1.35*ratio);
   const data=ctx.getImageData(Math.round((r.x+r.width/2-bounds.x)*ratio-size/2),Math.round((r.y+r.height/2-bounds.y)*ratio-size/2),size,size).data;
   let ink=0,hash=2166136261;
   for(let i=0;i<data.length;i+=4){if(data[i+3]>100)ink++;hash=Math.imul(hash^data[i],16777619);hash=Math.imul(hash^data[i+3],16777619);}
   return {ink,hash:hash>>>0};
  });
 },id);
}
try{
 const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install();await page.goto('http://127.0.0.1:5174/');
 await page.locator('[data-mode="solo"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');await page.waitForSelector('[data-motion="ready"]');
 // Closing the loader can reveal a symbol under the pointer. Give its 170 ms
 // pointer-out tween time to settle before recording the resting pose.
 await page.evaluate(()=>document.fonts.ready);await page.mouse.move(5,5);await page.clock.runFor(300);
 const id=await page.locator('#board').evaluate(board=>{
  const right=[...board.querySelectorAll('[data-side="opponent"]')].map(el=>el.dataset.symbol);
  return [...board.querySelectorAll('[data-side="left"]')].find(el=>right.includes(el.dataset.symbol)).dataset.symbol;
 });
 const target=page.locator(`[data-side="left"][data-symbol="${id}"]`);
 const idle=await pixels(page,id);await target.hover();await page.clock.runFor(450);
 const hover=await pixels(page,id);
 assert.ok(hover[0].ink>idle[0].ink*1.08,'hover gently enlarges the symbol');
 assert.notEqual(hover[0].hash,idle[0].hash,'hover also changes the artwork pose');
 assert.equal(await target.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
 assert.equal(await target.evaluate(el=>getComputedStyle(el).boxShadow),'none');
 await page.screenshot({path:'test-results/symbol-hover-v20.png'});
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
 await page.screenshot({path:'test-results/symbol-match-v20.png'});
 console.log('PASS click flows directly from hover into one synchronized match arc');
 await page.clock.runFor(1400);
 assert.equal(await page.locator('#round-label').textContent(),'2. eşleşme');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('INTERACTION QA COMPLETE');
}finally{await browser.close();}
