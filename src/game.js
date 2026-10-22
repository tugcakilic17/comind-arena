// A projective plane of order 5 gives 31 cards, with 6 symbols per card.
// Every pair of different cards has exactly one shared symbol.
export function createDeck(order = 5) {
  if (order !== 5) throw new Error('Bu deste 5. dereceden düzlem için hazırlanmıştır.');
  const deck = [];
  for (let a = 0; a < order; a++) {
    for (let b = 0; b < order; b++) {
      deck.push(Array.from({ length: order }, (_, x) => x * order + ((a * x + b) % order)).concat(order * order + a));
    }
  }
  for (let x = 0; x < order; x++) {
    deck.push(Array.from({ length: order }, (_, y) => x * order + y).concat(order * order + order));
  }
  deck.push(Array.from({ length: order + 1 }, (_, i) => order * order + i));
  return deck;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getPair(deck, random = Math.random) {
  const first = Math.floor(random() * deck.length);
  let second = Math.floor(random() * (deck.length - 1));
  if (second >= first) second++;
  return [shuffle(deck[first], random), shuffle(deck[second], random)];
}

export function sharedSymbol(pair) {
  return pair[0].find(symbol => pair[1].includes(symbol));
}

export function readScores(storage) {
  try {
    const rows = JSON.parse(storage.getItem('comind.scores.v1') || '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter(row => row && typeof row.name === 'string' && row.name.length <= 30
      && Number.isInteger(row.score) && row.score >= 0 && row.score <= 10
      && Number.isInteger(row.opponent) && row.opponent >= 0 && row.opponent <= 10
      && ['solo', 'local'].includes(row.mode) && ['easy', 'normal', 'fast'].includes(row.difficulty)
      && typeof row.date === 'string').slice(0, 50);
  } catch { return []; }
}

export function storeScore(storage, row) {
  try {
    const rows = [...readScores(storage), row]
      .sort((a, b) => b.score - a.score || a.opponent - b.opponent || b.date.localeCompare(a.date)).slice(0, 50);
    storage.setItem('comind.scores.v1', JSON.stringify(rows));
    return true;
  } catch { return false; }
}
