// Optional browser QA. Set COMIND_PLAYWRIGHT_DIR to an installed playwright package directory.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
await mkdir('test-results', { recursive: true });
let browser;
try { browser = await chromium.launch({ channel: 'msedge', headless: true }); }
catch { browser = await chromium.launch({ headless: true }); }
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const check = (name, condition) => { assert.ok(condition, name); console.log(`PASS ${name}`); };

async function match(player = 'left') {
  const symbol = await page.locator('#board').evaluate(board => {
    const left = [...board.querySelectorAll('[data-side="left"]')].map(item => item.dataset.symbol);
    const right = [...board.querySelectorAll('[data-side="right"], [data-side="opponent"]')].map(item => item.dataset.symbol);
    return left.find(id => right.includes(id));
  });
  await page.locator(`#board [data-side="${player}"][data-symbol="${symbol}"]`).click();
}

try {
  await page.goto('http://127.0.0.1:5174/');
  await page.evaluate(() => document.fonts.ready);
  check('home presents three illustrated modes and three wooden menu buttons', await page.locator('.illustrated-mode').count() === 3 && await page.locator('.wooden-menu-button').count() === 3);
  check('home has no collection menu', await page.getByRole('button', { name: /Koleksiyon/ }).count() === 0);
  check('home has no footer sound control', await page.locator('.site-footer .sound-button').count() === 0);
  check('old marketing headline removed', !await page.getByText('Küçük bir eşleşme.').count());
  check('original forest and all generated home assets load', await page.evaluate(async () => {
    const images = await Promise.all(['/assets/forest-clearing-v1.webp', ...[...document.querySelectorAll('.illustrated-home img,.site-header img')].map(image => image.src)].map(src => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth > 100); image.onerror = () => resolve(false); image.src = src; })));
    return images.every(Boolean);
  }));
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Nasıl oynanır?' }).click();
  check('help opens', await page.locator('dialog.modal').evaluate(dialog => dialog.open));
  await page.keyboard.press('Escape');
  check('Escape closes modal', !(await page.locator('dialog.modal').evaluate(dialog => dialog.open)));
  await page.getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await page.getByRole('button', { name: 'Orta', exact: true }).click();
  check('settings changes difficulty without leaving the dialog', await page.getByRole('button', { name: 'Orta', exact: true }).getAttribute('aria-pressed') === 'true' && await page.locator('dialog.modal').evaluate(dialog => dialog.open));
  await page.locator('dialog .sound-button').click();
  check('sound control works inside settings', await page.locator('dialog .sound-button[aria-pressed="true"]').count() === 1);
  await page.locator('dialog .sound-button').click();
  await page.getByRole('button', { name: 'Kolay', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.locator('[data-mode="online"]').click();
  check('invite explains upcoming online mode', await page.locator('dialog.modal').evaluate(dialog => dialog.open) && await page.getByText('Farklı cihazlardan davet bağlantısıyla oynama yakında burada olacak.').count() === 1);
  await page.keyboard.press('Escape');
  await page.clock.install();
  const savedScoresBefore = await page.evaluate(() => localStorage.getItem('comind.scores.v1'));
  await page.locator('[data-mode="solo"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  check('gameplay contains no site navigation, footer or home panel', await page.locator('.site-header,.site-footer,.welcome-panel').count() === 0);
  check('gameplay still contains both interactive cards', await page.locator('#board .hex-card').count() === 2);
  check('game cards use twelve raster symbols and raster controls', await page.locator('#board .game-symbol-art').count() === 12 && await page.locator('#board svg,.game-toolbar svg').count() === 0);
  await page.locator('.game-toolbar img.game-control-asset').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  check('timer omits the seconds suffix and controls use separate high resolution images', await page.locator('.timer-block').textContent().then(text => !text.includes('sn')) && await page.locator('.game-toolbar img.game-control-asset').evaluateAll(images => images.length === 4 && images.every(image => image.complete && image.naturalWidth >= 1024)));
  check('player and Kofen have distinct visible parrot avatars', await page.locator('.player-parrot').isVisible() && await page.locator('.kofen-avatar').isVisible() && await page.locator('.player-parrot').getAttribute('src') !== await page.locator('.kofen-avatar').getAttribute('src'));
  check('ten progress dots start empty', await page.locator('.progress-dot').count() === 10 && await page.locator('.progress-dot.is-filled').count() === 0);
  await page.locator('.game-avatar,.progress-dot,.game-surface img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  check('progress uses separate HD images and complete panel surfaces', await page.locator('.progress-dot').evaluateAll(images => images.every(image => image.tagName === 'IMG' && image.naturalWidth >= 1024)) && await page.locator('.play-panel').evaluate(panel => getComputedStyle(panel).borderImageSource === 'none'));
  const wrong = await page.locator('#board').evaluate(board => {
    const left = [...board.querySelectorAll('[data-side="left"]')].map(item => item.dataset.symbol);
    const right = [...board.querySelectorAll('[data-side="opponent"]')].map(item => item.dataset.symbol);
    return left.find(id => !right.includes(id));
  });
  await page.locator(`[data-side="left"][data-symbol="${wrong}"]`).click();
  check('incorrect choice does not score', await page.locator('#score-left').textContent() === '0');
  check('incorrect choice does not fill a round marker', await page.locator('.progress-dot.is-filled').count() === 0);
  await page.locator('[data-action="pause"]').first().click();
  const before = await page.locator('#timer').textContent();
  await page.clock.runFor(3500);
  check('pause freezes timer', await page.locator('#timer').textContent() === before);
  await page.locator('.pause-continue').click();
  await page.locator('[data-action="leave"]').click();
  const beforeModal = await page.locator('#timer').textContent();
  await page.clock.runFor(2000);
  check('modal also pauses game', await page.locator('#timer').textContent() === beforeModal);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/game-desktop.png', fullPage: true });
  for (let tick = 0; tick < 120 && await page.locator('#score-right').textContent() === '0'; tick++) await page.clock.runFor(100);
  check('computer scores on its own', await page.locator('#score-right').textContent() === '1');
  check('only Kofen celebrates its own match', await page.locator('.avatar-slot[data-player="1"].is-cheering').count() === 1 && await page.locator('.avatar-slot[data-player="0"].is-cheering').count() === 0);
  await page.screenshot({ path: 'test-results/kofen-celebration.png' });
  check('a scored match fills one progress dot', await page.locator('.progress-dot.is-filled').count() === 1 && await page.locator('.game-progress').getAttribute('aria-valuenow') === '1');
  await page.clock.runFor(1400);
  check('celebration resets with the next pair', await page.locator('.avatar-slot.is-cheering').count() === 0);
  for (let round = 0; round < 9; round++) {
    await match();
    check('only the scoring player raises its wings', await page.locator('.avatar-slot[data-player="0"].is-cheering').count() === 1 && await page.locator('.avatar-slot[data-player="1"].is-cheering').count() === 0);
    if (round === 0) await page.screenshot({ path: 'test-results/player-celebration.png' });
    await page.clock.runFor(1400);
  }
  check('ten total rounds finish game with the higher score winning', await page.locator('.result-panel h1').textContent() === 'Sen kazandın!' && await page.locator('.result-score strong').allTextContents().then(scores => scores[0] === '9' && scores[1] === '1'));
  check('casual match does not add a leaderboard result', await page.evaluate(() => localStorage.getItem('comind.scores.v1')) === savedScoresBefore && await page.locator('.save-note').count() === 0);
  await page.screenshot({ path: 'test-results/result-desktop.png', fullPage: true });
  await page.locator('.result-panel [data-action="home"]').click();
  await page.getByRole('button', { name: 'Liderlik Tablosu', exact: true }).click();
  check('leaderboard shows nine clearly labeled demo players', await page.locator('.ranking-row').count() === 9 && await page.locator('.ranking-demo').isVisible());
  await page.keyboard.press('Escape');
  await page.locator('[data-mode="local"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  await match('right');
  check('second player scores on own card', await page.locator('#score-right').textContent() === '1');
  check('second local player celebrates its own match', await page.locator('.avatar-slot[data-player="1"].is-cheering').count() === 1);
  await page.clock.runFor(1400);
  await page.clock.runFor(90000);
  check('time limit finishes local game', await page.locator('.result-panel h1').textContent() === '2. Oyuncu kazandı!');
  await page.locator('.result-panel [data-action="home"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  check('mobile home has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('[data-mode="solo"]').click();await page.waitForSelector('.screen-game:not(.is-preparing)');
  await page.screenshot({ path: 'test-results/game-mobile.png', fullPage: true });
  check('mobile game has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('mobile keeps both parrot avatars visible', await page.locator('.player-parrot').isVisible() && await page.locator('.kofen-avatar').isVisible());
  check('mobile gameplay fits the viewport', await page.evaluate(() => {
    const board = document.querySelector('#board').getBoundingClientRect();
    return [...document.querySelectorAll('#board .hex-card')].every(card => { const box = card.getBoundingClientRect(); return box.top >= board.top && box.bottom <= board.bottom + 1 && box.bottom < innerHeight; });
  }));
  await page.setViewportSize({ width: 768, height: 1024 });
  check('tablet game has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('[data-action="leave"]').click();
  await page.locator('[data-action="confirm-home"]').click();
  await page.setViewportSize({ width: 360, height: 800 });
  check('small phone home has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('no browser errors', errors.length === 0);
  console.log('BROWSER QA COMPLETE');
} finally { await browser.close(); }
