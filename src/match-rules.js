import { createDeck, shuffle, sharedSymbol } from './game.js';

export const parrots = {
  koak: { name: 'Koak', image: 'koak-v1.webp', idle: 'characters/koak-idle-v2.webp', cheer: 'characters/koak-cheer-v2.webp', color: '#1f86b0', wash: '#e7f6fd' },
  komat: { name: 'Komat', image: 'komat-v1.webp', idle: 'game-ui/player-idle-v26.png', cheer: 'game-ui/player-cheer-v26.png', color: '#ce5b4d', wash: '#fff0e9' },
  kofen: { name: 'Kofen', image: 'kofen-v1.webp', idle: 'game-ui/kofen-idle-v26.webp', cheer: 'game-ui/kofen-cheer-v26.webp', color: '#648b3e', wash: '#eef6dc' },
  kuik: { name: 'Kuik', image: 'kuik-v1.webp', idle: 'characters/kuik-idle-v2.webp', cheer: 'characters/kuik-cheer-v2.webp', color: '#cb792b', wash: '#fff4db' },
};
export const rules = {
  empty: { name: 'Elini Bitir', hint: 'Kendi kartındaki ortak simgeyi bul, kartını rakibine gönder.' },
  collect: { name: 'Kart Topla', hint: 'Rakibinin kartındaki ortak simgeyi bul, kartı kendine al.' },
};
export const winTargets = [5, 10, 15, 20];
export const defaultSetup = { parrot: 'kofen', symbolCount: 6, winTarget: 10, rule: 'empty', rotating: false };

export function normalizeSetup(value) {
  return {
    parrot: Object.hasOwn(parrots, value?.parrot) ? value.parrot : defaultSetup.parrot,
    symbolCount: Number.isInteger(value?.symbolCount ?? value?.cardCount) && (value.symbolCount ?? value.cardCount) >= 3 && (value.symbolCount ?? value.cardCount) <= 8 ? (value.symbolCount ?? value.cardCount) : defaultSetup.symbolCount,
    winTarget: winTargets.includes(value?.winTarget) ? value.winTarget : defaultSetup.winTarget,
    rule: Object.hasOwn(rules, value?.rule) ? value.rule : defaultSetup.rule,
    rotating: false,
  };
}

export function createMatch(options, random = Math.random) {
  const setup = normalizeSetup(options);
  const symbolPoolSize = options?.symbolPoolSize ?? 31;
  if (!Number.isInteger(symbolPoolSize) || symbolPoolSize < 2 * setup.symbolCount - 1 || symbolPoolSize > 31) {
    throw new RangeError('Simge havuzu, iki kartta yalnızca bir ortak simge bırakacak kadar büyük olmalı.');
  }
  const deck = createDeck(), cards = [];
  while (cards.length < setup.winTarget * 2) cards.push(...shuffle(deck, random));
  return { ...setup, symbolPoolSize, hands: [cards.slice(0, setup.winTarget), cards.slice(setup.winTarget, setup.winTarget * 2)], scores: [0, 0], winners: [] };
}

export function currentPair(match, random = Math.random) {
  // Large targets reuse deck cards. Keep the two visible cards distinct, even
  // after transfers, so there is always exactly one shared symbol.
  if (match.hands[0][0] && match.hands[0][0] === match.hands[1][0]) {
    const hand = match.hands.find(hand => hand.some(card => card !== hand[0]));
    if (hand) {
      const index = hand.findIndex(card => card !== hand[0]);
      [hand[0], hand[index]] = [hand[index], hand[0]];
    }
  }
  let pair = match.hands.map(hand => shuffle(hand[0] || [], random));
  if (pair.some(card => !card.length)) return pair;
  const shared = sharedSymbol(pair);
  const count = match.symbolCount;
  if (count < 6) pair = pair.map(card => [shared, ...card.filter(id => id !== shared).slice(0, count - 1)]);
  if (count > 6) {
    const unused = shuffle(Array.from({ length: 31 }, (_, id) => id).filter(id => !pair.flat().includes(id)), random);
    pair.forEach((card, index) => card.push(...unused.slice(index * (count - 6), (index + 1) * (count - 6))));
  }
  // Map this visible pair injectively into a smaller themed pool. Both copies
  // of the shared symbol keep the same image; every other image stays unique.
  if (match.symbolPoolSize < 31) {
    const available = shuffle(Array.from({ length: match.symbolPoolSize }, (_, id) => id), random);
    const mapping = new Map([...new Set(pair.flat())].map((id, index) => [id, available[index]]));
    pair = pair.map(card => card.map(id => mapping.get(id)));
  }
  return pair.map(card => shuffle(card, random));
}

