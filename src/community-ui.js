import { gameSurface } from './game-ui.js';
import { icon } from './icons.js';

export function inviteView() {
  return `${gameSurface('resultPanel')}<div class="community-content">
    <span class="community-emblem invite-emblem" aria-hidden="true">${icon('link')}</span>
    <h2 id="modal-title">Arkadaşını çağır</h2>
    <p id="community-description">Farklı cihazlardan davet bağlantısıyla oynama yakında burada olacak.</p>
    <span class="community-soon">Yakında</span>
    <div class="invite-alternative"><h3>Şimdi birlikte oynayabilirsiniz!</h3><p>Şimdilik arkadaşınla aynı cihazda yan yana oynayabilirsin.</p></div>
    <button type="button" class="leave-continue community-ready" data-action="mode" data-mode="local">${icon('playSolid')}<span>Yan yana oynayalım</span></button>
    <button type="button" class="text-button community-dismiss" data-action="close">Ana ekrana dön</button>
  </div>`;
}
