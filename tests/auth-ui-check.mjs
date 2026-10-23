import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let user = { id: 'common-user-id', name: 'Ada <Kâşif>', email: 'ada@example.com', publicCode:'ADMA9230', avatar:'white' };
  let logoutFails = true;
  await page.route('**/api/auth/me', route => route.fulfill({ json: { configured: true, user } }));
  await page.route('**/api/auth/logout', route => {
    if (logoutFails) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    user = null;
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('http://127.0.0.1:5174/');
  await page.getByRole('button', { name: 'Ada <Kâşif>, profilim', exact: true }).waitFor();
  const face=page.locator('.account-initial.player-face img');
  assert.match(await face.getAttribute('src'), /player-white-idle-v1\.webp$/);
  await face.evaluate(image=>image.decode());
  for(const [width,height] of [[320,480],[390,844],[844,390],[1366,768]]) {
    await page.setViewportSize({width,height});
    assert.ok(await page.locator('.account-button.is-signed-in').evaluate(button=>{
      const face=button.querySelector('.player-face').getBoundingClientRect(),name=button.querySelector('.account-header-name').getBoundingClientRect(),box=button.getBoundingClientRect();
      return name.left>=face.right+4 && Math.abs((face.top+face.height/2)-(name.top+name.height/2))<2 && box.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth;
    }),`white face and name sit side by side within the header at ${width}x${height}`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/player-white-signed-in-header.png'});
  await page.locator('[data-action="settings"]').click();
  await page.locator('dialog[data-kind="settings"][open]:not(.is-preparing)').waitFor();
  assert.match(await page.locator('.profile-initial img').getAttribute('src'), /player-white-idle-v1\.webp$/);
  assert.equal(await page.locator('.profile-summary strong').textContent(), 'Ada <Kâşif>');
  await page.screenshot({path:'test-results/settings-signed-in-mobile.png'});
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'Ada <Kâşif>, profilim', exact: true }).click();
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).waitFor();
  assert.equal(await page.locator('dialog[open] h2').textContent(),'Profilim');
  assert.equal(await page.locator('.profile-summary strong').textContent(),'Ada <Kâşif>');
  assert.equal(await page.locator('.profile-id code').textContent(),'ADMA9230');
  assert.equal(await page.locator('kâşif').count(), 0, 'profile text never becomes markup');
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await page.getByText('Çıkış yapılamadı. Lütfen yeniden dene.', { exact: true }).waitFor();
  assert.ok(await page.getByRole('button', { name: 'Çıkış yap', exact: true }).isVisible());
  logoutFails = false;
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await page.getByText('Çıkış yaptın. İstediğinde tekrar görüşelim!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Google ile devam et', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Pencereyi kapat', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Google ile giriş yap', exact: true }).waitFor();
  assert.equal(await page.locator('.is-signed-in').count(), 0);

  // The real backend is covered in auth.test.js; this verifies UI handling only.
  await page.goto('http://127.0.0.1:5174/?auth=cancelled');
  await page.getByText('Google ile giriş iptal edildi. Hazır olduğunda yeniden deneyebilirsin.', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.has('auth'), false);
  await page.screenshot({ path: 'test-results/google-auth-cancelled-mobile.png' });
  await page.getByRole('button', { name: 'Pencereyi kapat', exact: true }).click();
  await page.route('**/api/auth/google', route => route.fulfill({ contentType: 'text/html', body: '<h1>OAuth navigation reached</h1>' }));
  await page.getByRole('button', { name: 'Google ile giriş yap', exact: true }).click();
  await page.getByRole('button', { name: 'Google ile devam et', exact: true }).click();
  await page.getByRole('heading', { name: 'OAuth navigation reached', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS session restoration, escaped profile, logout failure/retry, cancellation and Google navigation');
} finally { await browser.close(); }
