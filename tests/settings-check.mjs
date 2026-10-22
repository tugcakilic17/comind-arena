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
  await page.locator('[data-action="settings"]').click();
  await page.locator('dialog img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.classList.contains('illustrated-modal')));
  assert.ok(await page.locator('[data-level="easy"]').evaluate(button => button === document.activeElement));
  for (const [width, height] of [[1920,869],[1366,768],[858,575],[390,844],[360,640],[844,390]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.locator('dialog.modal').evaluate(dialog => ['.settings-content','.settings-mascot','.close-modal','.settings-ready','.level-options','.settings-sound'].map(selector => {
      const r = dialog.querySelector(selector).getBoundingClientRect();
      return { selector, top:r.top, bottom:r.bottom, left:r.left, right:r.right, fits:r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth };
    }));
    await page.screenshot({ path:`test-results/settings-v44-${width}-${height}.png` });
    assert.ok(layout.every(item => item.fits), `settings fit ${width}x${height}: ${JSON.stringify(layout)}`);
  }
  await page.setViewportSize({ width:1366, height:768 });
  const panel = await page.locator('.settings-content').elementHandle();
  for (const level of ['normal','fast','easy']) {
    await page.locator(`[data-level="${level}"]`).click();
    assert.equal(await page.locator('[data-level][aria-pressed="true"]').count(),1);
    assert.equal(await page.locator(`[data-level="${level}"]`).getAttribute('aria-pressed'),'true');
    assert.ok(await page.locator(`[data-level="${level}"]`).evaluate(button => button === document.activeElement));
    assert.ok(await panel.evaluate(element => element.isConnected), 'level choice updates in place');
  }
  assert.match(await page.locator('.settings-level-hint').textContent(), /bolca zaman/);
  const sound = page.locator('dialog .sound-button');
  await sound.click();
  assert.equal(await sound.getAttribute('aria-pressed'),'true');
  await sound.click();
  assert.equal(await sound.getAttribute('aria-pressed'),'false');
  await page.locator('[data-level="fast"]').click();
  await page.locator('.settings-ready').click();
  assert.ok(await page.locator('[data-action="settings"]').evaluate(button => button === document.activeElement));
  await page.locator('[data-action="settings"]').click();
  assert.equal(await page.locator('[data-level="fast"]').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-level="normal"]').click();
  await page.locator('.settings-ready').click();
  assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.open && dialog.inert));
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  assert.deepEqual(errors, []);
  console.log('PASS settings: six layouts, level selection without rerender, focus, sound toggle, retained choice, smooth close');
} finally { await browser.close(); }
