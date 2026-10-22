import { gameIcon, gameSurface } from './game-ui.js';
import { icon } from './icons.js';
import { baseUrl } from './assets.js';

const levelHints = {
  easy: 'Kofen sana düşünmek için bolca zaman verir.',
  normal: 'Kofen biraz daha hızlı eşleştirir.',
  fast: 'Kofen çok hızlı! Bakalım kim önce bulacak?',
};

export function settingsView(difficulty, levels, soundControl) {
  return `${gameSurface('resultPanel')}
    <img class="leave-mascot settings-mascot" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" width="1536" height="1024" draggable="false" aria-hidden="true" />
    <div class="settings-content">
      <h2 id="modal-title">Ayarlar</h2>
      <p class="settings-description" id="settings-description">Haydi, oyunu sana göre ayarlayalım!</p>
      <section class="settings-level" aria-labelledby="settings-level-title">
        <h3 id="settings-level-title">Kofen’le nasıl oynayalım?</h3>
        <div class="level-options" role="group" aria-labelledby="settings-level-title">${Object.entries(levels).map(([key, label], index) => `<button type="button" data-action="level" data-level="${key}" class="${difficulty === key ? 'active' : ''}" aria-pressed="${difficulty === key}" aria-describedby="settings-level-hint"><span class="settings-level-stars" aria-hidden="true">${Array.from({length: index + 1}, () => gameIcon('spark')).join('')}</span><span>${label}</span></button>`).join('')}</div>
        <p class="settings-level-hint" id="settings-level-hint" role="status" aria-live="polite" aria-atomic="true">${levelHints[difficulty]}</p>
      </section>
      <div class="settings-sound"><span>Oyun sesi</span>${soundControl}</div>
      <button type="button" class="leave-continue settings-ready" data-action="close">${icon('check')}<span>Tamam!</span></button>
    </div>`;
}

export function updateSettingsLevel(dialog, difficulty) {
  dialog.querySelectorAll('[data-level]').forEach(button => {
    const selected = button.dataset.level === difficulty;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  dialog.querySelector('.settings-level-hint').textContent = levelHints[difficulty];
}
