import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/');
  const scoresBefore = await page.evaluate(() => localStorage.getItem('comind.scores.v1'));
  await page.locator('[data-action="help"]').click();
  await page.locator('dialog img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.classList.contains('illustrated-modal')));
  assert.equal(await page.locator('.help-ready').evaluate(button => button === document.activeElement), true);
  assert.equal(await page.locator('.help-practice button,.help-practice [data-action]').count(), 0);
  assert.equal(await page.locator('.help-feedback,.help-tip').count(), 0);
  assert.equal(await page.locator('.help-symbol.is-match').count(), 2);
  assert.equal(await page.locator('.game-symbol-preview image').count(), 12);
  assert.equal(await page.locator('.game-symbol-preview clipPath').count(), 12);
  assert.ok(await page.locator('.game-symbol-preview image').evaluateAll(images => images.every(image => image.getAttribute('href').endsWith('symbols-atlas-v14.webp'))));
  assert.equal(await page.locator('.help-match-glints').count(), 0);
  assert.ok(await page.locator('.help-symbol.is-match').evaluateAll(symbols => symbols.every(symbol => getComputedStyle(symbol, '::before').content === 'none')));
  assert.ok(await page.locator('.help-symbol.is-match').evaluateAll(symbols => symbols.every(symbol => symbol.dataset.helpSymbol === '19')));
  for (const [width, height] of [[1920, 869], [1366, 768], [858, 575], [390, 844], [360, 640], [844, 390]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.locator('dialog.modal').evaluate(dialog => {
      const selectors = ['.help-mascot', '.help-content', '.help-ready', '.close-modal', '.help-card'];
      return selectors.map(selector => {
        const r = dialog.querySelector(selector).getBoundingClientRect();
        return { selector, top: r.top, bottom: r.bottom, left: r.left, right: r.right, fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
      });
    });
    const buttonSpace = await page.locator('dialog.modal').evaluate(dialog => dialog.getBoundingClientRect().bottom - dialog.querySelector('.help-ready').getBoundingClientRect().bottom);
    assert.ok(buttonSpace >= 48, `button has bottom breathing room at ${width}x${height}`);
    await page.screenshot({ path: `test-results/help-v44-${width}-${height}.png` });
    assert.ok(layout.every(item => item.fits), `help fits ${width}x${height}: ${JSON.stringify(layout)}`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  assert.equal(await page.locator('.help-practice').evaluate(element => getComputedStyle(element).pointerEvents), 'none');
  const symbolBox = await page.locator('.help-symbol').first().boundingBox();
  await page.mouse.move(symbolBox.x + symbolBox.width / 2, symbolBox.y + symbolBox.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  assert.equal(await page.locator('dialog.modal').evaluate(dialog => dialog.open), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('comind.scores.v1')), scoresBefore);
  await page.locator('.help-ready').click();
  assert.equal(await page.locator('dialog.modal').evaluate(dialog => dialog.open), false);
  assert.equal(await page.locator('[data-action="help"]').evaluate(button => button === document.activeElement), true);
  for (const method of ['close', 'escape', 'backdrop']) {
    await page.locator('[data-action="help"]').click();
    assert.equal(await page.locator('.help-symbol.is-match').count(), 2);
    if (method === 'close') await page.locator('.close-modal').click();
    else if (method === 'escape') await page.keyboard.press('Escape');
    else await page.mouse.click(1, 1);
    assert.equal(await page.locator('dialog.modal').evaluate(dialog => dialog.open), false);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('[data-action="help"]').click();
  await page.locator('dialog.modal').evaluate(dialog => Promise.all(dialog.getAnimations().map(animation => animation.finished)));
  const motion = await page.locator('.help-symbol.is-match .game-symbol').evaluateAll(symbols => symbols.map(symbol => {
    const animation = symbol.getAnimations()[0];
    const timing = animation.effect.getTiming();
    animation.pause();
    animation.currentTime = 640;
    return { duration: timing.duration, iterations: timing.iterations === Infinity, transform: getComputedStyle(symbol).transform };
  }));
  assert.equal(motion.length, 2);
  assert.ok(motion.every(item => item.duration === 1800 && item.iterations && item.transform !== 'none'));
  const repeat = await page.locator('.help-symbol.is-match .game-symbol').evaluateAll(symbols => symbols.map(symbol => {
    symbol.getAnimations()[0].currentTime = 2440;
    return getComputedStyle(symbol).transform;
  }));
  assert.deepEqual(repeat, motion.map(item => item.transform), 'both symbols repeat their synchronized match movement');
  const oppositeTilt = await page.locator('.help-symbol.is-match .game-symbol').evaluateAll(symbols => symbols.map(symbol => {
    symbol.getAnimations()[0].currentTime = 848;
    return getComputedStyle(symbol).transform;
  }));
  assert.ok(oppositeTilt.every((transform, index) => Number(transform.split(',')[1]) * Number(motion[index].transform.split(',')[1]) < 0), 'both matched symbols sway left and right');
  await page.screenshot({ path: 'test-results/help-v44-match-motion.png' });
  await page.locator('.help-ready').click();
  assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.open && dialog.inert));
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  assert.deepEqual(errors, []);
  console.log('PASS help: six layouts, passive example, two synchronized looping matches, no score writes, focus and smooth close');
} finally { await browser.close(); }
