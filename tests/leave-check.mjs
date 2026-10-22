import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel:'msedge', headless:true });
try {
  const page = await browser.newPage({ viewport:{width:858,height:575}, reducedMotion:'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  const shared = await page.locator('#board').evaluate(board => {
    const right = [...board.querySelectorAll('[data-side="right"]')].map(el => el.dataset.symbol);
    return [...board.querySelectorAll('[data-side="left"]')].find(el => right.includes(el.dataset.symbol)).dataset.symbol;
  });
  await page.locator(`[data-side="left"][data-symbol="${shared}"]`).click();
  await page.clock.runFor(1400);
  await page.locator('[data-action="leave"]').click();
  await page.locator('dialog img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  assert.equal(await page.locator('.leave-continue').evaluate(el => el === document.activeElement), true);
  const remaining = await page.locator('#timer').textContent();
  await page.clock.runFor(5000);
  assert.equal(await page.locator('#timer').textContent(), remaining, 'confirmation pauses the timer');
  assert.equal(await page.locator('#score-left').textContent(), '1');
  for (const [width,height] of [[858,575],[1920,869],[1366,768],[390,844],[360,640],[844,390]]) {
    await page.setViewportSize({width,height});
    assert.ok(await page.locator('dialog.modal').evaluate(dialog => {
      return ['.leave-mascot','.leave-content','.close-modal','.leave-continue','.leave-home'].every(selector => {
        const rect = dialog.querySelector(selector).getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
      }) && document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight;
    }), `confirmation fits ${width}x${height}`);
    await page.screenshot({path:`test-results/leave-v38-${width}-${height}.png`});
  }
  await page.locator('.leave-continue').click();
  assert.equal(await page.locator('.illustrated-game').evaluate(el => el.classList.contains('is-paused')), false);
  assert.equal(await page.locator('#score-left').textContent(), '1');
  await page.clock.runFor(1000);
  assert.ok(Number(await page.locator('#timer').textContent()) < Number(remaining));
  for (const method of ['escape','backdrop','close']) {
    await page.locator('[data-action="leave"]').click();
    if (method === 'escape') await page.keyboard.press('Escape');
    else if (method === 'backdrop') await page.mouse.click(1,1);
    else await page.locator('.close-modal').click();
    assert.equal(await page.locator('dialog.modal').evaluate(dialog => dialog.open), false);
    assert.equal(await page.locator('.illustrated-game').evaluate(el => el.classList.contains('is-paused')), false);
  }
  await page.locator('.pause-button').click();
  assert.equal(await page.locator('dialog.modal').getAttribute('data-kind'), 'pause');
  await page.locator('.pause-continue').click();
  assert.equal(await page.locator('.illustrated-game').evaluate(el => el.classList.contains('is-paused')), false);
  await page.locator('[data-action="leave"]').click();
  await page.locator('.leave-home').click();
  await page.locator('.illustrated-home').waitFor();
  await page.close();

  const animated = await browser.newPage({ viewport:{width:1366,height:768}, reducedMotion:'no-preference' });
  animated.on('pageerror', error => errors.push(error.message));
  await animated.goto('http://127.0.0.1:5174/');
  await animated.locator('[data-mode="local"]').click();await animated.waitForSelector('.screen-game:not(.is-preparing)');
  await animated.locator('[data-action="leave"]').click();
  await animated.locator('.leave-continue').click();
  assert.ok(await animated.locator('dialog.modal').evaluate(dialog => dialog.open && dialog.inert), 'continue waits for the exit animation');
  assert.ok(await animated.locator('.illustrated-game').evaluate(el => el.classList.contains('is-paused')));
  await animated.waitForFunction(() => !document.querySelector('dialog').open);
  assert.equal(await animated.locator('.illustrated-game').evaluate(el => el.classList.contains('is-paused')), false);
  await animated.locator('[data-action="leave"]').click();
  await animated.locator('.leave-home').click();
  assert.ok(await animated.locator('#app').evaluate(app => app.classList.contains('screen-game')), 'confirm home does not abruptly replace the closing panel');
  assert.ok(await animated.locator('.illustrated-game').evaluate(el => el.classList.contains('is-paused')));
  await animated.locator('.illustrated-home').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS leave layout, paused time and preserved score, all cancel routes, smooth continue and confirmed home');
} finally { await browser.close(); }
