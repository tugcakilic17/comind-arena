// Resize the same live screen, including dialogs and an active Phaser game.
// COMIND_TEST_URL can point at the production preview under /comind-arena/.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const sizes = [[320,480],[320,568],[360,480],[360,640],[390,844],[412,915],
  [540,720],[600,900],[601,900],[768,1024],[820,1180],[1024,768],[1280,720],
  [1366,768],[1440,900],[1920,1080],[2560,1440],[480,320],[568,320],[667,375],
  [844,390],[900,500],[1024,600],[600,400]];
await mkdir('test-results/responsive', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const failures = [], errors = [], measurements = [];
let checks = 0;
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: null, configured: false } }));
  await page.route('**/api/arena/leaderboard**', route => route.fulfill({ json: { players: [], total: 0, self: null, start: 0 } }));
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(process.env.COMIND_TEST_URL || 'http://127.0.0.1:5174/');
  async function inspect(screen, selectors) {
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(100);
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('dialog[open]')?.scrollTo(0, 0); });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(({ selectors, screen }) => {
        const problems = [];
        if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('horizontal page overflow');
        const modal = document.querySelector('dialog[open]');
        if (['help','settings'].includes(screen) && modal) {
          if (modal.scrollHeight > modal.clientHeight + 1) problems.push(`${screen} needs vertical scrolling`);
          if (modal.scrollWidth > modal.clientWidth + 1) problems.push(`${screen} needs horizontal scrolling`);
          const content=modal.querySelector(screen === 'help' ? '.help-content' : '.settings-content').getBoundingClientRect(), frame=modal.getBoundingClientRect();
          if(content.top < frame.top || content.bottom > frame.bottom + 1) problems.push(`${screen} content outside its frame`);
        }
        for (const el of document.querySelectorAll(selectors)) {
          if (!el.checkVisibility() || el.closest('[hidden],.sr-only')) continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const name = el.className.baseVal ?? el.className;
          // A scrolling dialog may contain content below its visible viewport.
          const scroller = modal && ['auto', 'scroll'].includes(getComputedStyle(modal).overflowY) ? modal : null;
          const pageScrolls = (screen.startsWith('result') || screen === 'game') && document.documentElement.scrollHeight > innerHeight;
          const vertical = scroller && scroller.contains(el) ? false : r.top < -1 || (!pageScrolls && r.bottom > innerHeight + 1);
          if (r.left < -1 || r.right > innerWidth + 1 || vertical) problems.push(`${name}: outside viewport (${[r.x,r.y,r.width,r.height].map(Math.round)})`);
          if (el.matches('button,a') && !el.disabled && r.top >= 0 && r.bottom <= innerHeight) {
            const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            if (target !== el && !el.contains(target)) problems.push(`${name}: covered control (${target?.tagName}.${target?.className})`);
          }
          const text = el.matches('.account-button.is-signed-in') ? el.querySelector('.account-header-name') : el;
          if (!el.matches('.board-title') && el.matches('h1,h2,p,button:not(.close-modal)') && text.scrollWidth > text.clientWidth + 2) problems.push(`${name}: clipped text`);
        }
        for (const control of document.querySelectorAll(modal ? 'dialog[open] button:not(:disabled)' : screen.startsWith('result') ? '.result-actions button' : '.screen-game .symbol:not(:disabled)')) {
          if (!control.checkVisibility()) continue;
          control.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          const r = control.getBoundingClientRect();
          const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          if (target !== control && !control.contains(target)) problems.push(`${control.className}: unreachable control`);
        }
        if (screen === 'game') {
          for (const row of document.querySelectorAll('.player-score')) {
            const parent = row.getBoundingClientRect();
            for (const item of row.children) {
              const r = item.getBoundingClientRect();
              if (r.left < parent.left - 1 || r.right > parent.right + 1) problems.push('score labels overlap timer');
            }
          }
        }
        window.scrollTo(0, 0);
        modal?.scrollTo(0, 0);
        return { problems, pageHeight: document.documentElement.scrollHeight, screen };
      }, { selectors, screen });
      checks++;
      measurements.push({ screen, width, height, ...result });
      if (result.problems.length) failures.push({ screen, width, height, problems: result.problems });
      if ([[320,480],[360,640],[390,844],[480,320],[601,900],[844,390],[1366,768]].some(([w,h]) => w === width && h === height)) {
        await page.screenshot({ path: `test-results/responsive/${screen}-${width}x${height}.png`, fullPage: screen.startsWith('result') });
      }
    }
    await writeFile('test-results/responsive/report.json', JSON.stringify({ checks, failures, errors, measurements }, null, 2));
  }
  const dialogSelectors = 'dialog[open],dialog[open] h2,dialog[open] h3,dialog[open] p,dialog[open] button,dialog[open] .account-content,dialog[open] .leave-content';
  await inspect('home', '.site-header a,.site-header button,.illustrated-mode,.mode-art,.wooden-menu-button');
  for (const kind of ['account', 'help', 'settings', 'leaderboard']) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator(kind === 'invite' ? '[data-mode="online"]' : `[data-action="${kind}"]`).click();
    await page.locator('dialog.modal[open]:not(.is-preparing)').waitFor();
    await inspect(kind, dialogSelectors);
    if (kind === 'account') {
      await page.locator('[data-action="google-signin"]').click();
      await inspect('account-notice', dialogSelectors);
    }
    await page.keyboard.press('Escape');
  }
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'responsive-player', name: 'Ada', avatar: 'white', publicCode: 'ABCD1234' }, configured: true } }));
  await page.route('**/card-lavender-leafy-v21.webp', route => route.abort());
  await page.reload();
  await page.locator('.illustrated-mode[data-mode="solo"]').click();
  await page.locator('.setup-start').click();
  await page.locator('.loading-dialog.is-error[open]').waitFor();
  await inspect('loading-error', 'dialog[open],dialog[open] h2,dialog[open] p,dialog[open] button');
  await page.unroute('**/card-lavender-leafy-v21.webp');
  await page.locator('[data-loading="cancel"]').click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('.illustrated-mode[data-mode="solo"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await inspect('setup-solo', dialogSelectors);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('.illustrated-mode[data-mode="local"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await inspect('setup', dialogSelectors);
  await page.locator('[data-option="winTarget"][data-value="5"]').click();
  await page.locator('.setup-start').click();
  await page.waitForSelector('.screen-game:not(.is-preparing)');
  await inspect('game', '.game-toolbar button,.scoreboard,.player-score strong,.player-score>b,.timer-block,.avatar-slot,.board-title,.hex-art,.card-owner,.symbol,.game-progress');
  for (const kind of ['pause', 'leave']) {
    await page.locator(`[data-action="${kind}"]`).click();
    await page.locator('dialog.modal[open]:not(.is-preparing)').waitFor();
    await inspect(kind, dialogSelectors);
    await page.keyboard.press('Escape');
  }
  async function answer(side) {
    for(let step=0;step<20 && await page.locator('#board[aria-busy="true"],#board .symbol.matched').count();step++) await page.clock.runFor(200);
    const id=await page.locator('#board').evaluate(board=>{
      const right=[...board.querySelectorAll('[data-side="right"]')].map(el=>el.dataset.symbol);
      return [...board.querySelectorAll('[data-side="left"]')].find(el=>right.includes(el.dataset.symbol)).dataset.symbol;
    });
    await page.locator(`[data-side="${side}"][data-symbol="${id}"]`).click();
    await page.clock.runFor(1600);
  }
  await page.setViewportSize({width:1366,height:768});
  for(let point=0;point<5;point++) await answer('right');
  await page.waitForSelector('.screen-result:not([inert])');
  await inspect('result-opponent', '.site-header a,.site-header button,.result-mascots,.result-content h1,.result-content p,.result-player,.result-stats,.result-actions button');
  await page.setViewportSize({width:1366,height:768});
  await page.locator('.result-replay').click();
  await page.waitForSelector('.screen-game:not(.is-preparing)');
  for(let point=0;point<5;point++) await answer('left');
  await page.waitForSelector('.screen-result:not([inert])');
  await inspect('result-winner', '.site-header a,.site-header button,.result-mascots,.result-content h1,.result-content p,.result-player,.result-stats,.result-actions button');
  await page.locator('.result-replay').click();
  await page.waitForSelector('.screen-game:not(.is-preparing)');
  for (const [index, [width, height]] of [[320,568],[390,844],[844,390],[1440,900]].entries()) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(200);
    const shared = await page.locator('#board').evaluate(board => {
      const right = [...board.querySelectorAll('[data-side="right"]')].map(el => el.dataset.symbol);
      return [...board.querySelectorAll('[data-side="left"]')].find(el => right.includes(el.dataset.symbol)).dataset.symbol;
    });
    await page.locator(`[data-side="left"][data-symbol="${shared}"]`).click();
    await page.clock.runFor(1400);
    assert.equal(await page.locator('#score-left').textContent(), String(index + 1), `Correct answers after resize to ${width}x${height}`);
  }
  await writeFile('test-results/responsive/report.json', JSON.stringify({ checks, failures, errors, measurements }, null, 2));
  console.log(`${checks} responsive checks; ${failures.length} layouts with issues; ${errors.length} runtime errors.`);
  for (const item of failures) console.log(`${item.screen} ${item.width}x${item.height}: ${item.problems.join('; ')}`);
  assert.deepEqual(errors, []);
  assert.equal(failures.length, 0, 'See test-results/responsive/report.json');
} finally { await browser.close(); }
