import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, currentPair, transferCard, matchWinner, matchComplete, normalizeSetup, symbolPoses } from '../src/match-rules.js';
import { symbolRects } from '../src/game-ui.js';
import { symbolOutlines } from '../src/symbol-outlines.js';

test('3–8 symbols stay unique with one shared symbol throughout every target and mode', () => {
  for (let symbolCount = 3; symbolCount <= 8; symbolCount++) for (const rule of ['empty', 'collect']) for (const winTarget of [5,10,15,20]) {
    const match = createMatch({ symbolCount, rule, winTarget });
    assert.deepEqual(match.hands.map(hand => hand.length), [winTarget, winTarget]);
    for (let round = 0; !matchComplete(match); round++) {
      assert.ok(round < winTarget * 2);
      const [a,b] = currentPair(match);
      assert.equal(a.length, symbolCount); assert.equal(b.length, symbolCount);
      assert.equal(new Set(a).size, symbolCount); assert.equal(new Set(b).size, symbolCount);
      assert.equal(a.filter(id => b.includes(id)).length, 1);
      transferCard(match, round % 3 === 0 ? 1 : 0);
      assert.equal(match.hands[0].length + match.hands[1].length, winTarget * 2);
    }
    assert.equal(match.scores[matchWinner(match)], winTarget);
  }
});

test('empty and collect preserve the actual card-transfer direction', () => {
  for (const rule of ['empty', 'collect']) for (const player of [0,1]) {
    const match = createMatch({ rule, winTarget:5 });
    const from = rule === 'empty' ? player : 1-player, to = 1-from;
    const card = match.hands[from][0];
    assert.deepEqual(transferCard(match, player), {from,to});
    assert.equal(match.hands[to].at(-1), card);
    assert.equal(match.hands[from].length, 4);
    assert.equal(match.hands[to].length, 6);
    assert.equal(match.scores[player], 1);
  }
});

test('first to the chosen correct-answer target wins, not the total number of rounds', () => {
  for (const winTarget of [5,10,15,20]) for (const rule of ['empty', 'collect']) for (const winner of [0,1]) {
    const match = createMatch({winTarget,rule});
    for (let point=0;point<winTarget-1;point++) {
      transferCard(match,winner); transferCard(match,1-winner);
      assert.equal(matchComplete(match),false);
      assert.equal(matchWinner(match),null);
    }
    assert.equal(match.winners.length,(winTarget-1)*2);
    transferCard(match,winner);
    assert.equal(matchComplete(match),true);
    assert.equal(matchWinner(match),winner);
    assert.equal(match.scores[winner],winTarget);
    assert.equal(match.scores[1-winner],winTarget-1);
    const snapshot=JSON.stringify(match);
    assert.equal(transferCard(match,1-winner),null);
    assert.equal(JSON.stringify(match),snapshot,'finished games reject extra points');
  }
});

test('20-point matches recover when reused deck cards meet at the top', () => {
  const match=createMatch({winTarget:20,symbolCount:8});
  const duplicate=match.hands[0][0];
  match.hands[1][0]=duplicate;
  const counts=match.hands.map(hand=>hand.length);
  const [a,b]=currentPair(match);
  assert.equal(a.filter(id=>b.includes(id)).length,1);
  assert.deepEqual(match.hands.map(hand=>hand.length),counts);
  assert.notEqual(match.hands[0][0],match.hands[1][0]);
});

test('invalid saved options fall back safely and independent symbol poses span all orientations', () => {
  assert.deepEqual(normalizeSetup({ parrot: '__proto__', rule: 'constructor', symbolCount: 9, rotating: 'true' }),
    { parrot: 'kofen', rule: 'empty', symbolCount: 6, winTarget: 10, rotating: false });
  assert.equal(normalizeSetup({ symbolCount: 3.2 }).symbolCount, 6);
  for (const winTarget of [0,6,'5',null]) assert.equal(normalizeSetup({winTarget}).winTarget,10);
  for (const winTarget of [5,10,15,20]) assert.equal(normalizeSetup({winTarget}).winTarget,winTarget);
  assert.equal(symbolPoses(6, () => 0)[0].angle, 0);
  assert.equal(symbolPoses(6, () => .99999)[0].angle, 359);
  const poses = symbolPoses();
  assert.ok(poses.every(pose => pose.size >= .64 && pose.size <= 1.38));
  assert.ok(new Set(poses.map(pose => pose.angle)).size > 1);
});

