import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel:'msedge', headless:true });
try {
  const page = await browser.newPage({ viewport:{width:1148,height:636}, reducedMotion:'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/');
  for (const trigger of ['close-button','escape','backdrop']) {
    await page.locator('[data-action="account"]').click();
    await page.locator('dialog.modal').evaluate(dialog => Promise.allSettled(dialog.getAnimations().map(animation => animation.finished)));
    if (trigger === 'close-button') await page.locator('.close-modal').click();
    else if (trigger === 'escape') await page.keyboard.press('Escape');
    else await page.mouse.click(10,10);
    assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.open && dialog.inert && dialog.classList.contains('is-closing')), 'dialog remains modal during exit');
    assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.getAnimations().some(animation => animation.animationName === 'account-dialog-exit')));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog').open);
    assert.equal(await page.locator('dialog.modal').evaluate(dialog => dialog.inert || dialog.classList.contains('is-closing')), false);
    assert.equal(await page.locator('[data-action="account"]').evaluate(button => button === document.activeElement), true);
    console.log(`PASS smooth ${trigger} exit, repeated dismissal and focus restoration`);
  }
  await page.evaluate(() => {
    document.querySelector('[data-action="account"]').click();
    document.querySelector('dialog').dispatchEvent(new Event('cancel', {cancelable:true}));
  });
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.locator('[data-action="account"]').click();
  await page.locator('.close-modal').click();
  assert.equal(await page.locator('dialog.modal').evaluate(dialog => dialog.open), false);
  assert.deepEqual(errors, []);
  console.log('PASS immediate reopening/closing and reduced-motion dismissal');
} finally { await browser.close(); }
