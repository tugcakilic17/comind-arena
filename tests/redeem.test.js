import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp, readConfig } from '../server/app.js';

test('gift endpoint remains inactive, validates input, blocks foreign origins and never accesses reward storage', async () => {
  const db = { pool: { query() { throw new Error('Inactive codes must not access storage'); } } };
  const app = await buildApp({ db, config: readConfig({ APP_URL: 'http://localhost:5174/' }) });
  try {
    const request = payload => app.inject({ method: 'POST', url: '/api/gifts/redeem', headers: { origin: 'http://localhost:5174' }, payload });
    for (const code of ['GIFT-2026', 'ABC123']) {
      const response = await request({ code });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().status, 'inactive');
      assert.ok(!Object.hasOwn(response.json(), 'reward'));
      assert.equal(response.headers['cache-control'], 'no-store');
    }
    for (const payload of [{}, { code: '' }, { code: 'AB' }, { code: 'A'.repeat(65) }, { code: '<script>' }]) {
      assert.equal((await request(payload)).statusCode, 400);
    }
    assert.equal((await app.inject({ method: 'POST', url: '/api/gifts/redeem', headers: { origin: 'https://foreign.test' }, payload: { code: 'GIFT-2026' } })).statusCode, 403);
  } finally { await app.close(); }
});
