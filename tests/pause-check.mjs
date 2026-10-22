import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
  const page = await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  await page.locator('.pause-button').click();
  assert.equal(await page.locator('dialog.modal').getAttribute('data-kind'),'pause');
  assert.equal(await page.locator('.pause-continue').evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('.pause-overlay').count(),0);
  await page.locator('dialog img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const before=await page.locator('#timer').textContent();
  await page.clock.runFor(5000);
  assert.equal(await page.locator('#timer').textContent(),before);
  const shared=await page.locator('#board').evaluate(board=>{
    const right=[...board.querySelectorAll('[data-side="right"]')].map(el=>el.dataset.symbol);
    return [...board.querySelectorAll('[data-side="left"]')].find(el=>right.includes(el.dataset.symbol)).dataset.symbol;
  });
  await page.locator(`[data-side="left"][data-symbol="${shared}"]`).evaluate(el=>el.click());
  assert.equal(await page.locator('#score-left').textContent(),'0','paused symbols cannot score');
  for(const [width,height] of [[1920,869],[1366,768],[858,575],[390,844],[360,640],[844,390]]){
    await page.setViewportSize({width,height});
    assert.ok(await page.locator('dialog.modal').evaluate(dialog=>['.leave-mascot','.pause-content','.close-modal','.pause-continue'].every(selector=>{
      const r=dialog.querySelector(selector).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;
    })&&document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),`pause fits ${width}x${height}`);
    await page.screenshot({path:`test-results/pause-v39-${width}-${height}.png`});
  }
  await page.locator('.pause-continue').click();
  assert.equal(await page.locator('dialog.modal').evaluate(el=>el.open),false);
  await page.clock.runFor(1000);
  assert.ok(Number(await page.locator('#timer').textContent())<Number(before));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog.modal').getAttribute('data-kind'),'pause');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog.modal').evaluate(el=>el.open),false);
  for(const method of ['close','backdrop']){
    await page.locator('.pause-button').click();
    if(method==='close')await page.locator('.close-modal').click();else await page.mouse.click(1,1);
    assert.equal(await page.locator('.illustrated-game').evaluate(el=>el.classList.contains('is-paused')),false);
  }
  await page.close();
  const animated=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'no-preference'});
  animated.on('pageerror',error=>errors.push(error.message));
  await animated.goto('http://127.0.0.1:5174/');
  await animated.locator('[data-mode="local"]').click();await animated.waitForSelector('.screen-game:not(.is-preparing)');
  await animated.locator('.pause-button').click();
  await animated.locator('.pause-continue').click();
  assert.ok(await animated.locator('dialog.modal').evaluate(el=>el.open&&el.inert));
  assert.ok(await animated.locator('.illustrated-game').evaluate(el=>el.classList.contains('is-paused')),'clock stays paused during closing');
  await animated.waitForFunction(()=>!document.querySelector('dialog').open);
  assert.equal(await animated.locator('.illustrated-game').evaluate(el=>el.classList.contains('is-paused')),false);
  assert.deepEqual(errors,[]);
  console.log('PASS shared pause panel, six layouts, frozen timer/input, all resume controls and animated exit');
}finally{await browser.close();}
