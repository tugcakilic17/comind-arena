import test from 'node:test';
import assert from 'node:assert/strict';
import { demoPlayers, leaderboardStart, visibleRanks } from '../src/leaderboard-ui.js';

test('demo ranking has thirty descending scores and four neighbors on either side of self', () => {
  assert.equal(demoPlayers.length, 30);
  assert.equal(demoPlayers.filter(player => player.isSelf).length, 1);
  assert.ok(demoPlayers.every((player, index) => player.rank === index + 1 && (!index || player.score < demoPlayers[index - 1].score)));
  const window = demoPlayers.slice(leaderboardStart(), leaderboardStart() + visibleRanks);
  assert.equal(window.length, 9);
  assert.equal(window.findIndex(player => player.isSelf), 4);
});

test('rank browsing clamps boundaries and can always return to self', () => {
  assert.equal(leaderboardStart(10, 'first'), 0);
  assert.equal(leaderboardStart(0, 'up'), 0);
  assert.equal(leaderboardStart(10, 'up'), 9);
  assert.equal(leaderboardStart(10, 'down'), 11);
  assert.equal(leaderboardStart(10, 'last'), 21);
  assert.equal(leaderboardStart(21, 'down'), 21);
  assert.equal(leaderboardStart(21, 'self'), 10);
});
