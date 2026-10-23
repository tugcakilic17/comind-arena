import { icon } from './icons.js';
import { baseUrl } from './assets.js';
import { gameSurface, rankingPointArt } from './game-ui.js';
import { escapeHtml as esc } from './api.js';
import { playerFace, playerAvatars, playerPortraitUrl, currentPlayerAvatar } from './player-avatar.js';

export function settingsProfileView(user, { editing = false, standalone = false, pending = false, message = '' } = {}) {
  const avatar = user?.avatar || currentPlayerAvatar();
  const code = user?.publicCode;
  return `<section id="settings-panel-profile" class="settings-profile" aria-labelledby="settings-profile-title">
    <div class="profile-card-heading"><h3 id="settings-profile-title">${icon('user')}${standalone ? 'Oyuncu kartın' : 'Profilim'}</h3><button type="button" class="profile-edit" data-action="profile-edit" aria-expanded="${editing}" ${editing ? 'hidden' : ''}>${icon('edit')}<span>Düzenle</span></button></div>
    <div class="profile-summary">${playerFace('profile-initial', avatar)}<div><strong>${esc(user?.name || 'Misafir oyuncu')}</strong><small>${user ? 'İşte senin oyun arkadaşın!' : 'Papağanını seç, oyuna renk kat!'}</small></div></div>
    ${user ? `<button type="button" class="profile-points" data-action="leaderboard" aria-label="Liderlik tablosunu aç" aria-busy="true"><span class="profile-points-icon">${rankingPointArt()}</span><span class="profile-points-copy"><small>Liderlik puanın</small><strong data-profile-points>Puan yükleniyor…</strong><small data-profile-rank>Arkadaş maçlarından kazanılır</small></span>${icon('arrow')}</button>` : ''}
    ${editing ? `<form id="profile-avatar-form"><fieldset class="avatar-picker"><legend>Papağanını seç</legend><div class="avatar-choices">${Object.entries(playerAvatars).map(([key, choice]) => `<label class="avatar-choice" style="--avatar-color:${choice.color};--avatar-wash:${choice.wash}"><input type="radio" name="avatar" value="${key}" aria-label="${choice.label}" ${avatar === key ? 'checked' : ''} required /><span class="avatar-choice-art player-face"><img src="${playerPortraitUrl('idle', key)}" alt="" width="76" height="76" draggable="false" /></span><span class="avatar-choice-check" aria-hidden="true">${icon('check')}</span></label>`).join('')}</div></fieldset><p class="profile-status" role="status" aria-live="polite"></p><div class="profile-editor-actions"><button type="button" data-action="profile-cancel">Vazgeç</button><button type="submit">${icon('check')}Kaydet</button></div></form>` : ''}
    ${user ? `<div class="profile-id"><span>Kullanıcı ID</span>${code ? `<div class="profile-code-row"><code>${esc(code)}</code><button type="button" data-action="copy-player-code" aria-label="Kullanıcı ID'sini kopyala">${icon('copy')}</button></div><small class="profile-copy-status" role="status" aria-live="polite"></small>` : '<small>Kodun yükleniyor…</small>'}</div>` : ''}
    <div class="profile-card-footer"><button type="button" class="settings-profile-button" data-action="${standalone ? 'signout' : 'profile'}" ${pending ? 'disabled aria-busy="true"' : ''}>${icon(standalone ? 'back' : user ? 'user' : 'arrow')}<span>${pending ? 'Biraz bekle…' : standalone ? 'Çıkış yap' : user ? 'Profilimi aç' : 'Google ile giriş yap'}</span></button>${standalone ? `<p class="profile-account-status" role="status" aria-live="polite" ${message ? '' : 'hidden'}>${esc(message)}</p>` : ''}</div>
  </section>`;
}

export function settingsView(user, soundControl) {
  return `${gameSurface('resultPanel').replace('class="game-surface', 'class="settings-frame game-surface')}<img class="settings-peeker" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" draggable="false" aria-hidden="true" /><div class="settings-content" data-tab="profile">
      <h2 id="modal-title">Ayarlar</h2>
      <p class="settings-description" id="settings-description">Küçük seçimler, kocaman bir macera!</p>
      <nav class="settings-tabs" aria-label="Ayar bölümü">${[['profile','user','Profilim'],['sound','sound','Ses'],['redeem','gift','Hediye']].map(([key,symbol,label])=>`<button type="button" data-action="settings-tab" data-tab="${key}" aria-pressed="${key==='profile'}" aria-controls="settings-panel-${key}">${icon(symbol)}<span>${label}</span></button>`).join('')}</nav>
      <div class="settings-grid">${settingsProfileView(user)}
      <div class="settings-tools">
      <section id="settings-panel-sound" class="settings-sound" aria-labelledby="settings-sound-title"><div><h3 id="settings-sound-title">${icon('sound')}Oyun sesi</h3><p>Neşeli sesler eşlik etsin.</p></div>${soundControl}</section>
      <section id="settings-panel-redeem" class="settings-redeem" aria-labelledby="redeem-title"><h3 id="redeem-title">${icon('gift')}Hediye kodu</h3>
        <p id="redeem-hint">Hediye kodlarını yakında burada kullanabileceksin. Şu an aktif bir kampanya yok.</p>
        <form id="redeem-form"><label for="gift-code">Kodun</label><div class="redeem-input-row"><input id="gift-code" name="code" type="text" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Hediye kodunu gir" aria-describedby="redeem-hint redeem-status" required /><button type="submit">Kodu Kullan</button></div></form>
        <p id="redeem-status" class="redeem-status" role="status" aria-live="polite"></p>
      </section>
      </div></div>
      <div class="settings-footer"><button type="button" class="leave-continue settings-ready" data-action="close">${icon('check')}<span>Tamam!</span></button></div>
    </div>`;
}

export function profileView(user, state = {}) {
  return `${gameSurface('resultPanel').replace('class="game-surface', 'class="settings-frame game-surface')}<img class="settings-peeker" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" draggable="false" aria-hidden="true" /><div class="settings-content profile-panel-content" data-tab="profile">
    <h2 id="modal-title">Profilim</h2><p class="settings-description" id="profile-description">Oyun arkadaşın, puanın ve oyuncu kodun.</p>
    <div class="settings-grid">${settingsProfileView(user, { ...state, standalone:true })}</div>
    <div class="settings-footer"><button type="button" class="leave-continue settings-ready" data-action="close">${icon('check')}<span>Tamam!</span></button></div>
  </div>`;
}