export function transferCard(match, player) {
  if (![0, 1].includes(player) || matchComplete(match) || match.hands.some(hand => !hand.length)) return null;
  const from = match.rule === 'collect' ? 1 - player : player;
  const to = 1 - from;
  const card = match.hands[from].shift();
  match.hands[to].push(card);
  match.scores[player]++;
  match.winners.push(player);
  return { from, to };
}

export function matchWinner(match) {
  if (match.scores[0] === match.scores[1]) return null;
  return match.scores[0] > match.scores[1] ? 0 : 1;
}

export function matchComplete(match) {
  return match.scores.some(score => score >= match.winTarget);
}

// Measured inside both card assets, relative to .card-symbols (10% 7% 8%).
// The art has flat top/bottom edges: a pointed hexagon wastes those corners.
const face = [[36, 5], [64, 5], [95, 27.5], [95, 70], [59, 98], [40, 98], [5, 70], [5, 27.5]];
const edgePadding = 1.6;
const symbolScale = .92;
const symbolWidths = { 3: 46, 4: 41, 5: 45, 6: 41, 7: 37, 8: 35 };
const sizeTiers = {
  3: [.76, 1.02, 1.35],
  4: [.72, .91, 1.12, 1.35],
  5: [.70, .84, 1, 1.16, 1.35],
  6: [.68, .80, .93, 1.06, 1.20, 1.36],
  7: [.68, .78, .89, 1, 1.12, 1.24, 1.36],
  8: [.66, .75, .85, .95, 1.05, 1.15, 1.25, 1.36],
};
function footprint(pose, x, y, density) {
  const radians = pose.angle * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const w = pose.width * pose.size * density * .792 / 2 + 1.2;
  const h = pose.height * pose.size * density * .792 / 2 + 1.2;
  const outline = pose.outline || [[0,0],[1,0],[1,1],[0,1]];
  return outline.map(([u,v]) => {
    const dx = (u - .5) * w * 2, dy = (v - .5) * h * 2;
    return [x + dx * cos - dy * sin, y + dx * sin + dy * cos];
  });
}
function fitsFace(corners) {
  return corners.every(([x, y]) => face.every(([ax, ay], index) => {
    const [bx, by] = face[(index + 1) % face.length];
    return ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / Math.hypot(bx - ax, by - ay) >= edgePadding;
  }));
}
function overlaps(a, b) {
  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index++) {
      const [ax, ay] = polygon[index], [bx, by] = polygon[(index + 1) % polygon.length];
      const dx = by - ay, dy = ax - bx;
      if (Math.abs(dx) + Math.abs(dy) < 1e-8) continue;
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (let point = 0; point < a.length; point++) {
        const pa = a[point][0] * dx + a[point][1] * dy;
        minA = Math.min(minA, pa); maxA = Math.max(maxA, pa);
      }
      for (let point = 0; point < b.length; point++) {
        const pb = b[point][0] * dx + b[point][1] * dy;
        minB = Math.min(minB, pb); maxB = Math.max(maxB, pb);
      }
      if (maxA <= minB || maxB <= minA) return false;
    }
  }
  return true;
}

