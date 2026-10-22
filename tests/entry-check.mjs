// The game opens softly only after the artwork is ready; its clock waits.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport:{ width:1366, height:768 }, reducedMotion:'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Hold the outgoing fade so slow CI machines cannot skip the middle frame.
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = original.apply(this, args);
      if (this.matches('.pending-screen')) { animation.pause(); window.entryFade = animation; }
      return animation;
    };
  });
  await page.goto('http://127.0.0.1:5174/', {waitUntil:'domcontentloaded'});
  await page.locator('[data-mode="local"]').click();
  try { await page.locator('#app.is-entering').waitFor(); }
  catch (error) {
    console.log(await page.evaluate(() => ({ screen:document.querySelector('#app').className, text:document.body.innerText, motion:document.querySelector('.play-panel')?.dataset.motion })));
    throw error;
  }
  const opacity = await page.evaluate(() => {
    window.entryFade.currentTime = 210;
    return Number(getComputedStyle(document.querySelector('.pending-screen')).opacity);
  });
  assert.ok(opacity > .1 && opacity < .9, 'the previous screen has a real blended middle frame');
  assert.equal(await page.locator('#timer').textContent(), '90', 'the clock is untouched while the old screen fades');
  assert.ok(await page.locator('#app').evaluate(app => app.inert), 'input remains locked during entry');
  assert.ok(await page.locator('#app img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
  assert.equal(await page.locator('.loading-dialog[open]').count(),0);
  await page.evaluate(() => window.entryFade.play());
  await page.locator('.screen-game:not(.is-preparing)').waitFor();
  assert.equal(await page.locator('.pending-screen').count(),0);
  assert.equal(await page.locator('#game-title').evaluate(el => el === document.activeElement),true);
  await page.screenshot({path:'test-results/game-soft-entry.png'});
  console.log('PASS real crossfade, complete artwork, locked input, no popup, full clock and clean final frame');

  await page.locator('[data-action="leave"]').click();
  await page.locator('.leave-home').click();
  await page.locator('[data-mode="local"]').waitFor();
  await page.locator('[data-mode="local"]').click();
  await page.locator('#app.is-entering').waitFor();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(650);
  assert.equal(await page.locator('.screen-home').count(),1);
  assert.equal(await page.locator('.pending-screen,#app.is-entering,canvas').count(),0);
  assert.equal(await page.locator('#app').evaluate(app => app.inert),false);
  assert.deepEqual(errors,[]);
  await page.close();

  const reduced = await browser.newPage({reducedMotion:'reduce'});
  await reduced.addInitScript(() => {
    window.entrySeen = false;
    new MutationObserver(() => { if (document.querySelector('#app.is-entering')) window.entrySeen = true; }).observe(document, {subtree:true, attributes:true, attributeFilter:['class']});
  });
  await reduced.goto('http://127.0.0.1:5174/', {waitUntil:'domcontentloaded'});
  await reduced.locator('[data-mode="solo"]').click();
  await reduced.locator('.screen-game:not(.is-preparing)').waitFor();
  assert.equal(await reduced.evaluate(() => window.entrySeen),false);
  await reduced.close();
  console.log('PASS Escape cancels entry without reopening the game; reduced motion skips movement');
} finally { await browser.close(); }
