import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { getSymbolSet } from '../src/symbol-sets.js';

const url = process.env.COMIND_TEST_URL || 'http://127.0.0.1:5174/';
const set = getSymbolSet('koak');
await mkdir('test-results/koak-symbols', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
async function start(page, { count = 8, parrot = 'koak', mode = 'solo' } = {}) {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: null, configured: false } }));
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(url);
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  if (mode === 'solo') {
    await page.locator(`[data-option="parrot"][data-value="${parrot}"]`).click();
    await page.locator('[data-level="easy"]').click();
  }
  await page.locator(`[data-option="symbolCount"][data-value="${count}"]`).click();
  await page.locator('[data-option="winTarget"][data-value="5"]').click();
  await page.locator('[data-option="rule"][data-value="empty"]').click();
  await page.locator('.setup-start').click();
  await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
}
async function verifyPair(page, count, parrot = 'koak') {
  const set = getSymbolSet(parrot);
  const pair = await page.locator('#board .player-card').evaluateAll(cards => cards.map(card => [...card.querySelectorAll('.symbol')].map(button => Number(button.dataset.symbol))));
  assert.equal(pair[0].filter(id => pair[1].includes(id)).length, 1);
  for (const card of pair) {
    assert.equal(card.length, count);
    assert.equal(new Set(card).size, count);
    assert.ok(card.every(id => Number.isInteger(id) && id >= 0 && id < 15));
  }
  const buttons = await page.locator('#board .symbol').evaluateAll(elements => elements.map(element => ({ id: Number(element.dataset.symbol), label: element.getAttribute('aria-label'), atlas: getComputedStyle(element.querySelector('.game-symbol-art')).backgroundImage })));
  assert.ok(buttons.every(button => button.atlas.includes(`/${set.file}`) && button.label.startsWith(set.names[button.id])));
  return pair[0].find(id => pair[1].includes(id));
}
async function settleBackground(page) {
  await page.locator('#app>.forest-background').evaluate(async element => {
    const image = new Image();
    image.src = getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1];
    await image.decode();
  });
  await page.clock.runFor(100);
}
try {
  for (const count of [8, 3]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
    await start(page, { count });
    assert.equal(await page.locator('.play-panel').getAttribute('data-symbol-set'), 'koak');
    assert.equal(await page.locator('.play-panel').getAttribute('data-motion'), 'ready');
    await verifyPair(page, count);
    await settleBackground(page);
    await page.screenshot({ path: `test-results/koak-symbols/${count}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(100);
    await settleBackground(page);
    await page.screenshot({ path: `test-results/koak-symbols/${count}-mobile.png` });
    const common = await verifyPair(page, count);
    const wrong = await page.locator(`[data-side="left"]:not([data-symbol="${common}"])`).first();
    await wrong.click();
    assert.equal(await page.locator('#score-left').textContent(), '0');
    await page.clock.runFor(400);
    for (let point = 0; point < 5; point++) {
      const id = await verifyPair(page, count);
      await page.locator(`[data-side="left"][data-symbol="${id}"]`).click();
      assert.equal(await page.locator('#score-left').textContent(), String(point + 1));
      assert.equal(await page.locator('#match-feedback').getAttribute('class'), 'sr-only');
      await page.clock.runFor(1600);
    }
    await page.locator('.screen-result:not([inert])').waitFor();
    assert.equal(await page.locator('#result-title').textContent(), 'Sen kazandın!');
    await page.locator('.result-replay').click();
    await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
    assert.equal(await page.locator('.play-panel').getAttribute('data-symbol-set'), 'koak');
    await verifyPair(page, count);
    console.log(`PASS ${count} symbols: themed native/Phaser rendering, mobile, wrong choice, scoring, victory and replay`);
    await page.close();
  }
  const fallback = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  await fallback.route('**/spark-hd-v16.webp', route => route.abort());
  await start(fallback);
  await fallback.locator('.play-panel[data-motion="fallback"]').waitFor();
  const id = await verifyPair(fallback, 8);
  await fallback.screenshot({ path: 'test-results/koak-symbols/fallback.png' });
  await fallback.locator(`[data-side="left"][data-symbol="${id}"]`).click();
  assert.equal(await fallback.locator('#score-left').textContent(), '1');
  await fallback.close();
  console.log('PASS native fallback retains the new atlas and scoring');
  for (const parrot of ['kofen', 'komat', 'kuik']) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
    await start(page, { parrot });
    assert.equal(await page.locator('.play-panel').getAttribute('data-symbol-set'), parrot);
    assert.equal(await page.locator('.play-panel').getAttribute('data-motion'), 'ready');
    await verifyPair(page, 8, parrot);
    assert.ok((await page.locator('#board .game-symbol-art').first().evaluate(element => getComputedStyle(element).backgroundImage)).includes(`/${getSymbolSet(parrot).file}`));
    await settleBackground(page);
    await page.screenshot({ path: `test-results/koak-symbols/${parrot}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(100);
    await settleBackground(page);
    await page.screenshot({ path: `test-results/koak-symbols/${parrot}-mobile.png` });
    const common = await verifyPair(page, 8, parrot);
    await page.locator(`[data-side="left"][data-symbol="${common}"]`).click();
    assert.equal(await page.locator('#score-left').textContent(), '1');
    await page.close();
  }
  for (const mode of ['local']) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
    await start(page, { mode, parrot: 'kofen' });
    assert.equal(await page.locator('.play-panel').getAttribute('data-symbol-set'), 'classic');
    assert.ok((await page.locator('#board .game-symbol-art').first().evaluate(element => getComputedStyle(element).backgroundImage)).includes('/symbols-atlas-v14.webp'));
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS all solo opponents use their own fifteen-symbol theme; same-device games retain the classic set; no runtime errors');
} finally {
  await browser.close();
}
