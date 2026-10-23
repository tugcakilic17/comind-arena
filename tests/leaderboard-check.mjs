import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const errors = [];
  const players = Array.from({length:30},(_,index)=>({user_id:`test-${index}`,name:`Oyuncu ${index+1}`,rank:index+1,score:3000-index*10,isSelf:index===14}));
  await page.route('**/api/arena/leaderboard?*',route=>{
    const url=new URL(route.request().url());
    const start=Math.max(0,Math.min(21,url.searchParams.get('center')==='self'?10:Number(url.searchParams.get('start')||0)));
    return route.fulfill({json:{start,total:30,self:players[14],players:players.slice(start,start+9)}});
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('[data-action="leaderboard"]').click();
  await page.locator('dialog.modal:not(.is-preparing)').waitFor();
  const ranks = () => page.locator('.ranking-row').evaluateAll(rows => rows.map(row => Number(row.dataset.rank)));
  await page.locator('.ranking-row[data-rank="15"]').waitFor();
  const nav = direction => ({
    click:async()=>{await page.locator(`[data-rank-nav="${direction}"]`).click();await page.locator('.leaderboard-content:not([aria-busy])').waitFor();},
    isDisabled:()=>page.locator(`[data-rank-nav="${direction}"]`).isDisabled(),
  });
  assert.deepEqual(await ranks(), [11,12,13,14,15,16,17,18,19]);
  assert.equal(await page.locator('.ranking-row[aria-current="true"]').getAttribute('data-rank'), '15');
  await nav('up').click(); assert.deepEqual(await ranks(), [10,11,12,13,14,15,16,17,18]);
  await nav('down').click(); assert.equal((await ranks())[0], 11);
  await nav('first').click(); assert.deepEqual(await ranks(), [1,2,3,4,5,6,7,8,9]);
  assert.ok(await nav('first').isDisabled()); assert.ok(await nav('up').isDisabled());
  const seen = new Set(await ranks());
  for (let start = 0; start < 21; start++) {
    await nav('down').click();
    (await ranks()).forEach(rank => seen.add(rank));
    assert.equal(await page.locator('.ranking-row').count(), 9);
  }
  assert.equal(seen.size, 30);
  assert.deepEqual(await ranks(), [22,23,24,25,26,27,28,29,30]);
  assert.ok(await nav('last').isDisabled()); assert.ok(await nav('down').isDisabled());
  assert.ok(await page.locator('dialog.modal').evaluate(dialog => dialog.contains(document.activeElement)), 'focus remains inside at boundaries');
  await nav('self').click(); assert.equal((await ranks())[4], 15);
  await nav('last').click(); assert.equal((await ranks())[8], 30);
  await nav('self').click();
  console.log('PASS centered self, nine-row windows, every navigation control, 30 reachable players and disabled boundaries');

  for (const [width,height] of [[1920,869],[1366,768],[858,575],[390,844],[360,640],[844,390],[360,480]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.locator('dialog.modal').evaluate(dialog => {
      const selectors = ['.leaderboard-content','.leaderboard-heading','.ranking-summary','.ranking-top','.ranking-table','.ranking-bottom','.leaderboard-ready','.close-modal'];
      return selectors.map(selector => {
        const r = dialog.querySelector(selector).getBoundingClientRect();
        return { selector, top:r.top, bottom:r.bottom, left:r.left, right:r.right, fits:r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth };
      });
    });
    assert.ok(layout.every(item => item.fits), `${width}x${height}: ${JSON.stringify(layout)}`);
    assert.ok(await page.locator('dialog.modal').evaluate(dialog => {
      const center = element => { const r = element.getBoundingClientRect(); return r.left + r.width / 2; };
      const buttonCenter = selector => {
        const buttons = [...dialog.querySelectorAll(`${selector} button`)];
        const first = buttons[0].getBoundingClientRect(), last = buttons.at(-1).getBoundingClientRect();
        return (first.left + last.right) / 2;
      };
      return Math.abs(buttonCenter('.ranking-top') - center(dialog.querySelector('.ranking-top'))) < 1
        && Math.abs(buttonCenter('.ranking-bottom') - center(dialog.querySelector('.ranking-bottom'))) < 1;
    }), `both navigation pairs are centered at ${width}x${height}`);
    assert.ok(await page.locator('dialog.modal').evaluate(dialog => {
      const panel = dialog.getBoundingClientRect();
      const ready = dialog.querySelector('.leaderboard-ready').getBoundingClientRect();
      const buttons = [...dialog.querySelectorAll('.ranking-bottom button')].map(button => button.getBoundingClientRect());
      const leafInset = Math.min(82, panel.width * .14);
      return ready.bottom <= panel.bottom - 20 && buttons.every(button => button.left >= panel.left + leafInset && button.right <= panel.right - leafInset);
    }), `bottom actions clear the painted rim and corner leaves at ${width}x${height}`);
    const window = await page.locator('#ranking-rows').evaluate(body => {
      const area = body.getBoundingClientRect();
      return { scrollHeight:body.scrollHeight, clientHeight:body.clientHeight, visible:[...body.rows].filter(row => { const r=row.getBoundingClientRect(); return r.top>=area.top-1 && r.bottom<=area.bottom+1; }).length };
    });
    if (height >= 640) assert.equal(window.visible, 9, `all nine rows visible at ${width}x${height}: ${JSON.stringify(window)}`);
    await page.screenshot({ path:`test-results/leaderboard-demo-${width}-${height}.png` });
  }
  await page.setViewportSize({ width:1366, height:768 });
  await nav('first').click();
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('[data-action="leaderboard"]').evaluate(el => el === document.activeElement));
  await page.locator('[data-action="leaderboard"]').click();
  await page.locator('dialog.modal:not(.is-preparing)').waitFor();
  await page.locator('.ranking-row[data-rank="15"]').waitFor();
  assert.equal((await ranks())[4],15,'reopening starts around self');
  await page.locator('.leaderboard-ready').click();
  assert.equal(await page.locator('dialog.modal').evaluate(dialog => dialog.open), false);
  assert.deepEqual(errors, []);
  console.log('PASS seven layouts, nine visible rows on phones/desktops, self reset, close controls and focus restoration');
} finally { await browser.close(); }
