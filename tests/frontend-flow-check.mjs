// Cold loading, network failure/retry/cancel and complete frontend flows.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.COMIND_TEST_URL || 'http://127.0.0.1:5174/';
const gameReady = async page => {
  try { await page.waitForSelector('.screen-game:not(.is-preparing)'); }
  catch (error) {
    console.log(await page.evaluate(() => ({ screen:document.querySelector('#app').className, text:document.body.innerText, motion:document.querySelector('.play-panel')?.dataset.motion })));
    throw error;
  }
};
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/card-lavender-leafy-v21.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 2200));
    await route.continue();
  });
  await page.goto(base);
  await page.locator('[data-mode="solo"]').click();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#timer').count(), 0, 'the clock does not exist while critical artwork loads');
  assert.equal(await page.locator('.screen-home').count(), 1, 'the complete previous screen remains visible');
  assert.equal(await page.locator('.loading-dialog[open]').count(), 0, 'no loading popup is shown');
  assert.ok(await page.locator('.illustrated-home').isVisible());
  await gameReady(page);
  assert.equal(await page.locator('#timer').textContent(), '90');
  assert.ok(await page.locator('#app img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
  assert.match(await page.locator('.play-panel').getAttribute('data-motion'), /^(ready|fallback)$/);
  assert.equal(await page.locator('#game-title').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('.loading-dialog').evaluate(el => el.open), false);
  assert.equal(await page.locator('.pending-screen').count(), 0, 'the preserved view is removed after the first game frame');
  console.log('PASS delayed artwork: complete first game frame, ready motion/fallback, 90-second clock and keyboard focus');
  await page.locator('[data-action="leave"]').click();
  await page.locator('.leave-home').click();
  await page.locator('.screen-home').waitFor();
  assert.equal(await page.locator('[data-mode="solo"]').evaluate(el => el === document.activeElement), true);

  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-level="fast"]').click();
  await page.locator('dialog.modal .sound-button').click();
  await page.reload();
  await page.locator('[data-action="settings"]').click();
  assert.equal(await page.locator('[data-level="fast"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('dialog.modal .sound-button').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('Escape');
  console.log('PASS sound and difficulty survive reload');

  for (const kind of ['leaderboard']) {
    await page.locator(kind === 'invite' ? '[data-mode="online"]' : '[data-action="leaderboard"]').click();
    await page.locator('dialog.modal:not(.is-preparing)').waitFor();
    for (const [width, height] of [[1920,869],[1366,768],[390,844],[360,640],[844,390],[360,480]]) {
      await page.setViewportSize({ width, height });
      assert.ok(await page.locator('dialog.modal').evaluate(dialog => {
        const r = dialog.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      }), `${kind} fits ${width}x${height}`);
      await page.locator('.community-ready').scrollIntoViewIfNeeded();
      assert.ok(await page.locator('.community-ready').isVisible());
      if (width === 1366 || width === 390) await page.screenshot({ path: `test-results/${kind}-${width}.png` });
    }
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-mode="online"]').click();
  await page.locator('.online-shell').waitFor();
  assert.equal(await page.getByRole('button',{name:'Google ile devam et',exact:true}).count(),1,'friend match requires a real account');
  await page.locator('[data-action="online-home"]').click();
  assert.deepEqual(errors, []);
  await page.close();

  const retry = await browser.newPage({ reducedMotion: 'reduce' });
  await retry.route('**/card-lavender-leafy-v21.webp', route => route.abort());
  await retry.goto(base);
  await retry.locator('[data-mode="solo"]').click();
  await retry.locator('.loading-dialog.is-error[open]').waitFor();
  assert.equal(await retry.locator('#timer').count(), 0);
  await retry.unroute('**/card-lavender-leafy-v21.webp');
  await retry.locator('[data-loading="retry"]').click();
  await gameReady(retry);
  assert.equal(await retry.locator('#score-left').textContent(), '0');
  await retry.close();
  console.log('PASS failed critical artwork offers a working retry');

  const cancel = await browser.newPage({ reducedMotion: 'reduce' });
  await cancel.route('**/card-lavender-leafy-v21.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    await route.continue();
  });
  await cancel.goto(base);
  await cancel.locator('[data-mode="solo"]').click();
  await cancel.keyboard.press('Escape');
  await cancel.waitForTimeout(2400);
  assert.equal(await cancel.locator('.screen-home').count(), 1, 'a canceled request never reopens the game');
  assert.equal(await cancel.locator('.loading-dialog').evaluate(el => el.open), false);
  await cancel.close();

  const privatePage = await browser.newPage({ reducedMotion: 'reduce' });
  await privatePage.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await privatePage.goto(base);
  await privatePage.locator('[data-action="settings"]').click();
  await privatePage.locator('[data-level="normal"]').click();
  await privatePage.locator('dialog.modal .sound-button').click();
  await privatePage.keyboard.press('Escape');
  await privatePage.locator('[data-mode="local"]').click();
  await gameReady(privatePage);
  await privatePage.close();
  console.log('PASS loading cancellation, leaderboard layouts, friend account requirement and unavailable browser storage');
} finally { await browser.close(); }
