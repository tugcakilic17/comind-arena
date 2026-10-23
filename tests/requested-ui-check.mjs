import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/requested-ui', { recursive: true });
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  let user=null;
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/auth/me',route=>route.fulfill({json:{configured:true,user}}));
  await page.route('**/api/arena/friends',route=>route.fulfill({json:{friends:[],incoming:[],outgoing:[],invites:[]}}));
  for(const mode of ['solo','local','online']) {
    user=null;
    await page.goto('http://localhost:5174/');
    await page.locator(`[data-mode="${mode}"]`).click();
    await page.getByRole('button',{name:'Google ile devam et',exact:true}).waitFor();
    assert.equal(await page.locator('dialog[data-kind="setup"][open],.screen-game,.online-hub').count(),0,`${mode} requires sign-in`);
    user={id:'preview',name:'Ada',publicCode:'ABCD1234',avatar:'white'};
    await page.goto('http://localhost:5174/?auth=success');
    await page.locator(mode==='online'?'.online-hub':'dialog[data-kind="setup"][open]').waitFor();
  }
  console.log('PASS all three modes require sign-in and resume the chosen mode after login');
  for(const [width,height] of [[1366,768],[1920,1080],[3840,2160],[390,844],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.locator('.surface-resultPanel img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await page.evaluate(()=>document.fonts.ready);
    const metrics=await page.locator('.online-hub').evaluate(panel=>{
      const r=panel.getBoundingClientRect(),summary=panel.querySelector('.online-world-picker summary'),arrow=summary.querySelector('svg'),s=summary.getBoundingClientRect(),a=arrow.getBoundingClientRect();
      return {width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,arrow:a.width>=12&&a.height>=12&&a.left>=s.left&&a.right<=s.right&&a.top>=s.top&&a.bottom<=s.bottom,controls:[...panel.querySelectorAll('.online-setup>.online-primary,.online-join-form>.online-primary')].every(el=>{const b=el.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth;}),font:parseFloat(getComputedStyle(panel.querySelector('.online-primary')).fontSize)};
    });
    assert.ok(!metrics.overflow&&metrics.controls&&metrics.arrow,`${width}x${height}: ${JSON.stringify(metrics)}`);
    if(width===3840)assert.ok(metrics.width>=1400&&metrics.font>=24,'smartboard panel and controls are scaled up');
    if(width===1366||width===3840)await page.screenshot({path:`test-results/requested-ui/room-${width}.png`});
    await page.locator('.online-world-picker summary').click();
    assert.equal(await page.locator('.online-world-menu button:visible').count(),4);
    assert.ok(await page.locator('.online-world-menu').evaluate(menu=>{const r=menu.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
    if(width===1366)await page.screenshot({path:'test-results/requested-ui/world-picker.png'});
    await page.keyboard.press('Escape');
  }
  console.log('PASS room panel, cards and visible SVG arrow on desktop, phone, landscape and 4K smartboard');
  for(const parrot of ['koak','kofen']) {
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://localhost:5174/');
    await page.locator('[data-mode="solo"]').click();
    await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
    await page.locator(`[data-option="parrot"][data-value="${parrot}"]`).click();
    await page.locator('.setup-start').click();
    await page.locator('.screen-game:not(.is-preparing)').waitFor();
    for(const [width,height] of [[390,844],[844,390]]) {
      await page.setViewportSize({width,height});
      const visible=await page.locator('.surface-woodenStage,.surface-seaPierWide,.surface-seaPierCompact').evaluateAll(items=>items.filter(el=>getComputedStyle(el).display!=='none').length);
      assert.equal(visible,0,`${parrot}: no wood or pier on ${width}x${height}`);
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`test-results/requested-ui/${parrot}-phone.png`});
    await page.setViewportSize({width:3840,height:2160});
    const game=await page.locator('.hex-card').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return {width:r.width,bottom:r.bottom};}));
    assert.ok(game.every(card=>card.width>=400&&card.bottom<=2160),`large-screen game: ${JSON.stringify(game)}`);
    if(parrot==='kofen')await page.screenshot({path:'test-results/requested-ui/game-4k.png'});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS phone wood/pier removal, desktop game proportions and no runtime errors');
} finally {await browser.close();}