test('all symbol counts fit the hexagon with varied sizes and independent placement', () => {
  let seed = 8129;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let eightSymbolArea = 0;
  let eightSymbolEdgeGap = 0;
  for (let count = 3; count <= 8; count++) for (let deal = 0; deal < 50; deal++) {
    const artwork = Array.from({ length: count }, (_, index) => {
      const id = (deal + index) % symbolRects.length;
      return [...symbolRects[id], symbolOutlines[id]];
    });
    const poses = symbolPoses(count, random, artwork);
    assert.equal(poses.length, count);
    assert.ok(Math.max(...poses.map(pose => pose.size)) / Math.min(...poses.map(pose => pose.size)) > 1.7);
    // Flat top and bottom match the actual card assets, inside .card-symbols.
    const edge = [[36,5],[64,5],[95,27.5],[95,70],[59,98],[40,98],[5,70],[5,27.5]];
    const extents = poses.map(pose => Math.max(pose.width, pose.height) * pose.size);
    assert.ok(Math.max(...extents) / Math.min(...extents) > 1.7, 'visible artwork retains a clear size hierarchy');
    for (let first = 0; first < count; first++) for (let second = first + 1; second < count; second++) {
      const a = poses[first].corners, b = poses[second].corners;
      const separated = [a, b].some(polygon => polygon.some(([x,y], index) => {
        const [nx,ny] = polygon[(index + 1) % polygon.length];
        const dx = ny-y, dy = x-nx;
        if (Math.hypot(dx, dy) < 1e-8) return false;
        const pa = a.map(([px,py]) => px*dx+py*dy), pb = b.map(([px,py]) => px*dx+py*dy);
        return Math.max(...pa) <= Math.min(...pb) + 1e-8 || Math.max(...pb) <= Math.min(...pa) + 1e-8;
      }));
      assert.ok(separated, 'growing and nudging symbols never overlaps their reserved artwork');
    }
    if (count === 8) eightSymbolArea += poses.reduce((sum, pose) => sum + Math.abs(pose.corners.reduce((area, [x,y], index) => {
      const [nx,ny] = pose.corners[(index + 1) % pose.corners.length];
      return area + x*ny-nx*y;
    }, 0)) / 2, 0);
    if (count === 8) {
      const largestEdgeGap = Math.max(...edge.map(([ax,ay], index) => {
        const [bx,by] = edge[(index + 1) % edge.length];
        return Math.min(...poses.flatMap(pose => pose.corners.map(([x,y]) =>
          ((bx-ax)*(y-ay)-(by-ay)*(x-ax))/Math.hypot(bx-ax,by-ay))));
      }));
      assert.ok(largestEdgeGap < 12, 'eight-symbol deals reach every edge instead of clustering in the center');
      eightSymbolEdgeGap += largestEdgeGap;
    }
    for (const pose of poses) for (const [x,y] of pose.corners) {
      for (let i = 0; i < edge.length; i++) {
        const [ax,ay] = edge[i], [bx,by] = edge[(i+1)%edge.length];
        assert.ok(((bx-ax)*(y-ay)-(by-ay)*(x-ax))/Math.hypot(bx-ax,by-ay) >= 1.599, 'consistent padding from every card edge');
      }
      assert.ok(x >= 5 && x <= 95 && y >= 5 && y <= 98);
    }
  }
  assert.ok(eightSymbolArea / 50 / 6678.5 > .5, 'eight-symbol deals use over half the card area on average');
  assert.ok(eightSymbolEdgeGap / 50 < 6, 'the outer band stays filled across different eight-symbol deals');
});

test('saved cardCount preferences migrate to the corrected symbol-count selection', () => {
  assert.equal(normalizeSetup({cardCount:8}).symbolCount, 8);
  assert.equal(normalizeSetup({symbolCount:3,cardCount:8}).symbolCount, 3);
});
