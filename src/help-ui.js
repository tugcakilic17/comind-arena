import { gameIcon, gameSurface, previewSymbol } from './game-ui.js';
import { icon, symbols } from './icons.js';
import { baseUrl } from './assets.js';

// A passive example reuses the real cards, symbols and match movement.
const practicePair = [[0, 28, 22, 19, 11, 8], [5, 12, 21, 27, 19, 3]];
const practiceMatch = 19;

function practiceCard(ids, ownCard) {
  const items = ids.map((id, index) => {
    const content = previewSymbol(id);
    const matched = id === practiceMatch;
    return `<span class="help-symbol help-pos-${index}${matched ? ' is-match' : ''}" data-help-symbol="${id}" role="img" aria-label="${symbols[id].name}${matched ? ' — iki karttaki ortak simge' : ''}">${content}</span>`;
  }).join('');
  return `<div class="help-card-group"><span class="help-card-label${ownCard ? '' : ' is-opponent'}">${ownCard ? 'Senin kartın' : 'Diğer kart'}</span>
    <div class="help-card${ownCard ? '' : ' is-opponent'}" role="group" aria-label="${ownCard ? 'Senin kartın' : 'Diğer kart'}">
    <img class="help-card-art" src="${baseUrl}assets/game-ui/${ownCard ? 'card-lavender-leafy-v21.webp' : 'card-mint-paired-v21.webp'}" alt="" draggable="false" />${items}</div></div>`;
}

export function helpView() {
  return `${gameSurface('resultPanel')}
    <img class="leave-mascot help-mascot" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" width="1536" height="1024" draggable="false" aria-hidden="true" />
    <div class="help-content">
      <h2 id="modal-title">Nasıl oynanır?</h2>
      <p class="help-description" id="help-description">İki kartta da aynı olan simgeyi bul!</p>
      <div class="help-practice" role="group" aria-label="Eşleşme örneği: iki kartta da balina var.">${practicePair.map((ids, index) => practiceCard(ids, index === 0)).join('')}</div>
      <div class="help-rules"><div class="help-limits"><span>${gameIcon('spark')}10 tur</span><i aria-hidden="true"></i><span>${gameIcon('time')}90 saniye</span></div>
      <p>En çok eşleşmeyi bulan kazanır!</p>
      <p class="help-together">Yan yana oynarken herkes kendi kartına dokunur.</p></div>
      <button type="button" class="leave-continue help-ready" data-action="close">${icon('playSolid')}<span>Tamam, hazırım!</span></button>
    </div>`;
}
