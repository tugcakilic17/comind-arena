import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/mode-cues', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
async function start(page, rule) {
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: null, configured: false } }));
  await page.clock.install();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('[data-mode="solo"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await page.locator('[data-option="parrot"][data-value="koak"]').click();
  await page.locator('[data-option="winTarget"][data-value="5"]').click();
  await page.locator(`[data-option="rule"][data-value="${rule}"]`).click();
  await page.locator('[data-level="easy"]').click();
  await page.locator('.setup-start').click();
  await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
}
try {
  for (const rule of ['empty', 'collect']) for (const [width, height] of [[1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'no-preference' });
    await start(page, rule);
    const owner = rule === 'empty' ? 0 : 1;
    assert.equal(await page.locator('.hex-card[data-input-hint]').count(), 1);
    assert.ok(await page.locator(`[data-owner="${owner}"] .hex-card`).getAttribute('data-input-hint'));
    assert.equal(await page.locator(`[data-owner="${owner}"] .hex-art`).evaluate(art => art.getAnimations()[0].effect.getTiming().iterations), Infinity);
    await page.clock.runFor(3000);
    assert.equal(await page.locator('.hex-card[data-input-hint]').count(), 1, 'hint continues beyond the former two-pulse limit');
    await page.screenshot({ path: `test-results/mode-cues/${rule}-${width}-hint.png` });
    const id = await page.locator('#board').evaluate(board => {
      const right = [...board.querySelectorAll('[data-side="right"]')].map(element => element.dataset.symbol);
      return [...board.querySelectorAll('[data-side="left"]')].find(element => right.includes(element.dataset.symbol)).dataset.symbol;
    });
    await page.locator(`[data-side="left"][data-symbol="${id}"]`).click();
    assert.equal(await page.locator('.hex-card[data-input-hint]').count(), 0, 'first valid-card input ends the hint');
    const from = rule === 'empty' ? 0 : 1, to = 1 - from;
    assert.equal(await page.locator(`[data-pile-owner="${from}"]`).getAttribute('data-pile-count'), '4');
    assert.equal(await page.locator(`[data-pile-owner="${to}"]`).getAttribute('data-pile-count'), '6');
    const transfer = page.locator('.card-transfer');
    assert.equal(await transfer.getAttribute('data-destination-owner'), String(to));
    const landingError = await transfer.evaluate((host, to) => {
      const animation = host.getAnimations()[0], frame = animation.effect.getKeyframes().at(-1), matrix = new DOMMatrix(frame.transform);
      const start = { x: parseFloat(host.style.left), y: parseFloat(host.style.top), w: parseFloat(host.style.width), h: parseFloat(host.style.height) };
      const panel = host.parentElement.getBoundingClientRect(), top = host.parentElement.querySelector(`[data-pile-owner="${to}"] .pile-cards img:last-child`), pile = top.getBoundingClientRect();
      const style = getComputedStyle(top), targetMatrix = new DOMMatrix(style.transform);
      const targetAngle = Math.atan2(targetMatrix.b, targetMatrix.a) * 180 / Math.PI + (parseFloat(style.rotate) || 0);
      const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
      return { x: Math.abs(start.x + start.w / 2 + matrix.m41 - (pile.left + pile.width / 2 - panel.left)), y: Math.abs(start.y + start.h / 2 + matrix.m42 - (pile.top + pile.height / 2 - panel.top)), angle: Math.abs((angle - targetAngle + 540) % 360 - 180), width: Math.abs(Math.hypot(matrix.a, matrix.b) * start.w - top.offsetWidth), height: Math.abs(Math.hypot(matrix.c, matrix.d) * start.h - top.offsetHeight), sameArt: host.querySelector('.hex-art').src === top.src, opacity: frame.opacity, duration: animation.effect.getTiming().duration };
    }, to);
    assert.ok(landingError.x < 1 && landingError.y < 1 && landingError.angle < .01 && landingError.width < .01 && landingError.height < .01 && landingError.sameArt, `card matches the top card position, angle, size and artwork: ${JSON.stringify(landingError)}`);
    assert.equal(landingError.opacity, '1', 'card remains visible through landing');
    assert.equal(landingError.duration, 880);
    await page.clock.runFor(500);
    await page.screenshot({ path: `test-results/mode-cues/${rule}-${width}-transfer.png` });
    await page.clock.runFor(1100);
    assert.equal(await page.locator('.card-transfer').count(), 0);
    assert.equal(await page.locator('.hex-card[data-input-hint]').count(), 0, 'later rounds do not repeat the opening hint');
    assert.equal(await page.locator('#score-left').textContent(), '1');
    console.log(`PASS ${rule} ${width}x${height}: persistent cue, stop on input, exact top-card landing and no repeat`);
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await start(reduced, 'collect');
  assert.equal(await reduced.locator('[data-owner="1"] .hex-art').evaluate(art => art.getAnimations().length), 0);
  await reduced.clock.runFor(2300);
  assert.equal(await reduced.locator('.hex-card[data-input-hint]').count(), 1, 'reduced-motion cue also remains until input');
  await reduced.locator('[data-side="left"]').first().click();
  assert.equal(await reduced.locator('.hex-card[data-input-hint]').count(), 0);
  const untouched = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await start(untouched, 'empty');
  await untouched.clock.runFor(13000);
  assert.notEqual(await untouched.locator('#round-label').textContent(), '1. eşleşme');
  assert.equal(await untouched.locator('[data-owner="0"] .hex-card[data-input-hint]').count(), 1, 'bot rounds keep guiding the player until their first input');
  assert.deepEqual(errors, []);
  console.log('PASS static cue for reduced motion and continued guidance after a bot round; no runtime errors');
} finally { await browser.close(); }
