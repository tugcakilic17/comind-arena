import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/setup', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const choices = await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'no-preference'});
  choices.on('pageerror',error=>errors.push(error.message));
  await choices.addInitScript(()=>{
    const animate=Element.prototype.animate;
    window.choiceMotions=[];
    Element.prototype.animate=function(frames,options){
      const result=animate.call(this,frames,options);
      window.choiceMotions.push({option:this.dataset.option,value:this.dataset.value,duration:typeof options==='object'?options.duration:options});
      return result;
    };
  });
  await choices.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'preview',name:'Ada',avatar:'white'},configured:true}}));
  await choices.goto('http://127.0.0.1:5174/');
  await choices.locator('[data-mode="solo"]').click();
  await choices.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  assert.ok(await choices.locator('dialog[open]').evaluate(el=>el.scrollHeight===el.clientHeight),'desktop setup fits without a scrollbar');
  for (const [width,height] of [[1280,720],[1093,650],[1024,640],[1366,600]]) {
    await choices.setViewportSize({width,height});
    assert.ok(await choices.locator('dialog[open]').evaluate(el=>el.scrollHeight===el.clientHeight),`setup fits without scrolling at ${width}×${height}`);
    assert.ok(await choices.locator('.parrot-options button').evaluateAll(buttons=>buttons.every(button=>{
      const image=button.querySelector('img').getBoundingClientRect(),name=button.querySelector('.parrot-name').getBoundingClientRect();
      return name.top-image.bottom>=6;
    })), 'parrot names have their own gap beneath the images');
  }
  for (const width of [320,390]) {
    await choices.setViewportSize({width,height:844});
    assert.ok(await choices.locator('.parrot-options button').evaluateAll(buttons=>buttons.every(button=>{
      const image=button.querySelector('img').getBoundingClientRect(),name=button.querySelector('.parrot-name').getBoundingClientRect();
      return name.left>=image.right+2;
    })), 'mobile labels stay separate from the character artwork');
  }
  await choices.setViewportSize({width:1366,height:768});
  assert.ok(await choices.locator('.parrot-options img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),'all four character images decode');
  const koak=choices.locator('[data-option="parrot"][data-value="koak"]');
  await koak.hover();
  await choices.waitForTimeout(400);
  const hoverPose=await koak.locator('img').evaluate(el=>getComputedStyle(el).transform);
  assert.notEqual(hoverPose,'none','hover eases into a playful, stable pose');
  await koak.click();
  await choices.waitForTimeout(400);
  assert.equal(await koak.locator('img').evaluate(el=>getComputedStyle(el).transform),hoverPose,'click preserves the hover pose without a second greeting');
  assert.ok(await choices.evaluate(()=>window.choiceMotions.every(motion=>motion.option!=='parrot')),'parrot clicks do not queue native bounce animations');
  assert.equal(await koak.getAttribute('aria-pressed'),'true');
  await koak.click();
  await koak.click();
  await choices.waitForTimeout(400);
  assert.equal(await koak.evaluate(el=>el.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length),0,'rapid clicks settle without queued animations');
  assert.equal(await choices.locator('[data-option="rotating"]').count(),0,'rotation option removed');
  await choices.mouse.move(0,0);
  await choices.waitForTimeout(400);
  assert.equal(await koak.locator('img').evaluate(el=>getComputedStyle(el).transform),'none','leaving the card restores the resting pose');
  await choices.emulateMedia({reducedMotion:'reduce'});
  const komat=choices.locator('[data-option="parrot"][data-value="komat"]');
  await komat.click();
  assert.equal(await komat.evaluate(el=>el.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length),0,'reduced motion disables choice and character animations');
  await choices.close();
  console.log('PASS setup: four decoded identities, no desktop scrollbar, single hover pose, settled motion and reduced motion');
  for (const rule of ['empty', 'collect']) {
    const page = await browser.newPage({ viewport: { width:390, height:844 }, reducedMotion:'no-preference' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/auth/me', route => route.fulfill({ json:{ user:{id:'preview',name:'Ada',avatar:'white'},configured:true } }));
    await page.goto('http://127.0.0.1:5174/');
    await page.locator('[data-mode="solo"]').click();
    if (rule === 'empty') await page.locator('[data-option="parrot"][data-value="koak"]').click();
    await page.locator('[data-option="rule"][data-value="'+rule+'"]').click();
    await page.locator('.setup-start').click();
    await page.locator('.screen-game:not(.is-preparing)').waitFor();
    assert.equal(await page.locator('.play-panel').getAttribute('data-motion'), 'ready', 'stationary cards retain the original Phaser interaction animations');
    await page.clock.install();
    const table = page.locator('[data-owner="0"] .hex-turntable');
    const support = page.locator('[data-owner="0"]>.surface-seaPierCompact');
    const supportBefore = rule === 'empty' ? await support.boundingBox() : null;
    const before = await table.evaluate(el => getComputedStyle(el).transform);
    await page.clock.runFor(800);
    const after = await table.evaluate(el => getComputedStyle(el).transform);
    assert.equal(after, before, 'card and its contents remain stationary');
    await page.locator('[data-action="pause"]').click();
    await page.locator('dialog[data-kind="pause"][open]:not(.is-preparing)').waitFor();
    const paused = await table.evaluate(el => getComputedStyle(el).transform);
    await page.clock.runFor(1000);
    assert.equal(await table.evaluate(el => getComputedStyle(el).transform), paused, 'card stays stationary while paused');
    await page.keyboard.press('Escape');
    await page.locator('dialog.modal[open]').waitFor({ state:'hidden' });
    const id = await page.locator('#board').evaluate(board => {
      const a = [...board.querySelectorAll('[data-owner="0"] .symbol')].map(el => el.dataset.symbol);
      const b = [...board.querySelectorAll('[data-owner="1"] .symbol')].map(el => el.dataset.symbol);
      return a.find(id => b.includes(id));
    });
    const owner = rule === 'collect' ? 1 : 0;
    const symbol = page.locator(`[data-owner="${owner}"] [data-symbol="${id}"]`);
    // Real pointer input at the current native button center.
    const box = await symbol.boundingBox();
    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
    await page.locator('.card-transfer').waitFor();
    const y = await page.locator('.card-transfer').evaluate(el => new DOMMatrix(el.getAnimations()[0].effect.getKeyframes().at(-1).transform).m42);
    assert.ok(rule === 'collect' ? y > 0 : y < 0, `card flies ${rule === 'collect' ? 'toward' : 'away from'} the mobile player`);
    assert.equal(await page.locator('#score-left').textContent(), '1');
    await page.screenshot({ path:`test-results/setup/transfer-${rule}.png` });
    await page.clock.runFor(1600);
    await page.locator('.card-transfer').waitFor({state:'detached'});
    assert.equal(await page.locator('.card-transfer').count(), 0, 'transfer cleans up after arrival');
    if (supportBefore) assert.deepEqual(await support.boundingBox(), supportBefore, 'pier stays anchored through pause and transfer');
    await page.emulateMedia({ reducedMotion:'reduce' });
    assert.equal(await table.evaluate(el => getComputedStyle(el).animationName), 'none', 'reduced motion disables continuous spinning');
    console.log(`PASS ${rule}: stationary cards, native input, pause, directional transfer, cleanup and reduced motion`);
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
