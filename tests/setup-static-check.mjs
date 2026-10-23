import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {normalizeSetup,createMatch} from '../src/match-rules.js';
assert.equal(normalizeSetup({rotating:true}).rotating,false);
assert.equal(createMatch({rotating:true}).rotating,false);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.route('**/api/auth/me',r=>r.fulfill({json:{configured:true,user:{id:'preview',name:'Ada',avatar:'white'}}}));
 await page.addInitScript(()=>localStorage.setItem('comind.preferences.v1',JSON.stringify({setup:{rotating:true}})));
 for(const mode of ['solo','local']){
  await page.goto('http://localhost:5174/');await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  assert.equal(await page.locator('[data-option="rotating"]').count(),0);
  for(const [width,height] of [[320,568],[390,844],[844,390],[1366,768],[2560,1440],[3840,2160]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
   const delta=await page.locator('.setup-content').evaluate(panel=>{
    const positions=()=>[...panel.querySelectorAll('fieldset,.setup-footer')].map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
    const before=positions(),space=panel.querySelector('.setup-rotation-space'),saved=space.outerHTML;
    space.outerHTML='<button class="rotation-toggle"><span><strong>Altıgenler dönsün</strong><small>Biraz hareket katalım!</small></span><span class="toggle-track"></span></button>';
    const after=positions();panel.querySelector('.rotation-toggle').outerHTML=saved;
    return Math.max(...before.flatMap((row,i)=>row.map((value,j)=>Math.abs(value-after[i][j]))));
   });
   assert.ok(delta<1,`${mode} ${width}x${height}: other controls shifted by ${delta}px`);
  }
  await page.locator('.setup-start').click();await page.locator('.screen-game:not(.is-preparing)').waitFor();
  assert.equal(await page.locator('.play-panel').getAttribute('data-rotating'),'false');
  assert.ok(await page.locator('.hex-turntable').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none')));
 }
 console.log('PASS: option removed, saved rotation disabled, other controls retain position at 12 layouts');
}finally{await browser.close();}
