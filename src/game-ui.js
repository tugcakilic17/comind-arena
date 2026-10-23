import { baseUrl } from './assets.js';
import { playerPortraitUrl } from './player-avatar.js';
import { getSymbolSet, classicSymbolRects } from './symbol-sets.js';

// Source rectangles follow the opaque artwork, so neighboring sprites never leak into a card.
const controlAssets = {
  back: 'back-hd-v15.webp', sound: 'sound-on-hd-v15.webp', muted: 'sound-off-hd-v15.webp',
  pause: 'pause-hd-v15.webp', play: 'play-hd-v15.webp', time: 'stopwatch-hd-v15.webp',
  spark: 'spark-hd-v16.webp', check: 'check-hd-v16.webp', cross: 'cross-hd-v16.webp',
};
export const symbolRects = classicSymbolRects;

function spriteStyle([x, y, width, height], atlasWidth, atlasHeight) {
  const padding = 2;
  x -= padding; y -= padding; width += padding * 2; height += padding * 2;
  return `background-size:${atlasWidth / width * 100}% ${atlasHeight / height * 100}%;background-position:${x / (atlasWidth - width) * 100}% ${y / (atlasHeight - height) * 100}%`;
}

export function gameIcon(name, className = 'game-inline-icon') {
  return `<img class="game-control-asset ${className}" src="${baseUrl}assets/game-ui/${controlAssets[name] || controlAssets.spark}" alt="" width="1024" height="1024" draggable="false" aria-hidden="true" />`;
}

export function rankingPointArt() {
  return `<img class="ranking-point-art" src="${baseUrl}assets/game-ui/spark-hd-v16.png" alt="" width="1254" height="1254" draggable="false" aria-hidden="true" />`;
}

export function gameSymbol(id, fitted = false, setKey = 'classic') {
  const set = getSymbolSet(setKey);
  const rect = set.rects[id];
  const extent = Math.max(rect[2], rect[3]) + 4;
  return `<span class="game-symbol" aria-hidden="true"><span class="game-symbol-art" style="background-image:url('${baseUrl}assets/game-ui/${set.file}');width:${fitted ? 90 : (rect[2] + 4) / extent * 90}%;height:${fitted ? 90 : (rect[3] + 4) / extent * 90}%;${spriteStyle(rect, set.width, set.height)}"></span></span>`;
}

// A fixed source viewport keeps small, animated previews independent of
// fractional CSS background sizing. The original atlas supplies every pixel.
let previewSymbolId = 0;
export function previewSymbol(id) {
  const [x, y, width, height] = symbolRects[id];
  const clipId = `preview-symbol-${++previewSymbolId}`;
  return `<span class="game-symbol" aria-hidden="true"><svg class="game-symbol-preview" viewBox="${x - 2} ${y - 2} ${width + 4} ${height + 4}" preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true"><defs><clipPath id="${clipId}"><rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" /></clipPath></defs><image href="${baseUrl}assets/game-ui/symbols-atlas-v14.webp" width="1774" height="887" clip-path="url(#${clipId})" /></svg></span>`;
}

// Display each complete PNG surface; only transparent canvas margins are normalized.
const surfaces = {
  scoreboard: ['scoreboard-strip-hd-v16.webp', 2172, 724, 49, 193, 2074, 324],
  woodenStage: ['wooden-stage-v22.webp', 2178, 722, 20, 170, 2138, 455],
  seaPierWide: ['sea-pier-wide-v2.webp', 2172, 724, 0, 210, 2172, 360],
  seaPierCompact: ['sea-pier-compact-v2.webp', 2172, 724, 0, 200, 2172, 430],
  resultPanel: ['result-panel-v28.webp', 1394, 1128, 24, 80, 1346, 988],
};

// Include later poses and controls so the first celebration/pause is ready too.
export const gameAssets = [
  ...Object.entries(controlAssets).filter(([name]) => name !== 'spark').map(([, file]) => `${baseUrl}assets/game-ui/${file}`),
  ...['scoreboard', 'woodenStage', 'resultPanel'].map(name => `${baseUrl}assets/game-ui/${surfaces[name][0]}`),
  ...['symbols-atlas-v14', 'forest-calm-warm-v23', 'card-lavender-leafy-v21', 'card-mint-paired-v21',
    'kofen-idle-v26', 'kofen-cheer-v26', 'title-find-leafy-v17',
    'leave-mascot-v38'].map(name => `${baseUrl}assets/game-ui/${name}.webp`),
  playerPortraitUrl(), playerPortraitUrl('cheer'),
];
export const seaPierAssets = ['seaPierWide', 'seaPierCompact'].map(name => `${baseUrl}assets/game-ui/${surfaces[name][0]}`);

export function gameSurface(name) {
  const [file, width, height, x, y, artWidth, artHeight] = surfaces[name];
  return `<span class="game-surface surface-${name}" aria-hidden="true"><img src="${baseUrl}assets/game-ui/${file}" alt="" draggable="false" style="width:${width / artWidth * 100}%;height:${height / artHeight * 100}%;left:${-x / artWidth * 100}%;top:${-y / artHeight * 100}%" /></span>`;
}
