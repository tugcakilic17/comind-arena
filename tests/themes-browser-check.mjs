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
  const hiddenForTouchLayout = await page.evaluate(() => matchMedia('(max-width:900px) and (pointer:coarse),(max-width:700px),(max-height:500px) and (max-width:1000px)').matches);
  if (hiddenForTouchLayout) {
    assert.equal(await page.locator('.sea-pier-cards .surface-seaPierWide:visible, .sea-pier-cards .surface-seaPierCompact:visible').count(), 0, 'compact touch layouts hide the decorative pier');
    return;
  }
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
    await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'theme-test-player', name: 'Ada', avatar: 'rose' }, configured: true } }));
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
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'theme-test-player', name: 'Ada', avatar: 'rose' }, configured: true } }));
  await page.goto(url);
  await page.locator('[data-mode="solo"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await page.locator('[data-option="parrot"][data-value="komat"]').click();
  await page.keyboard.press('Escape');
  await page.locator('[data-mode="local"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  assert.equal(await page.locator('[data-option="theme"]').count(), 4, 'same-device mode offers all four themes');
  assert.equal(await page.locator('[data-option="parrot"], [data-level]').count(), 0, 'same-device setup keeps two human players');
  assert.equal(await page.locator('[data-option="theme"][data-value="kofen"]').getAttribute('aria-pressed'), 'true', 'local theme starts with forest independently of solo opponent');
  await page.screenshot({ path: 'test-results/themes/local-setup-desktop.png' });
  for (const [width, height] of [[320,480], [390,844], [844,390], [1366,768]]) {
    await page.setViewportSize({ width, height });
    assert.ok(await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      return document.documentElement.scrollWidth <= innerWidth && dialog.scrollWidth <= dialog.clientWidth + 1 && [...dialog.querySelectorAll('.theme-copy')].every(el => el.scrollWidth <= el.clientWidth + 1);
    }), `theme choices fit without horizontal overflow at ${width}x${height}`);
    if (width === 390) await page.screenshot({ path: 'test-results/themes/local-setup-mobile.png' });
  }
  for (const [theme, file] of Object.entries(themes)) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator(`[data-option="theme"][data-value="${theme}"]`).click();
    await page.locator('[data-option="symbolCount"][data-value="8"]').click();
    await page.reload();
    await page.locator('[data-mode="local"]').click();
    await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
    assert.equal(await page.locator(`[data-option="theme"][data-value="${theme}"]`).getAttribute('aria-pressed'), 'true', 'local theme survives reload');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('comind.preferences.v1')).setup.parrot), 'komat', 'local theme does not change solo opponent');
    await page.locator('.setup-start').click();
    await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
    assert.ok((await page.locator('#app > .forest-background').evaluate(el => getComputedStyle(el).backgroundImage)).includes(file), `${theme}: local game uses selected background`);
    assert.equal(await page.locator('#board .symbol:enabled').count(), 16, 'both human players can select all eight symbols');
    assert.ok(await page.locator('#board').evaluate((board, theme) => [...board.querySelectorAll('.game-symbol-art')].every(el => el.getAttribute('style').includes(`${theme}-symbols-atlas`)), theme), 'both cards use selected themed symbols');
    const common = await page.locator('#board').evaluate(board => {
      const cards = [...board.querySelectorAll('.hex-card')].map(card => [...card.querySelectorAll('.symbol')].map(el => el.dataset.symbol));
      return cards[0].filter(id => cards[1].includes(id));
    });
    assert.equal(common.length, 1, 'eight themed symbols retain exactly one common symbol');
    if (theme === 'koak') await verifyPier(page);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok((await page.locator('#app > .forest-background').evaluate(el => getComputedStyle(el).backgroundImage)).includes(theme === 'kofen' ? file : file.replace('.webp', '-portrait.webp')), 'local game uses mobile theme composition');
    if (theme === 'koak') await verifyPier(page);
    await page.locator(`[data-owner="1"] [data-symbol="${common[0]}"]`).click();
    await page.waitForFunction(() => document.querySelector('#score-right').textContent === '1');
    await page.locator('[data-action="leave"]').click();
    await page.locator('dialog[open]:not(.is-preparing)').waitFor();
    await page.locator('[data-action="confirm-home"]').click();
    await page.locator('[data-mode="local"]').click();
    await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
    console.log(`PASS local ${theme}: persisted selection, themed pair, desktop/mobile background, human scoring`);
  }
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('PASS same-device themes; no runtime errors');
} finally {
  await browser.close();
}
