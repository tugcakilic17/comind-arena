import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });

try {
  for (const variant of ['native', 'fallback', 'reduced']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 869 }, reducedMotion: variant === 'reduced' ? 'reduce' : 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(disableNative => {
      if (disableNative) document.startViewTransition = undefined;
      window.resultAnimations = [];
      document.addEventListener('animationstart', event => window.resultAnimations.push(event.animationName));
      const originalAnimate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        window.resultAnimations.push(this.matches('.result-art-button') ? 'button-press' : this.matches('.pending-screen,.game-stage') ? 'game-entry' : 'screen-fade');
        return originalAnimate.apply(this, args);
      };
    }, variant === 'fallback');
    await page.clock.install();
    await page.goto('http://127.0.0.1:5174/', {waitUntil:'domcontentloaded'});
    await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
    await page.clock.fastForward(91000);
    await page.clock.resume();
    await page.waitForFunction(() => document.querySelector('#app').classList.contains('screen-result') && !document.querySelector('#app').inert);

    const animations = await page.evaluate(() => window.resultAnimations);
    if (variant === 'native') {
      assert.ok(animations.includes('result-screen-in') && animations.includes('result-screen-out'), 'native crossfade runs in both directions');
    } else if (variant === 'fallback') {
      assert.equal(animations.filter(name => name === 'screen-fade').length, 2, 'fallback fades out and in');
    } else {
      assert.ok(!animations.includes('result-screen-in') && !animations.includes('screen-fade'), 'reduced motion skips screen movement');
    }
    assert.equal(await page.locator('#result-title').evaluate(el => el === document.activeElement), true, 'result receives keyboard focus after transition');

    if (variant !== 'reduced') {
      await page.locator('.result-home').hover();
      await page.waitForFunction(() => window.resultAnimations.includes('result-home-wave'));
      await page.evaluate(() => { window.resultAnimations = []; });
      await page.locator('.result-replay').hover();
      await page.waitForFunction(() => window.resultAnimations.includes('result-home-wave'));
      await page.locator('.result-replay').click();
      assert.equal(await page.locator('#app').evaluate(el => el.inert), true, 'press animation blocks duplicate actions');
    } else {
      await page.locator('.result-replay').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
    }
    await page.waitForSelector('.screen-game:not(.is-preparing)');
    await page.locator('#score-left').waitFor();
    await page.waitForFunction(() => !document.querySelector('#app').inert);
    assert.equal(await page.locator('#score-left').textContent(), '0');
    assert.equal(await page.locator('#score-right').textContent(), '0');
    assert.equal(await page.evaluate(() => window.resultAnimations.includes('button-press')), variant !== 'reduced');

    await page.clock.fastForward(91000);
    await page.waitForFunction(() => document.querySelector('#app').classList.contains('screen-result') && !document.querySelector('#app').inert);
    await page.locator('.result-home').click();
    await page.locator('.illustrated-home').waitFor();
    assert.equal(await page.locator('#app').evaluate(el => el.inert), false);
    assert.deepEqual(errors, []);
    console.log(`PASS ${variant}: transition, button feedback, input lock, replay and home`);
    await page.close();
  }
} finally {
  await browser.close();
}
