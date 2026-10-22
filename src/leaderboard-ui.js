import { gameSurface } from './game-ui.js';
import { icon } from './icons.js';
import { baseUrl } from './assets.js';

// Preview data only. Competitive scores will come from the backend later.
const names = ['OrmanKaşifi', 'MinikDahi', 'NeşeliPapağan', 'YıldızAvcısı', 'FındıkKurdu',
  'MaviKanat', 'MeraklıBaykuş', 'GüneşTozu', 'HızlıPati', 'BalPeteği',
  'Kozalak', 'BulutGezgini', 'ZıpZıp', 'YeşilYaprak', 'Sen',
  'Pofuduk', 'KüçükGezgin', 'ÇilekŞekeri', 'KıpırKıpır', 'AyIşığı',
  'Çınar', 'RenkliKanat', 'UçanTohum', 'MinikMucit', 'Tarçın',
  'DenizYıldızı', 'MutluKirpi', 'Kelebek', 'ŞenPalamut', 'PamukBulut'];
export const demoPlayers = names.map((name, index) => ({
  name, rank: index + 1, score: 4200 - index * 95 - index % 3 * 7, isSelf: index === 14,
}));
export const visibleRanks = 9;
const selfIndex = demoPlayers.findIndex(player => player.isSelf);
const number = new Intl.NumberFormat('tr-TR');

export function leaderboardStart(current = 0, action = 'self') {
  const max = Math.max(0, demoPlayers.length - visibleRanks);
  const next = ({ first: 0, up: current - 1, down: current + 1, last: max, self: selfIndex - 4 })[action] ?? current;
  return Math.max(0, Math.min(max, next));
}

function rows(start) {
  return demoPlayers.slice(start, start + visibleRanks).map(player => `<tr class="ranking-row${player.isSelf ? ' is-self' : ''}" data-rank="${player.rank}"${player.isSelf ? ' aria-current="true"' : ''}>
    <th scope="row"><span class="ranking-place${player.rank <= 3 ? ` medal-${player.rank}` : ''}">${player.rank <= 3 ? icon('trophy') : ''}<span>${player.rank}</span></span></th>
    <td><span class="ranking-player"><span class="ranking-avatar avatar-color-${player.rank % 5}" aria-hidden="true">${player.isSelf ? `<img src="${baseUrl}assets/game-ui/player-idle-v27.webp" alt="" draggable="false" />` : player.name[0]}</span><span class="ranking-name">${player.name}</span>${player.isSelf ? '<span class="ranking-you">Sensin!</span>' : ''}</span></td>
    <td class="ranking-points">${number.format(player.score)}</td>
  </tr>`).join('');
}

function arrow(kind) {
  const up = kind === 'first' || kind === 'up';
  const double = kind === 'first' || kind === 'last';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${up ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'}"/>${double ? `<path d="${up ? 'M6 5h12' : 'M6 19h12'}"/>` : ''}</svg>`;
}

function navButton(action, label, start) {
  const disabled = ['first', 'up'].includes(action) ? start === 0 : start === demoPlayers.length - visibleRanks;
  return `<button type="button" class="ranking-nav-button" data-action="ranking" data-rank-nav="${action}" aria-controls="ranking-rows" aria-label="${({ first: 'İlk sıraya git', up: 'Bir sıra yukarı', down: 'Bir sıra aşağı', last: 'Son sıraya git' })[action]}"${disabled ? ' disabled' : ''}><span class="ranking-nav-icon" aria-hidden="true">${arrow(action)}</span><span>${label}</span></button>`;
}

export function leaderboardView() {
  const start = leaderboardStart();
  return `${gameSurface('resultPanel')}<img class="leave-mascot leaderboard-mascot" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" draggable="false" aria-hidden="true" />
    <div class="leaderboard-content" data-rank-start="${start}">
      <div class="leaderboard-heading"><h2 id="modal-title">Liderlik tablosu</h2><p id="community-description">Ormanın eşleştirme yıldızları</p></div>
      <div class="ranking-summary"><span class="ranking-demo">Örnek sıralama <span class="ranking-demo-count">· 30 oyuncu</span></span><button type="button" class="ranking-self-link" data-action="ranking" data-rank-nav="self" aria-label="Sıramı göster, 15. sıradayım" aria-controls="ranking-rows">${icon('user')}<span>15. sıradasın</span><span class="ranking-self-hint">Sıramı göster</span></button></div>
      <nav class="ranking-navigation ranking-top" aria-label="Üst sıralara git">${navButton('first', 'En üste', start)}${navButton('up', 'Yukarı', start)}<span class="ranking-range" aria-hidden="true">${start + 1}–${start + visibleRanks} / ${demoPlayers.length}</span></nav>
      <table class="ranking-table" aria-label="Örnek oyuncu sıralaması"><thead><tr><th scope="col">Sıra</th><th scope="col">Oyuncu</th><th scope="col">Puan</th></tr></thead><tbody id="ranking-rows">${rows(start)}</tbody></table>
      <nav class="ranking-navigation ranking-bottom" aria-label="Alt sıralara git">${navButton('down', 'Aşağı', start)}${navButton('last', 'En alta', start)}</nav>
      <p class="sr-only ranking-announcement" role="status" aria-live="polite" aria-atomic="true">${start + 1}–${start + visibleRanks}. sıralar gösteriliyor. Sen 15. sıradasın.</p>
      <div class="ranking-footer"><button type="button" class="community-ready leaderboard-ready" data-action="close"><span class="ranking-home-badge" aria-hidden="true">${icon('homeSolid')}</span><span>Ana ekrana dön</span></button></div>
    </div>`;
}

export function updateLeaderboard(dialog, action) {
  const content = dialog.querySelector('.leaderboard-content');
  if (!content) return;
  const start = leaderboardStart(Number(content.dataset.rankStart), action);
  content.dataset.rankStart = start;
  dialog.querySelector('#ranking-rows').innerHTML = rows(start);
  dialog.querySelector('#ranking-rows').scrollTop = 0;
  dialog.querySelector('.ranking-range').textContent = `${start + 1}–${start + visibleRanks} / ${demoPlayers.length}`;
  dialog.querySelector('.ranking-announcement').textContent = `${start + 1}–${start + visibleRanks}. sıralar gösteriliyor. Sen 15. sıradasın.`;
  dialog.querySelectorAll('[data-rank-nav]').forEach(button => {
    const direction = button.dataset.rankNav;
    button.disabled = ['first', 'up'].includes(direction) ? start === 0 : ['last', 'down'].includes(direction) && start === demoPlayers.length - visibleRanks;
  });
  // A boundary can disable the pressed button; keep keyboard focus in the panel.
  if (document.activeElement?.matches('[data-rank-nav]:disabled') || !dialog.contains(document.activeElement)) {
    dialog.querySelector('[data-rank-nav="self"]').focus({ preventScroll: true });
  }
}
