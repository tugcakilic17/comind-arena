import test from 'node:test';
import assert from 'node:assert/strict';
import { leaderboardStart, visibleRanks, leaderboardView } from '../src/leaderboard-ui.js';

test('ranking starts empty and never invents competitors or scores', () => {
  assert.equal(visibleRanks, 9);
  assert.equal(leaderboardStart(), 0);
  assert.equal(leaderboardStart(0, 'self', 30, 15), 10);
  assert.ok(!leaderboardView().includes('OrmanKaşifi'));
  assert.ok(leaderboardView().includes('Sıralama yükleniyor'));
});

test('rank browsing clamps boundaries and can always return to self', () => {
  assert.equal(leaderboardStart(10, 'first', 30, 15), 0);
  assert.equal(leaderboardStart(0, 'up', 30, 15), 0);
  assert.equal(leaderboardStart(10, 'up', 30, 15), 9);
  assert.equal(leaderboardStart(10, 'down', 30, 15), 11);
  assert.equal(leaderboardStart(10, 'last', 30, 15), 21);
  assert.equal(leaderboardStart(21, 'down', 30, 15), 21);
  assert.equal(leaderboardStart(21, 'self', 30, 15), 10);
  assert.equal(leaderboardStart(21, 'last', 2, 1), 0);
});