function polygonArea(corners) {
  return Math.abs(corners.reduce((area, [x, y], index) => {
    const [nx, ny] = corners[(index + 1) % corners.length];
    return area + x * ny - nx * y;
  }, 0)) / 2;
}

const coverageProbes = [];
for (let y = 10; y <= 90; y += 10) for (let x = 10; x <= 90; x += 10) {
  if (fitsFace([[x, y]])) coverageProbes.push([x, y]);
}
// Sample every edge as well as the interior. Balancing the centroid alone
// accepts a dense central cluster with an empty band around the whole card.
const edgeProbes = face.flatMap(([ax, ay], index) => {
  const [bx, by] = face[(index + 1) % face.length];
  return [.25, .5, .75].map(t => [
    50 + (ax + (bx - ax) * t - 50) * .86,
    51.5 + (ay + (by - ay) * t - 51.5) * .86,
  ]);
});
const allProbes = [...coverageProbes, ...edgeProbes];
const coverageCache = new WeakMap();
function distanceToPolygonSquared(x, y, corners) {
  let distance = Infinity, inside = true;
  for (let index = 0; index < corners.length; index++) {
    const [ax, ay] = corners[index], [bx, by] = corners[(index + 1) % corners.length];
    const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
    if (dx * (y - ay) - dy * (x - ax) < -1e-8) inside = false;
    const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
    distance = Math.min(distance, (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2);
  }
  return inside ? 0 : distance;
}
function compositionCost(layout) {
  const cx = layout.reduce((sum, pose) => sum + pose.x, 0) / layout.length;
  const cy = layout.reduce((sum, pose) => sum + pose.y, 0) / layout.length;
  // Only one pose changes in each trial; reuse the other symbols' coverage.
  const samples = layout.map(pose => {
    let sample = coverageCache.get(pose);
    if (!sample) {
      sample = { distances: allProbes.map(([x, y]) => distanceToPolygonSquared(x, y, pose.corners)), area: polygonArea(pose.corners) };
      coverageCache.set(pose, sample);
    }
    return sample;
  });
  let gaps = 0, worstGap = 0, edgeGaps = 0;
  for (let index = 0; index < allProbes.length; index++) {
    let nearest = Infinity;
    for (const sample of samples) nearest = Math.min(nearest, sample.distances[index]);
    if (index < coverageProbes.length) { gaps += nearest; worstGap = Math.max(worstGap, nearest); }
    else edgeGaps += nearest;
  }
  return gaps / coverageProbes.length * 8 + worstGap * 3 + edgeGaps / edgeProbes.length * 18
    + ((cx - 50) ** 2 + (cy - 51.5) ** 2) - samples.reduce((sum, sample) => sum + sample.area, 0);
}

// Expand each symbol into its own free space, nudging nearby positions instead
// of shrinking the entire card. Angles and the small/large hierarchy stay intact.
function fillLayout(layout) {
  const bases = layout.map(pose => ({ width: pose.width, height: pose.height }));
  const extent = pose => Math.max(pose.width, pose.height) * pose.size;
  const order = layout.map((_, index) => index).sort((a, b) => extent(layout[b]) - extent(layout[a]));
  const smallest = order.at(-1);
  const sizeRatio = extent(layout[order[0]]) / extent(layout[smallest]);
  let cost = compositionCost(layout);
  // Spread first, then grow: enlarging immediately can lock a central cluster
  // in place before any symbol has a chance to reach an empty outer region.
  for (const [radius, grow] of [[9, false], [6, false], [4, true], [2, true], [1, true]]) {
    for (const index of order) {
      const original = layout[index], base = bases[index];
      let best = original, bestCost = cost;
      let limit = grow ? 1.35 : original.width / base.width;
      if (index === smallest) {
        const largest = Math.max(...layout.map(extent));
        limit = Math.min(limit, largest / sizeRatio / (Math.max(base.width, base.height) * original.size));
      }
      for (let direction = -1; direction < 8; direction++) {
        const angle = direction * Math.PI / 4;
        const x = original.x + (direction < 0 ? 0 : Math.cos(angle) * radius);
        const y = original.y + (direction < 0 ? 0 : Math.sin(angle) * radius);
        const fits = corners => fitsFace(corners) && layout.every((other, otherIndex) =>
          otherIndex === index || !overlaps(corners, other.corners));
        const pose = { ...original, x, y };
        let corners = footprint(pose, x, y, 1);
        if (!fits(corners)) continue;
        let low = original.width / base.width, high = Math.max(low, limit);
        for (let step = 0; step < 7; step++) {
          const growth = (low + high) / 2;
          const trial = footprint({ ...pose, width: base.width * growth, height: base.height * growth }, x, y, 1);
          if (fits(trial)) { low = growth; corners = trial; } else high = growth;
        }
        Object.assign(pose, { width: base.width * low, height: base.height * low, corners });
        layout[index] = pose;
        const candidateCost = compositionCost(layout);
        if (candidateCost < bestCost) { best = pose; bestCost = candidateCost; }
        layout[index] = original;
      }
      layout[index] = best;
      cost = bestCost;
    }
  }
  // Apply the final size after packing so free-space growth cannot undo it.
  // Keeping centers fixed preserves the spread across the card's full face.
  return layout.map(pose => {
    const resized = { ...pose, width: pose.width * symbolScale, height: pose.height * symbolScale };
    return { ...resized, corners: footprint(resized, resized.x, resized.y, 1) };
  });
}

export function symbolPoses(count = 6, random = Math.random, artwork = []) {
  if (!Number.isInteger(count) || count < 3 || count > 8) throw new Error('Simge sayısı 3–8 arasında olmalı.');
  const sizes = shuffle(sizeTiers[count], random);
  const poses = sizes.map((size, index) => {
    const [, , width = 100, height = 100, outline] = artwork[index] || [];
    const extent = Math.max(width, height);
    return { angle: Math.floor(random() * 360), size: size + (random() - .5) * .024,
      width: symbolWidths[count] * width / extent,
      height: symbolWidths[count] * height / extent * 1.008, outline };
  });
  const order = poses.map((pose, index) => index).sort((a,b) => poses[b].size - poses[a].size);
  let bestLayout;
  let bestScore = Infinity;
  let complete = 0;
  for (let attempt = 0; attempt < 400; attempt++) {
    const placed = [];
    const density = 1.04 - Math.floor(attempt / 24) * .04;
    for (let position = 0; position < order.length; position++) {
      const pose = poses[order[position]];
      let best;
      for (let candidate = 0; candidate < 100; candidate++) {
        // Generate a legal arrangement, then compare complete compositions
        // for balance and even whitespace instead of accepting the first one.
        const x = 5 + 90 * ((random() + candidate * .61803398875 + attempt * .173) % 1);
        const y = 5 + 93 * ((random() + candidate * .41421356237 + attempt * .271) % 1);
        const corners = footprint(pose, x, y, density);
        if (!fitsFace(corners) || placed.some(other => overlaps(corners, other))) continue;
        best = { x, y, corners }; break;
      }
      if (best) { Object.assign(pose, best); placed.push(best.corners); }
      if (placed.length !== position + 1) break;
    }
    if (placed.length === count) {
      const result = poses.map(pose => ({ ...pose, width: pose.width * density, height: pose.height * density }));
      const score = compositionCost(result) + (1.04 - density) * 6000;
      if (score < bestScore) { bestLayout = result; bestScore = score; }
      if (++complete >= 5) return fillLayout(bestLayout);
    }
  }
  if (bestLayout) return fillLayout(bestLayout);
  throw new Error('Simgeler kart yüzeyine yerleştirilemedi.');
}
