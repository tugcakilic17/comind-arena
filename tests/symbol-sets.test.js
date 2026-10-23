import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, currentPair, transferCard, matchComplete } from '../src/match-rules.js';
import { getSymbolSet } from '../src/symbol-sets.js';

for (const parrot of ['koak', 'kofen', 'komat', 'kuik']) test(`${parrot} pairs use only the fifteen themed symbols with one common image at every count and target`, () => {
  let seed = 712;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const seen = new Set();
  for (let symbolCount = 3; symbolCount <= 8; symbolCount++) for (const rule of ['empty', 'collect']) for (const winTarget of [5, 10, 15, 20]) {
    const match = createMatch({ parrot, symbolPoolSize: getSymbolSet(parrot).rects.length, symbolCount, rule, winTarget }, random);
    for (let round = 0; !matchComplete(match); round++) {
      assert.ok(round < winTarget * 2);
      const pair = currentPair(match, random);
      assert.equal(pair[0].filter(id => pair[1].includes(id)).length, 1);
      for (const card of pair) {
        assert.equal(card.length, symbolCount);
        assert.equal(new Set(card).size, symbolCount);
        for (const id of card) {
          assert.ok(Number.isInteger(id) && id >= 0 && id < 15);
          seen.add(id);
        }
      }
      transferCard(match, round % 3 === 0 ? 1 : 0);
      assert.equal(match.hands[0].length + match.hands[1].length, winTarget * 2);
    }
    assert.equal(Math.max(...match.scores), winTarget);
  }
  assert.equal(seen.size, 15, 'every themed symbol takes part in matches');
});

test('symbol pools reject impossible configurations and preserve the classic set outside themed solo games', () => {
  assert.throws(() => createMatch({ symbolCount: 8, symbolPoolSize: 14 }), RangeError);
  assert.throws(() => createMatch({ symbolPoolSize: 15.5 }), RangeError);
  for (const key of ['koak', 'kofen', 'komat', 'kuik']) {
    assert.equal(getSymbolSet(key).names.length, 15);
    assert.equal(getSymbolSet(key).key, key);
    assert.ok(getSymbolSet(key).names.every(name => !/papağan|koak|kofen|komat|kuik/i.test(name)), 'symbols contain objects, not parrot characters');
  }
  for (const key of ['unknown', 'toString', 'classic', undefined]) assert.equal(getSymbolSet(key).key, 'classic');
});

for (const parrot of ['koak', 'kofen', 'komat', 'kuik']) test(`${parrot} sprite frames and outlines fit inside the atlas without overlapping neighboring symbols`, () => {
  const set = getSymbolSet(parrot);
  assert.equal(set.rects.length, set.names.length);
  assert.equal(new Set(set.names).size, 15);
  for (const [index, [x, y, width, height]] of set.rects.entries()) {
    assert.ok(x >= 2 && y >= 2 && x + width + 2 <= set.width && y + height + 2 <= set.height);
    assert.ok(set.outlines[index].length >= 3);
    assert.ok(set.outlines[index].every(point => point.every(value => Number.isFinite(value) && value >= 0 && value <= 1)));
    for (const other of set.rects.slice(index + 1)) {
      assert.ok(x + width + 2 <= other[0] - 2 || other[0] + other[2] + 2 <= x - 2 || y + height + 2 <= other[1] - 2 || other[1] + other[3] + 2 <= y - 2);
    }
  }
});
