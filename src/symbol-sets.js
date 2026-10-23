import { symbols } from './icons.js';
import { symbolOutlines } from './symbol-outlines.js';
import { themedSymbols } from './themed-symbols.js';

export const classicSymbolRects = [
  [40,58,171,163],[265,47,154,186],[446,66,231,150],[708,58,151,176],
  [901,65,196,161],[1118,46,198,196],[1352,57,170,176],[1559,69,188,158],
  [45,258,167,196],[263,261,169,180],[467,262,193,171],[685,269,193,181],
  [907,297,201,134],[1140,267,165,180],[1349,253,167,196],[1572,283,172,143],
  [40,459,160,199],[227,490,217,156],[496,453,125,195],[684,469,223,181],
  [928,454,152,198],[1114,491,204,149],[1341,496,188,149],[1569,459,169,202],
  [52,667,130,188],[240,675,188,170],[472,665,170,189],[687,677,174,172],
  [899,677,195,166],[1163,668,118,199],[1342,682,186,162],
];

const classic = {
  key: 'classic', file: 'symbols-atlas-v14.webp', width: 1774, height: 887,
  rects: classicSymbolRects, outlines: symbolOutlines, names: symbols.map(symbol => symbol.name),
};
const themed = Object.fromEntries(Object.entries(themedSymbols).map(([key, set]) => [key, { key, ...set }]));

export function getSymbolSet(key) {
  return Object.hasOwn(themed, key) ? themed[key] : classic;
}
