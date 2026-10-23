import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const url = process.env.COMIND_TEST_URL || 'http://127.0.0.1:5174/';
const themes = {
  koak: 'sea-calm-v1.webp',
  kuik: 'beach-calm-v1.webp',
  komat: 'numbers-city-calm-v1.webp',
  kofen: 'forest-calm-warm-v23.webp',
};
await mkdir('test-results/themes', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
async function verifyPier(page) {
  const placements = await page.locator('.sea-pier-cards').evaluate(cards => [...cards.querySelectorAll('.player-card')].map(player => {
    const hex = player.querySelector('.hex-card');
    const card = hex.getBoundingClientRect();
    const compact = innerWidth <= 900 && innerWidth < innerHeight;
    const stage = (compact ? player.querySelector('.surface-seaPierCompact') : cards.querySelector('.surface-seaPierWide')).getBoundingClientRect();
    const shadow = getComputedStyle(hex, '::after');
    const paintedBase = card.bottom - card.height * .044;
    return {
      contact: (paintedBase - stage.top) / stage.height,
      shadowOffset: Math.abs(card.bottom - parseFloat(shadow.bottom) - parseFloat(shadow.height) / 2 - paintedBase),
      visible: stage.width > 0 && stage.height > 0,
    };
  }));
  for (const placement of placements) {
    assert.ok(placement.visible && placement.contact > .34 && placement.contact < .42, 'painted card base rests on the pier deck across viewport changes');
    assert.ok(placement.shadowOffset < 1, 'contact shadow stays at the painted base rather than the transparent image margin');
  }
}
try {
  for (const [parrot, file] of Object.entries(themes)) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/auth/me', route => route.fulfill({ json: { user: null, configured: false } }));
    await page.clock.install();
    await page.goto(url);
    const background = () => page.locator('#app > .forest-background').evaluate(element => {
      const style = getComputedStyle(element);
      return { image: style.backgroundImage, size: style.backgroundSize, position: style.backgroundPosition, filter: style.filter, overlay: getComputedStyle(element, '::after').backgroundColor };
    });
    assert.ok((await background()).image.includes('/assets/forest-clearing-v1.webp'), 'home keeps its existing forest');
    await page.locator('[data-mode="solo"]').click();
    await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
    await page.locator(`[data-option="parrot"][data-value="${parrot}"]`).click();
    await page.locator('[data-option="winTarget"][data-value="5"]').click();
    await page.locator('[data-option="symbolCount"][data-value="3"]').click();
    await page.locator('[data-option="rule"][data-value="empty"]').click();
    await page.locator(`[data-level="${parrot === 'kuik' ? 'fast' : 'easy'}"]`).click();
    await page.locator('.setup-start').click();
    await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
    const gameBackground = await background();
    assert.ok(gameBackground.image.includes(`/assets/game-ui/${file}`), `${parrot} has the selected game background`);
    assert.equal(await page.locator('.sea-pier-cards').count(), parrot === 'koak' ? 1 : 0, 'only Koak uses the seaside pier');
    if (parrot === 'koak') await verifyPier(page);
    await page.evaluate(async () => {
      const url = getComputedStyle(document.querySelector('#app > .forest-background')).backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1];
      const image = new Image(); image.src = url; await image.decode();
    });
    await page.screenshot({ path: `test-results/themes/${parrot}-game-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(100);
    const mobileGameBackground = await background();
    if (parrot === 'koak') await verifyPier(page);
    assert.ok(mobileGameBackground.image.includes(parrot === 'kofen' ? file : file.replace('.webp', '-portrait.webp')), `${parrot} uses its portrait composition on mobile`);
    await page.screenshot({ path: `test-results/themes/${parrot}-game-mobile.png` });
    for (const [width, height] of [[768, 1024], [360, 640], [844, 390], [1920, 1080], [320, 480]]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(100);
      const responsiveBackground = await background();
      if (parrot === 'koak') await verifyPier(page);
      assert.equal(responsiveBackground.size, 'cover', 'background fills wide tablets and short phones without exposed side strips');
      assert.ok(responsiveBackground.image.includes(width < height && parrot !== 'kofen' ? file.replace('.webp', '-portrait.webp') : file), 'orientation chooses the matching composition');
      if (width === 768) await page.screenshot({ path: `test-results/themes/${parrot}-game-tablet.png` });
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.clock.runFor(100);
    if (parrot === 'kuik') {
      for (let step = 0; step < 15 && await page.locator('.screen-game').count(); step++) await page.clock.runFor(10000);
    } else {
      for (let point = 0; point < 5; point++) {
        for (let step = 0; step < 20 && await page.locator('#board[aria-busy="true"], #board .symbol.matched').count(); step++) await page.clock.runFor(200);
        const id = await page.locator('#board').evaluate(board => {
          const right = [...board.querySelectorAll('[data-side="right"]')].map(element => element.dataset.symbol);
          return [...board.querySelectorAll('[data-side="left"]')].find(element => right.includes(element.dataset.symbol)).dataset.symbol;
        });
        await page.locator(`[data-side="left"][data-symbol="${id}"]`).click();
        await page.clock.runFor(1600);
      }
    }
    await page.locator('.screen-result:not([inert])').waitFor();
    assert.equal(await page.locator('.sea-pier-cards').count(), 0, 'pier belongs to the playable board');
    assert.deepEqual(await background(), gameBackground, `${parrot} keeps the exact background through ${parrot === 'kuik' ? 'defeat' : 'victory'}`);
    await page.screenshot({ path: `test-results/themes/${parrot}-result-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.runFor(100);
    assert.deepEqual(await background(), mobileGameBackground, `${parrot} also keeps its background on mobile results`);
    await page.screenshot({ path: `test-results/themes/${parrot}-result-mobile.png` });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.clock.runFor(100);
    if (parrot === 'koak') {
      await page.locator('.result-replay').click();
      await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
      assert.deepEqual(await background(), gameBackground, 'replay keeps the selected sea theme');
      await verifyPier(page);
      await page.locator('[data-action="leave"]').click();
      await page.locator('dialog[open]:not(.is-preparing)').waitFor();
      await page.locator('[data-action="confirm-home"]').click();
      await page.locator('.screen-home').waitFor();
    } else {
      await page.locator('.result-home').click();
      await page.locator('.screen-home').waitFor();
    }
    assert.ok((await background()).image.includes('/assets/forest-clearing-v1.webp'), 'returning home restores the original home theme');
    console.log(`PASS ${parrot}: desktop/mobile game and result continuity, return home${parrot === 'koak' ? ', replay' : ''}`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: null, configured: false } }));
  await page.goto(url);
  await page.locator('[data-mode="solo"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await page.locator('[data-option="parrot"][data-value="komat"]').click();
  await page.keyboard.press('Escape');
  await page.locator('[data-mode="local"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await page.locator('.setup-start').click();
  await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
  assert.ok((await page.locator('#app > .forest-background').evaluate(element => getComputedStyle(element).backgroundImage)).includes('/forest-calm-warm-v23.webp'), 'same-device mode keeps forest despite saved solo opponent');
  assert.equal(await page.locator('.sea-pier-cards').count(), 0, 'same-device mode keeps its existing stage');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('PASS same-device forest fallback; no runtime errors');
} finally {
  await browser.close();
}
