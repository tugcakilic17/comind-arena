import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1148, height: 636 }, reducedMotion: 'reduce' });
  const errors = [];
  const externalRequests = [];
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: null, configured: false } }));
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5174/')) externalRequests.push(request.url()); });
  await page.goto('http://127.0.0.1:5174/');
  const originalBrand = await page.locator('.home-brand img').getAttribute('src');
  const originalBackground = await page.locator('.forest-background').evaluate(el => getComputedStyle(el).backgroundImage);
  await page.locator('[data-action="account"]').click();
  await page.locator('dialog img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  assert.equal(await page.locator('#modal-title').textContent(), 'Hoş geldin!');
  assert.equal(await page.locator('.account-guest').count(), 0);
  assert.equal(await page.locator('.account-google').evaluate(el => el === document.activeElement), true);
  assert.ok(await page.locator('dialog.modal').evaluate(el => getComputedStyle(el, '::backdrop').backdropFilter.includes('blur(6px)')));

  for (const [width, height] of [[1148,636],[1920,869],[1366,768],[390,844],[360,640],[844,390]]) {
    await page.setViewportSize({ width, height });
    assert.ok(await page.locator('dialog.modal').evaluate(dialog => {
      const selectors = ['.account-mascot','.account-content','.close-modal','.account-google','.account-note'];
      return selectors.every(selector => {
        const rect = dialog.querySelector(selector).getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
      }) && document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight;
    }), `account dialog fits ${width}x${height}`);
    await page.screenshot({ path: `test-results/account-v34-${width}-${height}.png` });
  }
  await page.locator('[data-action="google-signin"]').click();
  await page.locator('.account-status').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.account-status').isVisible(), true);
  assert.ok(await page.locator('.account-status').textContent().then(text => text.includes('ulaşılamıyor')));
  assert.ok(await page.locator('.account-content').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'provider availability notice fits short screens');
  await page.screenshot({ path: 'test-results/account-v34-google-status-landscape.png' });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog.modal').evaluate(el => el.open), false);
  assert.equal(await page.locator('[data-action="account"]').evaluate(el => el === document.activeElement), true);

  await page.setViewportSize({ width:1148, height:636 });
  await page.locator('[data-action="account"]').click();
  assert.equal(await page.locator('.account-status').isVisible(), true, 'a service failure remains explained when reopening');
  for (let index=0; index<5; index++) {
    await page.keyboard.press('Tab');
    assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.contains(document.activeElement)), 'keyboard focus stays inside dialog');
  }
  await page.locator('.close-modal').click();
  assert.equal(await page.locator('dialog.modal').evaluate(el => el.open), false);
  await page.locator('[data-action="account"]').click();
  await page.mouse.click(10,10);
  assert.equal(await page.locator('dialog.modal').evaluate(el => el.open), false, 'backdrop dismisses dialog');
  assert.equal(await page.locator('.home-brand img').getAttribute('src'), originalBrand);
  assert.equal(await page.locator('.forest-background').evaluate(el => getComputedStyle(el).backgroundImage), originalBackground);
  assert.equal(await page.locator('.illustrated-mode').count(), 3);
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, [], 'an unavailable backend never redirects to Google');
  console.log('PASS account layout, backdrop blur, provider notice, keyboard focus, all dismissal controls and unchanged home');
} finally {
  await browser.close();
}
