// Player-colored round history, centered tray content, and ten-round completion.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function common(page) {
  return page.locator('#board').evaluate(board => {
    const right = [...board.querySelectorAll('[data-side="right"],[data-side="opponent"]')].map(el => el.dataset.symbol);
    return [...board.querySelectorAll('[data-side="left"]')].find(el => right.includes(el.dataset.symbol)).dataset.symbol;
  });
}

async function centered(page) {
  const result = await page.evaluate(() => {
    const center = el => { const r = el.getBoundingClientRect(); return r.x + r.width / 2; };
    const tray = document.querySelector('.game-progress');
    const cards = [...document.querySelectorAll('.hex-card')];
    return {
      caption: Math.abs(center(tray) - center(document.querySelector('.progress-caption'))),
      dots: Math.abs(center(tray) - center(document.querySelector('.progress-dots'))),
      symbols: cards.map(card => {
        const rect = card.getBoundingClientRect();
        const symbols = [...card.querySelectorAll('.symbol')].map(el => el.getBoundingClientRect());
        const average = symbols.reduce((sum, r) => sum + r.y + r.height / 2, 0) / symbols.length;
        return (average - rect.y) / rect.height;
      }),
    };
  });
  assert.ok(result.caption < 1 && result.dots < 1, 'caption and dots share the tray center');
  assert.ok(result.symbols.every(center => Math.abs(center - .52) < .035), 'symbols are centered on the hexagonal face');
}

try {
  const page = await browser.newPage({ viewport: { width: 1130, height: 621 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  await page.waitForSelector('[data-motion="ready"]');
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.progress-dot.is-filled').count(), 0);
  const history = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1];
  for (let turn = 0; turn < history.length; turn++) {
    assert.equal(await page.locator('#progress-caption').textContent(), `Tur ${turn + 1} / 10`);
    const id = await common(page);
    const side = history[turn] === 0 ? 'left' : 'right';
    const button = page.locator(`[data-side="${side}"][data-symbol="${id}"]`);
    await button.evaluate(el => { el.click(); el.click(); });
    assert.equal(await page.locator('.progress-dot.is-filled').count(), turn + 1, 'double input cannot add a second round');
    assert.deepEqual(await page.locator('.progress-marker[data-player]').evaluateAll(markers => markers.map(el => Number(el.dataset.player))), history.slice(0, turn + 1), 'opponent wins retain every earlier winner in order');
    assert.equal(await page.locator('.game-progress').getAttribute('aria-valuenow'), String(turn + 1));
    await centered(page);
    if (turn === 2) {
      await page.clock.runFor(1400);
      await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
      await page.screenshot({ path: 'test-results/progress-v24-desktop.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.clock.runFor(150);
      await centered(page);
      await page.screenshot({ path: 'test-results/progress-v24-mobile.png' });
      await page.setViewportSize({ width: 1130, height: 621 });
      await page.clock.runFor(150);
    } else await page.clock.runFor(1400);
  }
  assert.equal(await page.locator('.result-panel h1').textContent(), 'Dostluk kazandı!');
  assert.deepEqual(await page.locator('.result-score strong').allTextContents(), ['5', '5']);
  await page.locator('.result-replay').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  assert.equal(await page.locator('.progress-dot.is-filled').count(), 0);
  assert.equal(await page.locator('#progress-caption').textContent(), 'Tur 1 / 10');
  await page.locator('[data-action="leave"]').click();
  await page.locator('[data-action="confirm-home"]').click();
  await page.locator('[data-mode="solo"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  await page.clock.runFor(11000);
  assert.equal(await page.locator('.progress-marker[data-player="1"]').count(), 1, 'Kofen uses the opponent color');
  const id = await common(page);
  await page.locator(`[data-side="left"][data-symbol="${id}"]`).click();
  assert.deepEqual(await page.locator('.progress-marker[data-player]').evaluateAll(markers => markers.map(el => Number(el.dataset.player))), [1, 0]);
  assert.match(await page.locator('.game-progress').getAttribute('aria-valuetext'), /Sen 1, Kofen 1/);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS centered symbols and progress, chronological player colors in both modes, ten-round tie, replay reset, input lock, accessible scores.');
} finally {
  await browser.close();
}
