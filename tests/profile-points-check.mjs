import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/points', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const user = { id: 'preview-player', name: 'Tuğça', publicCode: 'DEMO2225', avatar: 'white' };
  const players = [
    { user_id: 'preview-ada', name: 'Ada', score: 90, rank: 1, isSelf: false },
    { user_id: user.id, name: user.name, score: 60, rank: 2, isSelf: true },
    { user_id: 'preview-deniz', name: 'Deniz', score: 30, rank: 3, isSelf: false },
  ];
  let mode = 'populated';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { configured: true, user } }));
  await page.route('**/api/arena/leaderboard?*', route => {
    if (mode === 'error') return route.fulfill({ status: 503, json: { error: 'Sunucuya ulaşılamıyor.' } });
    return route.fulfill({ json: mode === 'empty'
      ? { total: 0, start: 0, self: null, players: [] }
      : { total: players.length, start: 0, self: players[1], players } });
  });
  await page.goto('http://localhost:5174/');
  await page.locator('.account-button.is-signed-in').click();
  await page.getByText('60 puan', { exact: true }).waitFor();
  assert.match(await page.locator('[data-profile-rank]').textContent(), /^2\. sıradasın/);
  await page.locator('dialog[open]:not(.is-preparing)').waitFor();
  await page.screenshot({ path: 'test-results/points/profile-example.png' });
  await page.getByRole('button', { name: 'Liderlik tablosunu aç', exact: true }).click();
  await page.locator('.ranking-row.is-self').waitFor();
  assert.match(await page.locator('.ranking-row.is-self').textContent(), /Tuğça.*60/s);
  assert.equal(await page.locator('.ranking-row').count(), 3);
  await page.locator('dialog[open]:not(.is-preparing)').waitFor();
  await page.screenshot({ path: 'test-results/points/leaderboard-example.png' });
  await page.keyboard.press('Escape');
  await page.locator('.account-button.is-signed-in').click();
  await page.locator('.profile-points:not([aria-busy])').waitFor();
  await page.locator('[data-action="profile-edit"]').click();
  await page.setViewportSize({ width: 320, height: 480 });
  await page.screenshot({ path: 'test-results/points/profile-editor-small.png' });
  assert.equal(await page.locator('.profile-points').isVisible(), false, 'avatar editing keeps its compact layout');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-action="profile-cancel"]').click();
  await page.getByText('60 puan', { exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/points/profile-mobile-example.png' });
  for (const [width, height] of [[320,480],[390,844],[844,390],[1366,768]]) {
    await page.setViewportSize({ width, height });
    assert.ok(await page.locator('.profile-points').evaluate(card => {
      const r = card.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && (hit === card || card.contains(hit));
    }), `points remain visible and clickable at ${width}x${height}`);
  }
  await page.keyboard.press('Escape');
  mode = 'empty';
  await page.locator('.account-button.is-signed-in').click();
  await page.getByText('0 puan', { exact: true }).waitFor();
  assert.match(await page.locator('[data-profile-rank]').textContent(), /İlk arkadaş maçınla/);
  await page.keyboard.press('Escape');
  mode = 'error';
  await page.locator('.account-button.is-signed-in').click();
  await page.getByText('Puan yüklenemedi', { exact: true }).waitFor();
  assert.equal(await page.getByText('0 puan', { exact: true }).count(), 0, 'network errors never appear as a zero balance');
  assert.deepEqual(errors, []);
  console.log('PASS profile uses leaderboard totals, links to highlighted self, handles empty rankings and errors');
} finally { await browser.close(); }
