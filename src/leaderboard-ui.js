import { gameSurface, rankingPointArt } from './game-ui.js';
import { icon } from './icons.js';
import { baseUrl } from './assets.js';
import { playerPortraitUrl } from './player-avatar.js';
import { api, escapeHtml as esc } from './api.js';

export const visibleRanks = 9;
export function leaderboardStart(current = 0, action = 'self', total = 0, selfRank = 0) {
  const max = Math.max(0, total - visibleRanks);
  const next = ({ first: 0, up: current - 1, down: current + 1, last: max, self: Math.max(0, selfRank - 5) })[action] ?? current;
  return Math.max(0, Math.min(max, next));
}
const number = new Intl.NumberFormat('tr-TR');
const views = new WeakMap();
function rows(players) {
  return players.map(player => `<tr class="ranking-row${player.isSelf ? ' is-self' : ''}" data-rank="${player.rank}"${player.isSelf ? ' aria-current="true"' : ''}>
    <th scope="row"><span class="ranking-place${player.rank <= 3 ? ` medal-${player.rank}` : ''}">${player.rank <= 3 ? icon('trophy') : ''}<span>${player.rank}</span></span></th>
    <td><span class="ranking-player"><span class="ranking-avatar avatar-color-${player.rank % 5}" aria-hidden="true">${player.isSelf ? `<img data-player-avatar="idle" src="${playerPortraitUrl()}" alt="" draggable="false" />` : esc(Array.from(player.name)[0])}</span><span class="ranking-name">${esc(player.name)}</span>${player.isSelf ? '<span class="ranking-you">Sensin!</span>' : ''}</span></td>
    <td class="ranking-points">${number.format(player.score)}</td></tr>`).join('');
}
function nav(action, label) {
  return `<button type="button" class="ranking-nav-button" data-action="ranking" data-rank-nav="${action}" aria-controls="ranking-rows" disabled><span>${label}</span></button>`;
}
export function leaderboardView() {
  return `${gameSurface('resultPanel')}<img class="leave-mascot leaderboard-mascot" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" draggable="false" aria-hidden="true" />
    <div class="leaderboard-content" data-empty="true"><div class="leaderboard-heading"><h2 id="modal-title">Liderlik tablosu</h2><p id="community-description">Oyunun yıldızları</p></div>
    <div class="ranking-summary"><span class="ranking-demo">Oyuncular yükleniyor…</span><button type="button" class="ranking-self-link" data-action="ranking" data-rank-nav="self">${icon('user')}<span>Sıramı göster</span></button></div>
    <nav class="ranking-navigation ranking-top" aria-label="Üst sıralara git">${nav('first', 'En üste')}${nav('up', 'Yukarı')}<span class="ranking-range"></span></nav>
    <p class="ranking-status" role="status" aria-live="polite">Sıralama yükleniyor…</p>
    <table class="ranking-table" aria-label="Oyuncu sıralaması"><thead><tr><th scope="col">Sıra</th><th scope="col">Oyuncu</th><th scope="col"><span class="ranking-points-label">${rankingPointArt()}Puan</span></th></tr></thead><tbody id="ranking-rows"></tbody></table>
    <nav class="ranking-navigation ranking-bottom" aria-label="Alt sıralara git">${nav('down', 'Aşağı')}${nav('last', 'En alta')}</nav>
    <button type="button" class="text-button ranking-retry" data-action="ranking" data-rank-nav="retry" hidden>Yeniden dene</button>
    <div class="ranking-footer"><button type="button" class="community-ready leaderboard-ready" data-action="close"><span class="ranking-home-badge" aria-hidden="true">${icon('homeSolid')}</span><span>Ana ekrana dön</span></button></div></div>`;
}
export async function updateLeaderboard(dialog, action = 'self') {
  const content = dialog?.querySelector('.leaderboard-content');
  if (!content) return;
  const previous = views.get(content) || { start: 0, total: 0, self: null, request: 0 };
  const request = previous.request + 1;
  views.set(content, { ...previous, request });
  const start = leaderboardStart(previous.start, action, previous.total, previous.self?.rank);
  content.setAttribute('aria-busy', 'true');
  const status = content.querySelector('.ranking-status');
  try {
    const data = await api(`arena/leaderboard?start=${start}${action === 'self' ? '&center=self' : ''}`);
    if (!content.isConnected || views.get(content)?.request !== request) return;
    views.set(content, { ...data, request });
    content.dataset.empty = String(data.total === 0);
    content.querySelector('#ranking-rows').innerHTML = rows(data.players);
    content.querySelector('.ranking-demo').textContent = `${data.total} oyuncu`;
    content.querySelector('.ranking-self-link span').textContent = data.self ? `${data.self.rank}. sıradasın · ${number.format(data.self.score)} puan` : 'Henüz sıralama puanın yok';
    content.querySelector('.ranking-range').textContent = data.total ? `${data.start + 1}–${data.start + data.players.length} / ${data.total}` : '0 oyuncu';
    status.textContent = data.total ? '' : 'İlk arkadaş maçını oyna, liderlik tablosuna katıl!';
    content.querySelector('.ranking-retry').hidden = true;
    content.querySelectorAll('[data-rank-nav]').forEach(button => {
      const direction = button.dataset.rankNav;
      button.disabled = direction === 'self' ? !data.self : ['first','up'].includes(direction) ? data.start === 0 : ['down','last'].includes(direction) && data.start >= Math.max(0, data.total - visibleRanks);
    });
    if (document.activeElement?.matches('[data-rank-nav]:disabled')) content.querySelector('[data-action="close"]').focus();
  } catch (error) {
    if (!content.isConnected || views.get(content)?.request !== request) return;
    status.textContent = error.message;
    content.dataset.empty = 'true';
    content.querySelector('.ranking-retry').hidden = false;
  } finally { if (views.get(content)?.request === request) content.removeAttribute('aria-busy'); }
}
