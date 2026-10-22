import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, getPair, sharedSymbol, shuffle, readScores, storeScore } from '../src/game.js';
import { symbols } from '../src/icons.js';

test('31 cards each have six distinct illustrated symbols', () => {
  const deck = createDeck();
  assert.equal(deck.length, 31);
  assert.equal(symbols.length, 31);
  for (const card of deck) {
    assert.equal(card.length, 6);
    assert.equal(new Set(card).size, 6);
    assert.ok(card.every(id => symbols[id]));
  }
});

test('every one of the 465 card pairs has exactly one shared symbol', () => {
  const deck = createDeck();
  let checked = 0;
  for (let a = 0; a < deck.length; a++) {
    for (let b = a + 1; b < deck.length; b++) {
      assert.equal(deck[a].filter(id => deck[b].includes(id)).length, 1, `cards ${a} and ${b}`);
      checked++;
    }
  }
  assert.equal(checked, 465);
});

test('random pair generation preserves the single match, including edge selections', () => {
  const deck = createDeck();
  const original = JSON.stringify(deck);
  for (const random of [() => 0, () => .999999, Math.random]) {
    for (let i = 0; i < 100; i++) {
      const pair = getPair(deck, random);
      assert.equal(pair[0].filter(id => pair[1].includes(id)).length, 1);
      assert.ok(pair[0].includes(sharedSymbol(pair)));
    }
  }
  assert.equal(JSON.stringify(deck), original);
  assert.deepEqual(shuffle([1,2,3], () => 0).sort(), [1,2,3]);
});

test('score storage handles missing permissions and malformed data', () => {
  assert.deepEqual(readScores(null), []);
  assert.equal(storeScore(null, {}), false);
  assert.deepEqual(readScores({ getItem: () => '{broken' }), []);
  assert.deepEqual(readScores({ getItem: () => '[null,{},42]' }), []);
  let saved;
  const storage = { getItem: () => saved, setItem: (_, value) => saved = value };
  const row = { name: 'Misafir oyuncu', score: 8, opponent: 3, mode: 'solo', difficulty: 'easy', date: new Date().toISOString() };
  assert.equal(storeScore(storage, row), true);
  assert.deepEqual(readScores(storage), [row]);
});
