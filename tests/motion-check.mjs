// Integration checks for real Phaser rendering, animation lifecycle and fallback.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
await mkdir('test-results', {recursive:true});
const browser = await chromium.launch({channel:'msedge',headless:true});
const errors=[];
const check=(label,value)=>{assert.ok(value,label);console.log('PASS',label);};
async function common(page) {
  return page.locator('#board').evaluate(board=>{
    const left=[...board.querySelectorAll('[data-side="left"]')].map(el=>el.dataset.symbol);
    const right=[...board.querySelectorAll('[data-side="right"],[data-side="opponent"]')].map(el=>el.dataset.symbol);
    return left.find(id=>right.includes(id));
  });
}
async function ready(page) {
  await page.waitForSelector('.play-panel[data-motion="ready"]');
  await page.evaluate(()=>document.fonts.ready);
  await page.clock.runFor(100);
}
async function pixelRegions(page,id) {
  return page.evaluate(id=>{
    const canvas=document.querySelector('.phaser-layer canvas');
    const rect=canvas.getBoundingClientRect();
    const ratio=canvas.width/rect.width;
    const ctx=canvas.getContext('2d');
    return [...document.querySelectorAll(`#board [data-symbol="${id}"]`)].map(button=>{
      const box=button.getBoundingClientRect();
      const size=Math.round(Math.max(box.width,box.height)*1.5*ratio);
      const x=Math.round((box.x+box.width/2-rect.x)*ratio-size/2);
      const y=Math.round((box.y+box.height/2-rect.y)*ratio-size/2);
      const data=ctx.getImageData(x,y,size,size).data;
      let hash=2166136261,ink=0;
      for(let i=0;i<data.length;i+=4){if(data[i+3]>30)ink++;hash=Math.imul(hash^data[i],16777619);hash=Math.imul(hash^data[i+3],16777619);}
      return {hash:hash>>>0,ink};
    });
  },id);
}
async function canvasHash(page) {
  return page.locator('canvas').evaluate(canvas=>{
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let hash=2166136261;
    for(let i=0;i<data.length;i++) hash=Math.imul(hash^data[i],16777619);
    return hash>>>0;
  });
}
try {
  const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:2});
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('[data-mode="solo"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  await ready(page);
  check('Phaser renders all twelve symbols at device pixel density',await page.locator('.phaser-layer').getAttribute('data-sprite-count')==='12' && await page.locator('canvas').evaluate(canvas=>Math.abs(canvas.width/canvas.getBoundingClientRect().width-2)<.02));
  await page.mouse.move(10,10);
  const id=await common(page);
  const before=await pixelRegions(page,id);
  check('both real canvas symbols contain visible raster artwork',before.length===2 && before.every(region=>region.ink>200));
  await page.locator(`[data-side="left"][data-symbol="${id}"]`).focus();
  await page.keyboard.press('Enter');
  check('one keyboard choice starts a shared two-sprite celebration',await page.locator('.play-panel').getAttribute('data-matched-sprites')==='2' && await page.locator('#score-left').textContent()==='1');
  await page.clock.runFor(200);
  const during=await pixelRegions(page,id);
  check('both matching symbols animate simultaneously',during.every((region,index)=>region.hash!==before[index].hash));
  await page.keyboard.press('Enter');
  check('repeat input during celebration never awards a second point',await page.locator('#score-left').textContent()==='1');
  await page.locator('.pause-button').click();
  await page.clock.runFor(100);
  const frozen=await pixelRegions(page,id);
  const frozenTime=await page.locator('#timer').textContent();
  await page.clock.runFor(1000);
  check('pause freezes Phaser motion and the match clock',JSON.stringify(await pixelRegions(page,id))===JSON.stringify(frozen) && await page.locator('#timer').textContent()===frozenTime);
  await page.locator('.pause-continue').click();
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  await page.clock.runFor(1600);
  check('new round restores opacity, interaction and exactly twelve sprites',await page.locator('#round-label').textContent()==='2. eşleşme' && await page.locator('#board').getAttribute('aria-busy')===null && await page.locator('.game-cards').evaluate(el=>getComputedStyle(el).opacity==='1') && await page.locator('.phaser-layer').getAttribute('data-sprite-count')==='12');
  const transitionId=await common(page);
  await page.locator(`[data-side="left"][data-symbol="${transitionId}"]`).evaluate(button=>button.click());
  for(let step=0;step<20 && await page.locator('.play-panel').getAttribute('data-round-transition')!=='out';step++) await page.clock.runFor(50);
  check('old cards enter the controlled exit phase',await page.locator('.play-panel').getAttribute('data-round-transition')==='out');
  await page.clock.runFor(70);
  check('Phaser fades both old cards',await page.locator('.hex-card').evaluateAll(cards=>cards.every(el=>Number(getComputedStyle(el).opacity)<1)));
  check('wooden supports stay visible during card changes',await page.locator('.surface-woodenStage').evaluateAll(stages=>stages.every(stage=>{
    for(let element=stage;element;element=element.parentElement) if(Number(getComputedStyle(element).opacity)<.99) return false;
    return true;
  })));
  for(let step=0;step<10 && await page.locator('.play-panel').getAttribute('data-round-transition')!=='in';step++) await page.clock.runFor(30);
  check('new cards enter together while input remains locked',await page.locator('.play-panel').getAttribute('data-round-transition')==='in' && await page.locator('#board').getAttribute('aria-busy')==='true');
  const enteringId=await common(page);
  await page.locator(`[data-side="left"][data-symbol="${enteringId}"]`).evaluate(button=>button.click());
  check('input during a card change cannot score',await page.locator('#score-left').textContent()==='2');
  await page.clock.runFor(500);
  check('entry phase settles on the following pair',await page.locator('#round-label').textContent()==='3. eşleşme' && await page.locator('#board').getAttribute('aria-busy')===null);
  await page.setViewportSize({width:390,height:844});
  await page.clock.runFor(200);
  const mobileId=await common(page);
  check('resize realigns both canvas symbols with native touch targets',(await pixelRegions(page,mobileId)).every(region=>region.ink>100));
  await page.locator(`[data-side="left"][data-symbol="${mobileId}"]`).click();
  check('mobile touch target scores after resizing',await page.locator('#score-left').textContent()==='3');
  await page.clock.runFor(1600);
  await page.locator('[data-action="leave"]').click();
  await page.locator('[data-action="confirm-home"]').click();
  await page.locator('.illustrated-home').waitFor();
  await page.clock.runFor(200);
  check('leaving a game destroys its canvas',await page.locator('canvas').count()===0);
  for(let index=0;index<3;index++){
    await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');await ready(page);
    check('restarting creates one engine, never duplicate canvases',await page.locator('canvas').count()===1);
    const matchId=await common(page);
    await page.locator(`[data-side="right"][data-symbol="${matchId}"]`).click();
    check('second player gets the same synchronized animation',await page.locator('#score-right').textContent()==='1' && await page.locator('.play-panel').getAttribute('data-matched-sprites')==='2');
    await page.locator('[data-action="leave"]').click();await page.locator('[data-action="confirm-home"]').click();
    await page.locator('.illustrated-home').waitFor();
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-mode="solo"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');await ready(page);
  const reducedId=await common(page);
  const still=await canvasHash(page);
  await page.locator(`[data-side="left"][data-symbol="${reducedId}"]`).click();
  await page.clock.runFor(300);
  check('reduced motion keeps the entire Phaser canvas still',await canvasHash(page)===still);
  await page.close();

  const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  touch.on('pageerror',error=>errors.push(error.message));
  await touch.clock.install();
  await touch.goto('http://127.0.0.1:5174/');
  await touch.locator('[data-mode="solo"]').tap();await touch.waitForSelector('.screen-game:not(.is-preparing)');await ready(touch);
  const touchId=await common(touch);
  await touch.locator(`[data-side="left"][data-symbol="${touchId}"]`).tap();
  check('native touch input drives both Phaser sprites',await touch.locator('#score-left').textContent()==='1' && await touch.locator('.play-panel').getAttribute('data-matched-sprites')==='2');
  await touch.clock.runFor(200);
  await touch.screenshot({path:'test-results/match-animation-mobile.png'});
  await touch.close();

  const fallback=await browser.newPage();
  fallback.on('pageerror',error=>errors.push(error.message));
  await fallback.route('**/spark-hd-v16.webp',route=>route.abort());
  await fallback.goto('http://127.0.0.1:5174/');
  await fallback.locator('[data-mode="solo"]').click();await fallback.waitForSelector('.screen-game:not(.is-preparing)');
  await fallback.waitForSelector('.play-panel[data-motion="fallback"]');
  check('failed optional effect texture preserves visible native symbols',await fallback.locator('.phaser-ready').count()===0 && await fallback.locator('#board .symbol').count()===12 && await fallback.locator('.game-symbol').evaluateAll(elements=>elements.every(element=>getComputedStyle(element).opacity==='1')));
  const fallbackId=await common(fallback);
  await fallback.locator(`[data-side="left"][data-symbol="${fallbackId}"]`).click();
  check('a failed optional animation layer does not block scoring',await fallback.locator('#score-left').textContent()==='1');
  await fallback.close();
  check('no uncaught runtime errors',errors.length===0);
  console.log('PHASER MOTION QA COMPLETE');
} finally {await browser.close();}
