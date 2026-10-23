import { baseUrl } from './assets.js';
import { parrots, rules, winTargets } from './match-rules.js';
import { icon } from './icons.js';
import { gameWorlds } from './game-worlds.js';

export function setupView(setup, difficulty, levels, mode) {
  return `<div class="setup-content" data-players="${mode}">
    <h2 id="modal-title">${mode === 'solo' ? 'Oyununu hazırla!' : 'Yan Yana Oynayalım'}</h2>
    ${mode === 'solo' ? `<fieldset class="setup-field parrot-field"><legend>Kiminle oynayalım?</legend><div class="parrot-options">${Object.entries(parrots).map(([key, parrot]) => `<button type="button" data-action="setup-option" data-option="parrot" data-value="${key}" aria-label="${parrot.name} ile oyna" aria-pressed="${setup.parrot === key}" style="--choice-color:${parrot.color};--choice-wash:${parrot.wash}"><span class="parrot-art"><img src="${baseUrl}assets/characters/${parrot.image}" alt="" width="112" height="112" draggable="false" /></span><span class="parrot-name">${parrot.name}</span><span class="choice-check" aria-hidden="true">${icon('check')}</span></button>`).join('')}</div></fieldset>` : ''}
    ${mode === 'local' ? `<fieldset class="setup-field theme-field"><legend>Hangi dünyada oynayalım?</legend><div class="parrot-options theme-options">${Object.keys(gameWorlds).map(key => { const parrot = parrots[key]; return `<button type="button" data-action="setup-option" data-option="theme" data-value="${key}" aria-label="${parrot.name} dünyası" aria-pressed="${setup.theme === key}" style="--choice-color:${parrot.color};--choice-wash:${parrot.wash}"><span class="parrot-art"><img src="${baseUrl}assets/characters/${parrot.image}" alt="" width="112" height="112" draggable="false" /></span><span class="theme-copy"><span class="parrot-name">${parrot.name}</span></span><span class="choice-check" aria-hidden="true">${icon('check')}</span></button>`; }).join('')}</div></fieldset>` : ''}
    <div class="setup-grid">
      ${mode === 'solo' ? `<fieldset class="setup-field"><legend>Zorluk seç</legend><div class="setup-levels">${Object.entries(levels).map(([key, label]) => `<button type="button" data-action="level" data-level="${key}" aria-pressed="${difficulty === key}">${label}</button>`).join('')}</div></fieldset>` : ''}
      <fieldset class="setup-field"><legend>Altıgendeki simge sayısı</legend><div class="card-count-options">${Array.from({ length: 6 }, (_, index) => index + 3).map(count => `<button type="button" data-action="setup-option" data-option="symbolCount" data-value="${count}" aria-label="${count} simge" aria-pressed="${setup.symbolCount === count}">${count}</button>`).join('')}</div></fieldset>
      <fieldset class="setup-field"><legend>Kaç doğruyla kazanalım?</legend><div class="win-target-options">${winTargets.map(count => `<button type="button" data-action="setup-option" data-option="winTarget" data-value="${count}" aria-label="${count} doğru cevapla kazan" aria-pressed="${setup.winTarget === count}"><strong>${count}</strong><small>doğru</small></button>`).join('')}</div></fieldset>
      ${mode === 'solo' ? `<div class="rotation-toggle setup-rotation-space" aria-hidden="true"><span><strong>Altıgenler dönsün</strong><small>Biraz hareket katalım!</small></span><span class="toggle-track"></span></div>` : ''}
    </div>
    <fieldset class="setup-field rule-field"><legend>Oyun modu</legend><div class="rule-options">${Object.entries(rules).map(([key, rule]) => `<button type="button" data-action="setup-option" data-option="rule" data-value="${key}" aria-pressed="${setup.rule === key}"><span class="rule-emblem" aria-hidden="true">${icon(key === 'empty' ? 'arrow' : 'spark')}</span><span><strong>${rule.name}</strong><span>${rule.hint}</span></span><span class="choice-check" aria-hidden="true">${icon('check')}</span></button>`).join('')}</div></fieldset>
    <div class="setup-footer"><p class="setup-goal-note" aria-live="polite">${icon('spark')} İlk <strong>${setup.winTarget} doğruya</strong> ulaşan kazanır!</p><button type="button" class="primary-button setup-start" data-action="start">${icon('playSolid')} Oyuna Başla</button></div>
  </div>`;
}

export function updateSetup(dialog, setup) {
  dialog.querySelectorAll('[data-option]').forEach(button => {
    const selected = String(setup[button.dataset.option]) === button.dataset.value;
    button.setAttribute('aria-pressed', String(selected));
  });
  dialog.querySelector('.setup-goal-note').innerHTML = `${icon('spark')} İlk <strong>${setup.winTarget} doğruya</strong> ulaşan kazanır!`;
}

export function animateSetupChoice(button) {
  // These controls already have a continuous CSS hover/press transition.
  // Restarting a second greeting on click makes the parrot move twice.
  if (['parrot', 'theme'].includes(button.dataset.option) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  button.getAnimations().forEach(animation => animation.cancel());
  button.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)', offset: .28 }, { transform: 'scale(1.035)', offset: .65 }, { transform: 'scale(1)' }], { duration: 340, easing: 'ease-out' });
}
