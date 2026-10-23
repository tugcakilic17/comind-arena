import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/profile', {recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1366,height:768},permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
  let user={id:'00000000-0000-4000-8000-000000000001',name:'Tuğça',email:'test@example.com',publicCode:'ADMA9230',avatar:'white'};
  let failSave=true, saves=0;
  await context.route('**/api/auth/me',route=>route.fulfill({json:{user,configured:true}}));
  await context.route('**/api/auth/profile',route=>{
    saves++;
    const body=route.request().postDataJSON();
    assert.deepEqual(Object.keys(body),['avatar']);
    assert.equal(route.request().method(),'PATCH');
    if(failSave)return route.fulfill({status:503,json:{error:'Kaydedilemedi. Yeniden dene.'}});
    user={...user,avatar:body.avatar};
    return route.fulfill({json:{user}});
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();
  await page.goto('http://localhost:5174/');
  await page.locator('.account-button.is-signed-in').waitFor();
  assert.equal(await page.locator('.account-button .account-nameplate').count(),1,'signed-in avatar and name sit on the painted game UI');
  await page.screenshot({path:'test-results/profile/header-desktop.png'});
  const open=async()=>{await page.locator('[data-action="settings"]').click();await page.locator('dialog[data-kind="settings"][open]:not(.is-preparing)').waitFor();};
  await open();
  assert.equal(await page.locator('dialog[open] .settings-frame').count(),1,'settings reuses the actual game frame');
  assert.equal(await page.locator('.profile-id code').textContent(),'ADMA9230');
  assert.ok(!(await page.locator('.settings-profile').textContent()).includes(user.id),'internal UUID is not shown');
  await page.locator('[data-action="copy-player-code"]').click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),user.publicCode);
  assert.equal(await page.locator('.profile-copy-status').textContent(),'Kopyalandı!');
  assert.ok(await page.locator('.settings-profile').evaluate(card=>{
    const c=card.getBoundingClientRect(),b=card.querySelector('.settings-profile-button').getBoundingClientRect();
    const expected=parseFloat(getComputedStyle(card).paddingBottom)+parseFloat(getComputedStyle(card).borderBottomWidth);
    return Math.abs(c.bottom-b.bottom-expected)<2;
  }),'account button aligns at the bottom of its profile card');
  await page.screenshot({path:'test-results/profile/settings-desktop.png'});
  await page.locator('[data-action="profile-edit"]').click();
  assert.equal(await page.locator('.avatar-choice').count(),3);
  assert.ok(await page.locator('.avatar-choice').evaluateAll(choices=>choices.every(choice=>!choice.textContent.trim())),'avatar choices have no visible names');
  assert.deepEqual(await page.locator('.avatar-choice input').evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label'))),['Beyaz papağan','Lavanta renkli papağan','Pembe papağan']);
  assert.ok(await page.locator('.profile-initial,.avatar-choice-art').evaluateAll(portraits=>portraits.every(portrait=>{
    const frame=portrait.getBoundingClientRect(),image=portrait.querySelector('img').getBoundingClientRect();
    return getComputedStyle(portrait).overflow==='hidden'&&Math.abs(frame.width-frame.height)<1&&image.width>frame.width*1.15;
  })),'settings portraits use the same face crop as the result screen');

  await page.locator('.avatar-choice img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.locator('input[name="avatar"][value="rose"]').check();
  assert.match(await page.locator('.profile-initial img').getAttribute('src'),/player-rose-idle/);
  assert.match(await page.locator('.account-initial img').getAttribute('src'),/player-white-idle/,'preview does not change saved avatar');
  await page.locator('[data-action="profile-cancel"]').click();
  assert.equal(saves,0);
  assert.match(await page.locator('.profile-initial img').getAttribute('src'),/player-white-idle/);
  await page.locator('[data-action="profile-edit"]').click();
  await page.locator('input[name="avatar"][value="lilac"]').check();
  await page.locator('#profile-avatar-form button[type="submit"]').click();
  await page.locator('.profile-status').filter({hasText:'Kaydedilemedi'}).waitFor();
  assert.match(await page.locator('.account-initial img').getAttribute('src'),/player-white-idle/,'failed save keeps original avatar');
  assert.equal(await page.locator('#profile-avatar-form button[type="submit"]').isEnabled(),true);
  failSave=false;
  await page.locator('#profile-avatar-form button[type="submit"]').click();
  await page.locator('#profile-avatar-form').waitFor({state:'detached'});
  assert.match(await page.locator('.account-initial img').getAttribute('src'),/player-lilac-idle/);
  await page.reload();
  await page.locator('.account-initial img[src*="player-lilac"]').waitFor();
  await page.locator('.account-button.is-signed-in').click();
  await page.locator('dialog[data-kind="profile"][open]:not(.is-preparing)').waitFor();
  assert.equal(await page.locator('dialog[open] h2').textContent(),'Profilim');
  assert.equal(await page.locator('.profile-id code').textContent(),'ADMA9230');
  await page.locator('[data-action="profile-edit"]').click();
  await page.locator('input[value="rose"]').check();
  await page.locator('#profile-avatar-form button[type="submit"]').click();
  await page.locator('#profile-avatar-form').waitFor({state:'detached'});
  assert.match(await page.locator('.account-initial img').getAttribute('src'),/player-rose-idle/,'standalone profile saves the chosen avatar too');
  await page.screenshot({path:'test-results/profile/standalone-profile.png'});
  await page.locator('[data-action="profile-edit"]').click();
  await page.locator('input[value="lilac"]').check();
  await page.locator('#profile-avatar-form button[type="submit"]').click();
  await page.locator('#profile-avatar-form').waitFor({state:'detached'});
  await page.keyboard.press('Escape');
  await open();
  await page.locator('[data-action="profile-edit"]').click();
  assert.equal(await page.locator('input[value="lilac"]').isChecked(),true);
  for(const [width,height] of [[320,480],[360,640],[390,844],[540,720],[601,900],[844,390],[1366,768]]){
    await page.setViewportSize({width,height});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'profile editor has no horizontal overflow');
    for(const selector of ['.profile-editor-actions button[type="submit"]','.settings-profile-button','.settings-ready']){
      if(!await page.locator(selector).isVisible())continue;
      await page.locator(selector).scrollIntoViewIfNeeded();
      assert.ok(await page.locator(selector).evaluate(el=>{
        const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return (hit===el||el.contains(hit))&&r.top>=0&&r.bottom<=innerHeight;
      }),`editor control remains reachable at ${width}x${height}`);
    }
    if([320,390,1366].includes(width)){
      await page.locator('dialog[open]').evaluate(el=>el.scrollTo(0,0));
      await page.screenshot({path:`test-results/profile/editor-${width}x${height}.png`});
    }
  }
  await page.setViewportSize({width:1366,height:768});
  await page.keyboard.press('Escape');
  await page.locator('[data-mode="solo"]').click();
  await page.locator('[data-level="easy"]').click();
  await page.locator('.setup-start').click();
  await page.locator('.screen-game:not(.is-preparing)').waitFor();
  const human=page.locator('.avatar-slot[data-player="0"]');
  assert.match(await human.locator('.avatar-idle').getAttribute('src'),/player-lilac-idle/);
  assert.match(await human.locator('.avatar-cheer').getAttribute('src'),/player-lilac-cheer/);
  assert.ok(await human.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)));
  const match=await page.locator('#board').evaluate(board=>{
    const other=[...board.querySelectorAll('[data-owner="1"] .symbol')].map(el=>el.dataset.symbol);
    return [...board.querySelectorAll('[data-owner="0"] .symbol')].find(el=>other.includes(el.dataset.symbol)).dataset.symbol;
  });
  await page.locator(`[data-owner="0"] [data-symbol="${match}"]`).click();
  assert.equal(await page.locator('#score-left').textContent(),'1');
  assert.equal(await human.locator('.avatar-cheer').evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.screenshot({path:'test-results/profile/lilac-game-cheer.png'});
  await context.close();
  const guestContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await guestContext.route('**/api/auth/me',route=>route.fulfill({json:{user:null,configured:true}}));
  const guest=await guestContext.newPage();
  guest.on('pageerror',error=>errors.push(error.message));
  await guest.goto('http://localhost:5174/');
  await guest.locator('[data-action="settings"]').click();
  await guest.locator('dialog[open]:not(.is-preparing)').waitFor();
  await guest.locator('[data-action="profile-edit"]').click();
  await guest.locator('input[value="rose"]').check();
  await guest.locator('#profile-avatar-form button[type="submit"]').click();
  await guest.locator('#profile-avatar-form').waitFor({state:'detached'});
  await guest.reload();
  await guest.locator('[data-action="settings"]').click();
  await guest.locator('dialog[open]:not(.is-preparing)').waitFor();
  assert.match(await guest.locator('.profile-initial img').getAttribute('src'),/player-rose-idle/,'guest choice survives reload locally');
  await guestContext.close();
  assert.deepEqual(errors,[]);
  console.log('PASS profile: painted panel, short ID/copy, bottom alignment, three choices, cancel, failed-save retry, persisted account/guest avatars, seven editor layouts and real in-game celebration');
} finally {await browser.close();}
