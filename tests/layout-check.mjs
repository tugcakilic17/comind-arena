// Optional responsive QA, using the same Playwright setup as browser-check.mjs.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COMIND_PLAYWRIGHT_DIR || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const sizes = [[1440,900],[1366,768],[1130,621],[1280,600],[1024,768],[768,1024],[390,844],[360,640],[844,390],[600,400],[360,480]];
try {
  for (const mode of ['solo','local']) {
    const page = await browser.newPage();
    await page.clock.install();
    for (const [width,height] of sizes) {
      await page.setViewportSize({width,height});
      await page.goto('http://127.0.0.1:5174/');
      await page.locator(`[data-mode="${mode}"]`).click();
      await page.waitForSelector('.screen-game:not(.is-preparing)');
      await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
      const result = await page.evaluate(() => {
        const box = node => node.getBoundingClientRect();
        const panel = box(document.querySelector('.play-panel'));
        const cards = [...document.querySelectorAll('.hex-art')].map(box);
        const owners = [...document.querySelectorAll('.card-owner')].map(box);
        const avatars = [...document.querySelectorAll('.avatar-slot')].map(box);
        const title = box(document.querySelector('.board-title'));
        const supports = [...document.querySelectorAll('.surface-woodenStage')].map(box).filter(stage => stage.width > 0);
        return {
          noScroll: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth,
          cardsInside: cards.every(card => card.top >= panel.top && card.bottom <= panel.bottom && card.left >= panel.left && card.right <= panel.right),
          labelsClear: cards.every((card,index) => owners[index].top >= panel.top && owners[index].bottom < card.top + card.height * .15),
          titleClear: owners.every(owner => owner.bottom <= title.top || owner.top >= title.bottom || owner.right <= title.left || owner.left >= title.right),
          avatarsAligned: Math.abs(avatars[0].top-avatars[1].top)<1 && Math.abs(avatars[0].height-avatars[1].height)<1,
          cardsGrounded: cards.every(card => supports.some(stage => {
            const foot = card.bottom - card.height * .04;
            const center = card.left + card.width / 2;
            return stage.top <= foot && stage.bottom >= foot && stage.left <= center && stage.right >= center;
          })),
          symbolsClickable: [...document.querySelectorAll('.symbol:not(:disabled)')].every(symbol => {const r=box(symbol);return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.symbol')===symbol;}),
          cardWidth: Math.round(cards[0].width),
        };
      });
      console.log(mode,width,height,result);
      for(const [key,value] of Object.entries(result)) if(key!=='cardWidth') assert.ok(value,`${mode} ${width}×${height}: ${key}`);
      if(width===1440) assert.ok(result.cardWidth>=450,'desktop cards keep a generous readable size');
      if(width===1366) assert.ok(result.cardWidth>=420,'landscape cards keep a generous readable size');
      if(mode==='solo' && ((width===1366 && height===768) || width===390 || width===1440 || width===1130)) await page.screenshot({path:`test-results/game-v22-${width}.png`});
    }
    await page.close();
  }
} finally { await browser.close(); }
