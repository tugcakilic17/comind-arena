import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/me', route => route.fulfill({ json: {
    user: { id: 'audio-player', name: 'Ada', publicCode: 'ABCD1234', avatar: 'white' }, configured: true,
  } }));
  await page.addInitScript(() => {
    window.audioEvents = [];
    window.audioPeak = 0;
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, ...args) {
      if (destination === this.context.destination) {
        const context = this.context;
        if (!context.testMeter) {
          context.testMeter = context.createAnalyser();
          connect.call(context.testMeter, context.destination);
          const samples = new Float32Array(context.testMeter.fftSize);
          setInterval(() => {
            context.testMeter.getFloatTimeDomainData(samples);
            for (const sample of samples) window.audioPeak = Math.max(window.audioPeak, Math.abs(sample));
          }, 10);
        }
        destination = context.testMeter;
      }
      return connect.call(this, destination, ...args);
    };
    for (const [prototype, kind] of [[AudioBufferSourceNode.prototype, 'click'], [OscillatorNode.prototype, 'note']]) {
      const original = prototype.start;
      prototype.start = function (...args) {
        window.audioEvents.push({ kind, frequency: this.frequency?.value, duration: this.buffer?.duration });
        return original.apply(this, args);
      };
    }
  });
  await page.goto(process.env.COMIND_TEST_URL || 'http://127.0.0.1:5174/');
  assert.equal(await page.evaluate(async () => {
    const { readPreferences } = await import('/src/preferences.js');
    return readPreferences().sound;
  }), true, 'a fresh visit enables sound without preloading preferences');
  const events = () => page.evaluate(() => window.audioEvents);
  const reset = () => page.evaluate(() => { window.audioEvents = []; });
  const settings = page.locator('[data-action="settings"]');
  await settings.click();
  await page.locator('dialog[open]:not(.is-preparing)').waitFor();
  await page.waitForFunction(() => window.audioEvents.some(event => event.kind === 'click'));
  await page.waitForFunction(() => window.audioPeak > .0005);
  assert.ok(await page.evaluate(() => window.audioPeak > .0005), 'the default first click sends a non-silent signal to the audio output');
  assert.equal((await events()).length, 1, 'menu button plays the recording once');
  assert.ok((await events())[0].duration > 0, 'the WAV decodes into a playable buffer');
  await reset();
  await page.locator('[data-action="sound"]').click();
  assert.equal(await page.evaluate(async () => {
    const { readPreferences } = await import('/src/preferences.js');
    return readPreferences().sound;
  }), false, 'an explicit mute remains saved');
  await page.locator('dialog[open] [data-action="close"]').first().click();
  await settings.click();
  await page.locator('dialog[open]:not(.is-preparing)').waitFor();
  assert.deepEqual(await events(), [], 'muting and muted menu buttons stay silent');
  await page.locator('[data-action="sound"]').click();
  await page.waitForFunction(() => window.audioEvents.length === 1);
  assert.equal((await events())[0].kind, 'click', 'enabling sound previews the click instead of success');
  await page.keyboard.press('Escape');
  await page.locator('[data-mode="local"]').click();
  await page.locator('dialog[data-kind="setup"][open]:not(.is-preparing)').waitFor();
  await page.locator('.setup-start').click();
  await page.locator('.screen-game:not(.is-preparing):not([inert])').waitFor();
  const symbols = await page.locator('#board .player-card').evaluateAll(cards => cards.map(card =>
    [...card.querySelectorAll('[data-symbol]')].map(button => button.dataset.symbol)));
  const shared = symbols[0].find(id => symbols[1].includes(id));
  const wrong = symbols[0].find(id => id !== shared);
  await reset();
  await page.locator(`#board [data-symbol="${wrong}"]`).first().click();
  assert.deepEqual((await events()).map(event => event.frequency), [349.23, 311.13].map(Math.fround), 'retry uses two descending soft notes without a menu click');
  await reset();
  await page.locator(`#board [data-symbol="${shared}"]`).first().click();
  assert.deepEqual((await events()).map(event => event.frequency), [523.25, 659.25].map(Math.fround), 'correct answer uses a distinct ascending pair without a menu click');

  // Check online responses: only confirmed answers produce feedback, never stale
  // rounds, throttling notices, or network failures.
  const room = { id: 'audio-room', code: 'ABCDEFGH', you: 0, scores: [0, 0], round: 1,
    status: 'playing', revision: 1, serverTime: Date.now() };
  let reply = room;
  await page.route('**/api/arena/rooms', route => route.fulfill({ json: room }));
  await page.route('**/api/arena/rooms/ABCDEFGH', route => route.fulfill({ json: reply }));
  await page.route('**/api/arena/rooms/ABCDEFGH/answer', route => route.fulfill({ json: reply }));
  await page.evaluate(async () => {
    window.onlineAudio = await import('/src/online.js');
    window.answerEvents = [];
    window.onlineAudio.enterOnline(() => {}, correct => window.answerEvents.push(correct));
    await window.onlineAudio.onlineAction('create');
  });
  reply = { ...room, notice: 'Tekrar dene!' };
  await page.evaluate(() => window.onlineAudio.onlineAction('answer', 1));
  reply = { ...room, notice: 'Bu tur henüz hazır değil veya tamamlandı.' };
  await page.evaluate(() => window.onlineAudio.onlineAction('answer', 1));
  reply = { ...room, scores: [1, 0], revision: 2, round: 2 };
  await page.evaluate(() => window.onlineAudio.onlineAction('answer', 1));
  assert.deepEqual(await page.evaluate(() => window.answerEvents), [false, true], 'online feedback follows confirmed wrong/correct responses');
  await page.evaluate(() => window.onlineAudio.stopOnline());
  assert.deepEqual(errors, [], 'no browser errors');
  console.log('PASS recording, mute, sound toggle, distinct answer tones, and online confirmation');
} finally {
  await browser.close();
}
