import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { symbolRects } from '../src/game-ui.js';

await mkdir('test-results/symbols', {recursive:true});
const browser = await chromium.launch({channel:'msedge',headless:true});
const errors = [];
try {
  const page = await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/auth/me',route=>route.fulfill({json:{user:null,configured:false}}));
  await page.goto('http://127.0.0.1:5174/');
  for (let count=3;count<=8;count++) {
    await page.setViewportSize({width:1366,height:900});
    await page.locator('[data-mode="local"]').click();
    await page.locator(`[data-option="symbolCount"][data-value="${count}"]`).click();
    await page.locator('.setup-start').click();
    await page.locator('.screen-game:not(.is-preparing)').waitFor();
    await page.locator('.play-panel[data-motion="ready"]').waitFor();
    assert.equal(await page.locator('[data-owner="0"] .symbol').count(),count);
    assert.equal(await page.locator('[data-owner="1"] .symbol').count(),count);
    const shared = await page.locator('#board').evaluate(board=>{
      const cards=[...board.querySelectorAll('.hex-card')].map(c=>[...c.querySelectorAll('.symbol')].map(s=>s.dataset.symbol));
      return cards[0].filter(id=>cards[1].includes(id));
    });
    assert.equal(shared.length,1);
    for (const size of [{width:1366,height:900},{width:390,height:844}]) {
      await page.setViewportSize(size);
      // Let the resize observer align the canvas before inspecting the artwork.
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const covered = await page.locator('#board .symbol').evaluateAll(symbols=>symbols.filter(symbol=>{
        const box=symbol.getBoundingClientRect();
        const at=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
        return at!==symbol&&!symbol.contains(at);
      }).map(symbol=>symbol.dataset.symbol));
      assert.deepEqual(covered,[],`native targets are reachable with ${count} symbols at ${size.width}px`);
      const spills = await page.locator('#board .hex-card').evaluateAll(cards => {
        const canvas = document.querySelector('.phaser-layer canvas'), box = canvas.getBoundingClientRect();
        const ratio = canvas.width / box.width;
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        return cards.map(card => {
          const art = card.querySelector('.hex-art'), rect = card.getBoundingClientRect();
          const surface = document.createElement('canvas'); surface.width = art.naturalWidth; surface.height = art.naturalHeight;
          const ctx = surface.getContext('2d'); ctx.drawImage(art, 0, 0);
          const colors = ctx.getImageData(0, 0, surface.width, surface.height).data;
          let outside = 0;
          for (let y = Math.ceil((rect.y - box.y) * ratio); y < (rect.bottom - box.y) * ratio; y += 2) {
            for (let x = Math.ceil((rect.x - box.x) * ratio); x < (rect.right - box.x) * ratio; x += 2) {
              if (pixels[(y * canvas.width + x) * 4 + 3] < 200) continue;
              const u = Math.floor((box.x + x / ratio - rect.x) / rect.width * surface.width);
              const v = Math.floor((box.y + y / ratio - rect.y) / rect.height * surface.height);
              const offset = (v * surface.width + u) * 4;
              const [r,g,b,a] = colors.subarray(offset, offset + 4);
              const white = a > 230 && Math.min(r,g,b) > 170 && (card.classList.contains('opponent-hex')
                ? g > r + 2 && b > r - 10 : b > r + 2 && b > g + 3);
              if (!white) outside++;
            }
          }
          return outside;
        });
      });
      assert.deepEqual(spills, [0,0], `rendered symbols stay on the actual card surface at ${size.width}px`);
      if ([3,6,8].includes(count)) await page.screenshot({path:`test-results/symbols/${count}-${size.width}.png`});
    }
    console.log(`PASS ${count} symbols per hexagon, one shared symbol, desktop/mobile hit targets`);
    await page.locator('[data-action="leave"]').click();
    await page.locator('[data-action="confirm-home"]').click();
  }
  await page.close();

  const hover = await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'no-preference'});
  hover.on('pageerror',e=>errors.push(e.message));
  await hover.addInitScript(()=>{
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    window.symbolTrace=[];
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
      if(window.traceCrop && args[0]?.width===1774 && args[1]===window.traceCrop[0] && args[2]===window.traceCrop[1]) {
        const m=this.getTransform(); if(m.e<this.canvas.width/2) window.symbolTrace.push(Math.atan2(m.b,m.a)*180/Math.PI);
      }
      return draw.apply(this,args);
    };
  });
  await hover.goto('http://127.0.0.1:5174/');
  await hover.locator('[data-mode="local"]').click();await hover.locator('.setup-start').click();
  await hover.locator('.screen-game:not(.is-preparing)').waitFor();
  await hover.clock.install();
  const target=hover.locator('[data-owner="0"] .symbol').first();
  const id=Number(await target.getAttribute('data-symbol'));
  await hover.evaluate(([x,y])=>{window.traceCrop=[x-2,y-2];},symbolRects[id]);
  for (const angle of [179,181,270,359]) {
    await hover.mouse.move(5,5);await hover.clock.runFor(250);
    await target.evaluate((el,angle)=>el.style.setProperty('--tilt',`${angle}deg`),angle);
    await hover.setViewportSize({width:1366+(angle%2),height:900});
    // Trigger a layout measurement even for consecutive odd-angle cases.
    await hover.setViewportSize({width:1368+(angle%2),height:900});
    await hover.clock.runFor(150);
    await hover.evaluate(()=>{window.symbolTrace=[];});
    await target.hover();await hover.clock.runFor(1200);
    const trace=await hover.evaluate(()=>window.symbolTrace);
    assert.ok(trace.length>5,'captures the rendered sprite rotation');
    const deviation=trace.map(value=>Math.abs(((value-angle+540)%360)-180));
    assert.ok(Math.max(...deviation)<=5.2,`hover at ${angle} degrees stays a small wobble: ${Math.max(...deviation)}`);
    const ending=trace.slice(-8);
    assert.ok(Math.max(...ending)-Math.min(...ending)<.1,'hover settles instead of rotating continuously');
    console.log(`PASS ${angle}°: hover never spins a full turn and settles`);
  }
  for(let step=0;step<8;step++) {
    await target.hover();await hover.clock.runFor(30);
    await hover.mouse.move(5,5);await hover.clock.runFor(30);
  }
  await hover.clock.runFor(500);
  assert.deepEqual(errors,[]);
  console.log('PASS rapid pointer re-entry without browser errors');
  await hover.close();
} finally {await browser.close();}
