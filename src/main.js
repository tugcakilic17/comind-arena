import './style.css';
import './game-ui.css';
import './game-motion.css';
import './account-ui.css';
import './leave-ui.css';
import './help-ui.css';
import { helpView } from './help-ui.js';
import './settings-ui.css';
import './frontend-flow.css';
import './leaderboard-ui.css';
import { baseUrl, prepareImages, markupImages } from './assets.js';
import { readPreferences, savePreferences } from './preferences.js';
import { inviteView } from './community-ui.js';
import { leaderboardView, updateLeaderboard } from './leaderboard-ui.js';
import { settingsView, updateSettingsLevel } from './settings-ui.js';
import { createGameMotion, preloadGameMotion, MATCH_HOLD_MS, ROUND_OUT_MS, ROUND_IN_MS } from './game-motion.js';
import { createDeck, getPair, sharedSymbol } from './game.js';
import { symbols, icon, googleMark } from './icons.js';
import { gameIcon, gameSymbol, progressDots, gameSurface, gameAssets } from './game-ui.js';

const app = document.querySelector('#app');
const deck = createDeck();
const modes = {
  solo: { title: 'Kofen’le Oyna', description: 'Bilgisayardaki papağan Kofen ile tek kişilik oyun.', image: 'mode-kofen-green-wave-v7.webp', play: 'play-kofen-leaf-v9.webp' },
  local: { title: 'Yan Yana Oynayalım', description: 'Aynı cihazda 2 kişi.', image: 'mode-together-blue-red-v9.webp', play: 'play-together-coral-v9.webp' },
  online: { title: 'Arkadaşını Çağır', description: 'Farklı cihazlardan arkadaşınla oynamak için davet. Yakında.', image: 'mode-friend-soft-v6.webp', play: 'play-friend-sky-v9.webp' },
};
const levels = { easy: 'Kolay', normal: 'Orta', fast: 'Zor' };
let mode = 'solo';
const preferences = readPreferences();
let difficulty = preferences.difficulty;
let screen = 'home';
let sound = preferences.sound;
let game = null;
let ticker;
let motion;
let lastTick = 0;
let audioContext;
let modalAutoPaused = false;
const modalCloseTasks = new WeakMap();
let navigationId = 0;
let starting = false;
let pendingScreen;
let entryAnimations = [];
const loadingDialog = document.createElement('dialog');
loadingDialog.className = 'loading-dialog';
loadingDialog.setAttribute('aria-labelledby', 'loading-title');
document.body.append(loadingDialog);

function showLoadError() {
  loadingDialog.classList.add('is-error');
  loadingDialog.innerHTML = '<h2 id="loading-title">Oyun yüklenemedi</h2><p role="status">Bazı görsellere ulaşamadık. Bağlantını kontrol edip yeniden deneyebilirsin.</p><button type="button" class="primary-button" data-loading="retry">Tekrar dene</button><button type="button" class="text-button" data-loading="cancel">Ana ekrana dön</button>';
  if (!loadingDialog.open) loadingDialog.showModal();
  loadingDialog.querySelector('button').focus({ preventScroll: true });
}

function hideLoading() {
  entryAnimations.forEach(animation => animation.cancel());
  entryAnimations = [];
  loadingDialog.close();
  pendingScreen?.remove();
  pendingScreen = null;
  app.removeAttribute('aria-busy');
  app.classList.remove('is-preparing', 'is-entering');
}

async function revealGame() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  app.classList.add('is-entering');
  // The ready game is painted underneath the complete previous screen.
  // Fade that screen away while the cards gently settle into place.
  entryAnimations = [
    pendingScreen.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 420, easing: 'ease-in-out', fill: 'forwards',
    }),
    app.querySelector('.game-stage').animate([
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' }),
  ];
  await Promise.allSettled(entryAnimations.map(animation => animation.finished));
}

loadingDialog.addEventListener('cancel', event => { event.preventDefault(); home(); });
loadingDialog.addEventListener('click', event => {
  const action = event.target.closest('[data-loading]')?.dataset.loading;
  if (action === 'cancel') home();
  else if (action === 'retry') startGame();
});

const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function card(ids, side, variant = '', interactive = false, owner = '') {
  const rotations = [-16, 14, -11, 17, -12, 9];
  return `<div class="hex-card ${variant}"><span class="card-owner">${owner}</span><img class="hex-art" src="${baseUrl}assets/game-ui/${variant === 'opponent-hex' ? 'card-mint-paired-v21.webp' : 'card-lavender-leafy-v21.webp'}" alt="" draggable="false" /><div class="card-symbols">${ids.map((id, index) => `<button type="button" class="symbol pos-${index}" style="--tilt:${rotations[index]}deg;--size:${[1,.88,1.04,.94,1.02,.91][index]}" data-action="match" data-side="${side}" data-symbol="${id}" aria-label="${esc(symbols[id].name)}${interactive ? ' simgesini seç' : ''}" ${interactive ? '' : 'disabled'}>${gameSymbol(id)}</button>`).join('')}</div></div>`;
}

function homePollen() {
  return `<div class="home-pollen" aria-hidden="true">${Array.from({ length: 24 }, (_, index) => {
    const fluffy = index % 4 === 0;
    const duration = 20 + index % 6 * 3;
    return `<span class="pollen-grain${fluffy ? ' pollen-fluffy' : ''}" style="--pollen-x:${(index * 37 + 4) % 100}%;--pollen-size:${fluffy ? 13 + index % 3 * 2 : 4 + index % 4}px;--pollen-drift:${(index % 2 ? -1 : 1) * (24 + index % 5 * 12)}px;--pollen-duration:${duration}s;--pollen-delay:-${(index * 11 + 3) % duration}s;--pollen-opacity:${fluffy ? .65 : .35 + index % 3 * .12}"><i></i></span>`;
  }).join('')}</div>`;
}

function render() {
  motion?.destroy();
  motion = null;
  app.className = `screen-${screen}`;
  const playing = screen === 'game';
  app.innerHTML = `<div class="forest-background" aria-hidden="true"></div>
  ${screen === 'home' ? homePollen() : ''}
  ${playing ? '' : `<header class="site-header account-header"><a class="brand home-brand" href="${baseUrl}" data-action="home" aria-label="CoMind Arena ana sayfa"><img src="${baseUrl}assets/home-ui/brand-clean-cream-v12.webp" alt="" width="2172" height="724" draggable="false" /></a><nav aria-label="Hesap"><button type="button" class="account-button" data-action="account" aria-label="Giriş yap ve üyelik bilgisi" aria-haspopup="dialog"><img src="${baseUrl}assets/home-ui/login-clean-cream-v12.webp" alt="" width="2172" height="724" draggable="false" /></button></nav></header>`}
  <main id="main-content">${screen === 'home' ? homeView() : playing ? gameView() : resultView()}</main>
  <dialog class="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>`;
  if (playing) motion = createGameMotion(document.querySelector('.play-panel'));
  document.querySelector('dialog').addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
  document.querySelector('dialog').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
  document.querySelector('dialog').addEventListener('keydown', event => {
    const dialog = event.currentTarget;
    if (event.key !== 'Tab' || !dialog.classList.contains('illustrated-modal')) return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
}

function soundContents(illustrated = false) {
  return `${illustrated ? gameIcon(sound ? 'sound' : 'muted', 'game-control-image') : icon(sound ? 'sound' : 'muted')}<span class="${illustrated ? 'sr-only' : ''}">Ses ${sound ? 'açık' : 'kapalı'}</span>`;
}

function soundButton(illustrated = false) {
  return `<button class="sound-button${illustrated ? ' game-art-button game-sound' : ''}" data-action="sound" aria-label="Sesi ${sound ? 'kapat' : 'aç'}" aria-pressed="${sound}" title="Sesi ${sound ? 'kapat' : 'aç'}">${soundContents(illustrated)}</button>`;
}

function homeView() {
  return `<section class="illustrated-home" aria-labelledby="home-title">
    <div class="home-heading mascot-heading game-heading"><h1 id="home-title" class="sr-only" tabindex="-1">6gen · CoMind Arena</h1><img class="hero-wordmark" src="${baseUrl}assets/home-ui/hero-user-6gen-v10.webp" alt="" width="1774" height="887" fetchpriority="high" draggable="false" /></div>
    <div class="illustrated-modes parrot-modes soft-modes" role="group" aria-label="Oyun modu">${Object.entries(modes).map(([key, item]) => `<button type="button" class="illustrated-mode" data-action="mode" data-mode="${key}" aria-label="${item.title}${key === 'online' ? ' — yakında' : ''}" aria-describedby="mode-${key}-description"><span class="mode-art" aria-hidden="true"><img class="mode-card-image" src="${baseUrl}assets/home-ui/${item.image}" alt="" width="1254" height="1254" fetchpriority="high" draggable="false" /><span class="mode-play"><img src="${baseUrl}assets/home-ui/${item.play}" alt="" width="1536" height="1024" draggable="false" /></span></span><span class="sr-only" id="mode-${key}-description">${esc(item.description)}</span></button>`).join('')}</div>
    <nav class="wooden-menu" aria-label="Oyun menüsü">
      <button type="button" class="wooden-menu-button" data-action="help" aria-label="Nasıl oynanır?"><img src="${baseUrl}assets/home-ui/menu-help-v2.webp" alt="" width="1536" height="1024" draggable="false" /></button>
      <button type="button" class="wooden-menu-button" data-action="leaderboard" aria-label="Liderlik Tablosu"><img src="${baseUrl}assets/home-ui/menu-leaderboard-v2.webp" alt="" width="1536" height="1024" draggable="false" /></button>
      <button type="button" class="wooden-menu-button" data-action="settings" aria-label="Ayarlar"><img src="${baseUrl}assets/home-ui/menu-settings-v2.webp" alt="" width="1536" height="1024" draggable="false" /></button>
    </nav>
  </section>`;
}

function parrotFile(player, pose = 'idle') {
  return `${baseUrl}assets/game-ui/${player === 1 ? `kofen-${pose}-v26` : `player-${pose}-v27`}.webp`;
}

function avatar(player, isKofen = false) {
  const label = isKofen ? 'Kofen' : `${player + 1}. oyuncu papağanı`;
  return `<div class="avatar-slot" data-player="${player}"><img class="game-avatar avatar-idle ${player === 1 ? 'kofen-avatar' : 'player-parrot'}" src="${parrotFile(player)}" alt="${label}" /><img class="game-avatar avatar-cheer" src="${parrotFile(player, 'cheer')}" alt="" aria-hidden="true" /></div>`;
}

function playerNames() {
  return mode === 'solo' ? ['Sen', 'Kofen'] : ['1. Oyuncu', '2. Oyuncu'];
}

function progressDescription() {
  const names = playerNames();
  return `${game.winners.length} / 10 tur tamamlandı. ${names[0]} ${game.scores[0]}, ${names[1]} ${game.scores[1]}.`;
}

function gameView() {
  const opponent = mode === 'solo' ? 'Kofen' : '2. Oyuncu';
  return `<section class="game-stage illustrated-game" aria-label="Oyun ekranı"><h1 id="game-title" class="sr-only" tabindex="-1">6gen oyun ekranı</h1><div class="game-toolbar"><button class="round-control game-art-button" data-action="leave" aria-label="Ana ekrana dön" title="Ana ekrana dön">${gameIcon('back', 'game-control-image')}</button><div class="scoreboard">${gameSurface('scoreboard')}<div class="player-score">${avatar(0)}<span><strong>${mode === 'solo' ? 'Sen' : '1. Oyuncu'}</strong></span><b id="score-left">${game.scores[0]}</b></div><div class="timer-block" aria-label="Kalan süre">${gameIcon('time')}<strong id="timer">${Math.ceil(game.remaining / 1000)}</strong></div><div class="player-score opponent"><b id="score-right">${game.scores[1]}</b><span><strong>${opponent}</strong></span>${avatar(1, mode === 'solo')}</div></div><div class="game-tools">${soundButton(true)}<button class="round-control pause-button game-art-button" data-action="pause" aria-label="Mola ver" title="Mola ver">${gameIcon('pause', 'game-control-image')}</button></div></div>
  <div class="play-panel"><h2 class="board-title"><span class="sr-only">Ortak simgeyi bul!</span><img src="${baseUrl}assets/game-ui/title-find-leafy-v17.webp" alt="" draggable="false" /></h2><span id="round-label" class="sr-only">1. eşleşme</span><div id="board">${boardView()}</div><div class="match-feedback" role="status" aria-live="polite" id="match-feedback"></div><div class="game-progress" role="progressbar" aria-label="Tur sonuçları: mor 1. oyuncu, yeşil rakip" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${game.winners.length}" aria-valuetext="${progressDescription()}">${gameSurface('roundProgress')}<span class="progress-caption" id="progress-caption">Tur ${game.round} / 10</span><span class="progress-dots">${progressDots(game.winners, playerNames())}</span></div></div></section>`;
}

function boardView() {
  return `<div class="game-cards ${mode === 'local' ? 'local-cards' : ''}">${gameSurface('woodenStage')}<div class="player-card">${gameSurface('woodenStage')}${card(game.pair[0], 'left', 'player-hex', true, mode === 'solo' ? 'Sen' : '1. Oyuncu')}</div><div class="player-card">${gameSurface('woodenStage')}${card(game.pair[1], mode === 'solo' ? 'opponent' : 'right', 'opponent-hex', mode === 'local', mode === 'solo' ? 'Kofen' : '2. Oyuncu')}</div></div>`;
}

function resultView() {
  const tied = game.scores[0] === game.scores[1];
  const winnerIndex = game.scores[0] > game.scores[1] ? 0 : 1;
  const winner = game.scores[0] > game.scores[1] ? (mode === 'solo' ? 'Sen kazandın!' : '1. Oyuncu kazandı!') : (mode === 'solo' ? 'Bu kez Kofen kazandı!' : '2. Oyuncu kazandı!');
  const mascots = tied ? [0, 1] : [winnerIndex];
  const names = playerNames();
  const subtitle = tied ? 'Birlikte harika oynadınız!' : winnerIndex === 0 ? 'Harika eşleştirdin!' : 'Bir daha deneyelim mi?';
  return `<section class="result-panel illustrated-result" aria-labelledby="result-title">
    <div class="result-mascots${tied ? ' is-tied' : ''}" aria-hidden="true">${mascots.map(player => `<img src="${parrotFile(player, 'cheer')}" alt="" draggable="false" />`).join('')}</div>
    ${gameSurface('resultPanel')}
    <div class="result-content">
    <div class="result-heading">
    <h1 id="result-title">${tied ? 'Dostluk kazandı!' : winner}</h1>
    <p class="result-subtitle">${subtitle}</p>
    </div>
    <div class="result-score" aria-label="Oyun skoru">
      <span class="result-player"><span class="result-portrait"><img class="result-score-avatar" src="${parrotFile(0)}" alt="" draggable="false" /></span><span class="result-score-copy"><small>${names[0]}</small><strong>${game.scores[0]}</strong></span></span>
      <span class="result-dash" aria-hidden="true">:</span>
      <span class="result-player result-opponent"><span class="result-score-copy"><small>${names[1]}</small><strong>${game.scores[1]}</strong></span><span class="result-portrait"><img class="result-score-avatar" src="${parrotFile(1)}" alt="" draggable="false" /></span></span>
    </div>
    <div class="result-stats"><span>${gameIcon('check')} ${game.scores.reduce((a,b) => a+b,0)} eşleşme</span><span>${gameIcon('time')} ${Math.ceil((90000-game.remaining)/1000)} saniye</span></div>
    <div class="result-actions">
    <button class="primary-button result-art-button result-replay" data-action="start" aria-label="Bir daha oynayalım">${icon('playSolid')}<span>Bir daha oynayalım</span></button>
    <button class="text-button result-art-button result-home" data-action="home" aria-label="Ana ekrana dön">${icon('homeSolid')}<span>Ana ekrana dön</span></button>
    </div>
    </div>
  </section>`;
}

function beep(correct = true) {
  if (!sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(correct ? 660 : 220, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(correct ? 880 : 180, audioContext.currentTime + .12);
    gain.gain.setValueAtTime(.07, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .2);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + .2);
  } catch { /* Sound is optional when the browser does not support it. */ }
}

async function startGame() {
  if (mode === 'online' || starting) return;
  starting = true;
  const request = ++navigationId;
  clearInterval(ticker);
  // Closing the invitation must finish before its DOM is replaced.
  await closeModal({ resumeGame: false });
  if (request !== navigationId) return;
  hideLoading();
  app.setAttribute('aria-busy', 'true');
  app.inert = true;
  try {
    preloadGameMotion().catch(() => {});
    await Promise.all([prepareImages(gameAssets), document.fonts.ready]);
    if (request !== navigationId) return;
    // Preserve the complete previous view while the connected game lays out
    // and paints its first frame. There is no loading popup or blank screen.
    pendingScreen = app.cloneNode(true);
    pendingScreen.removeAttribute('id');
    pendingScreen.removeAttribute('aria-busy');
    pendingScreen.classList.add('pending-screen');
    pendingScreen.setAttribute('aria-hidden', 'true');
    document.body.append(pendingScreen);
    game = { pair: getPair(deck), scores: [0, 0], winners: [], remaining: 90000, paused: false, round: 1, lock: 0, phase: null, botWait: botDelay() };
    screen = 'game';
    render();
    app.classList.add('is-preparing');
    app.inert = true;
    await Promise.all([motion.ready, ...[...app.querySelectorAll('img')].map(image => image.decode())]);
    if (request !== navigationId) return;
    await revealGame();
    if (request !== navigationId) return;
    hideLoading();
    app.inert = false;
    document.querySelector('#game-title').focus({ preventScroll: true });
    lastTick = performance.now();
    ticker = setInterval(tick, 100);
    if (document.hidden) openModal('pause');
  } catch (error) {
    if (request !== navigationId) return;
    console.warn('Game preparation failed', error);
    // Return to a complete screen before offering a network retry.
    hideLoading();
    screen = 'home'; game = null; render(); app.inert = false;
    showLoadError();
  } finally { if (request === navigationId) starting = false; }
}

function botDelay() {
  return ({ easy: 8500, normal: 5200, fast: 3000 })[difficulty] + Math.random() * 1600;
}

function tick() {
  const now = performance.now();
  const delta = now - lastTick;
  lastTick = now;
  if (screen !== 'game' || game.paused) return;
  game.remaining = Math.max(0, game.remaining - delta);
  const timer = document.querySelector('#timer');
  timer.textContent = Math.ceil(game.remaining / 1000);
  timer.closest('.timer-block').classList.toggle('time-low', game.remaining < 15000);
  if (game.remaining <= 0) { finishGame(); return; }
  if (game.lock > 0) {
    game.lock -= delta;
    if (game.lock <= 0) {
      if (game.phase === 'out') dealNextRound();
      else if (game.phase === 'in') {
        game.phase = null; game.lock = 0;
        motion?.settle();
        document.querySelector('#board').removeAttribute('aria-busy');
      } else nextRound();
    }
    return;
  }
  if (mode === 'solo') {
    game.botWait -= delta;
    if (game.botWait <= 0) award(1);
  }
}

function match(target) {
  if (screen !== 'game' || game.paused || game.lock > 0 || target.disabled) return;
  const id = Number(target.dataset.symbol);
  const correct = id === sharedSymbol(game.pair);
  motion?.tap(target, correct);
  if (correct) {
    award(target.dataset.side === 'right' ? 1 : 0);
  } else {
    beep(false);
    target.classList.remove('wrong');
    void target.offsetWidth;
    target.classList.add('wrong');
    feedback('Tekrar dene', 'incorrect');
  }
}

function award(player) {
  if (game.lock > 0 || game.paused || screen !== 'game') return;
  game.scores[player]++;
  game.winners.push(player);
  game.lock = MATCH_HOLD_MS;
  game.phase = 'match';
  document.querySelectorAll('.avatar-slot').forEach(slot => slot.classList.toggle('is-cheering', Number(slot.dataset.player) === player));
  beep(true);
  const shared = sharedSymbol(game.pair);
  const matched = [...document.querySelectorAll(`#board [data-symbol="${shared}"]`)];
  matched.forEach(element => element.classList.add('matched'));
  motion?.celebrate(matched);
  document.querySelector('#score-left').textContent = game.scores[0];
  document.querySelector('#score-right').textContent = game.scores[1];
  document.querySelector('.progress-dots').innerHTML = progressDots(game.winners, playerNames());
  document.querySelector('.game-progress').setAttribute('aria-valuenow', game.winners.length);
  document.querySelector('.game-progress').setAttribute('aria-valuetext', progressDescription());
  const who = player === 0 ? (mode === 'solo' ? 'Sen' : '1. Oyuncu') : (mode === 'solo' ? 'Kofen' : '2. Oyuncu');
  feedback(`+1 · ${who}`, 'correct');
}

function nextRound() {
  if (game.winners.length >= 10) { finishGame(); return; }
  game.phase = 'out';
  game.lock = ROUND_OUT_MS;
  document.querySelector('#board').setAttribute('aria-busy', 'true');
  motion?.transition('out');
}

function dealNextRound() {
  document.querySelectorAll('.avatar-slot').forEach(slot => slot.classList.remove('is-cheering'));
  const focusWasOnCard = !!document.activeElement?.closest('.symbol');
  game.round++;
  document.querySelector('#progress-caption').textContent = `Tur ${game.round} / 10`;
  game.pair = getPair(deck);
  game.botWait = botDelay();
  game.phase = 'in';
  game.lock = ROUND_IN_MS;
  document.querySelector('#board').innerHTML = boardView();
  document.querySelector('#round-label').textContent = `${game.round}. eşleşme`;
  motion?.sync();
  motion?.transition('in');
  feedback('');
  if (focusWasOnCard) document.querySelector('#board button:not(:disabled)').focus({ preventScroll: true });
}

function feedback(message, className = '') {
  const element = document.querySelector('#match-feedback');
  element.className = `match-feedback ${className}`;
  element.innerHTML = message ? `${gameIcon(className === 'correct' ? 'check' : 'cross')} ${esc(message)}` : '';
}

async function finishGame() {
  if (screen !== 'game' || game.phase === 'finished') return;
  clearInterval(ticker);
  game.phase = 'finished';
  game.lock = Infinity;
  app.inert = true;
  const showResult = async () => {
    await prepareImages([`${baseUrl}assets/forest-clearing-v1.webp`]).catch(() => {});
    screen = 'result';
    render();
    await Promise.all([...app.querySelectorAll('img')].map(image => image.decode().catch(() => {})));
  };
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await showResult();
    } else if (document.startViewTransition) {
      document.documentElement.classList.add('result-transition');
      const transition = document.startViewTransition(showResult);
      await transition.finished.catch(() => {});
    } else {
      await document.querySelector('main').animate(
        [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-5px)' }],
        { duration: 160, easing: 'ease-in', fill: 'forwards' },
      ).finished.catch(() => {});
      await showResult();
      await document.querySelector('main').animate(
        [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' },
      ).finished.catch(() => {});
    }
  } finally {
    document.documentElement.classList.remove('result-transition');
    app.inert = false;
    const heading = document.querySelector('.result-panel h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}

async function activateResultButton(target, action) {
  app.inert = true;
  try {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await target.animate([
        { transform: 'translateY(1px) scale(.96,.92)' },
        { transform: 'translateY(-2px) scale(1.025,1.035)', offset: .65 },
        { transform: 'none' },
      ], { duration: 190, easing: 'ease-out' }).finished.catch(() => {});
    }
    if (action === 'start') await startGame();
    else home();
  } finally { app.inert = false; }
}

function setGamePaused(paused) {
  if (screen !== 'game' || game.phase === 'finished') return;
  game.paused = paused;
  if (!paused) lastTick = performance.now();
  document.querySelector('.illustrated-game').classList.toggle('is-paused', game.paused);
  motion?.pause(game.paused);
  const pauseButton = document.querySelector('.pause-button');
  pauseButton.innerHTML = gameIcon(game.paused ? 'play' : 'pause', 'game-control-image');
  pauseButton.setAttribute('aria-label', game.paused ? 'Devam et' : 'Mola ver');
  pauseButton.title = game.paused ? 'Devam et' : 'Mola ver';
  document.querySelector('#board').inert = game.paused;
  if (!game.paused) pauseButton.focus();
}

function togglePause() {
  if (screen !== 'game' || game.phase === 'finished') return;
  const dialog = document.querySelector('dialog');
  if (dialog.open) {
    if (dialog.dataset.kind === 'pause') closeModal();
    return;
  }
  if (game.paused) setGamePaused(false);
  else openModal('pause');
}

function home() {
  navigationId++; starting = false; modalAutoPaused = false;
  clearInterval(ticker); hideLoading(); app.inert = false;
  screen = 'home'; game = null; render();
  (app.querySelector(`[data-mode="${mode}"]`) || app.querySelector('#home-title')).focus({ preventScroll: true });
}

function openModal(type) {
  if (screen === 'game' && !game.paused) { modalAutoPaused = true; setGamePaused(true); }
  const dialog = document.querySelector('dialog');
  dialog.dataset.kind = type;
  dialog.classList.toggle('illustrated-modal', ['account', 'leave', 'pause', 'help', 'settings', 'leaderboard', 'invite'].includes(type));
  let content = '';
  if (type === 'help') {
    content = helpView();
  } else if (type === 'leaderboard') {
    content = leaderboardView();
  } else if (type === 'settings') {
    content = settingsView(difficulty, levels, soundButton());
  } else if (type === 'invite') {
    content = inviteView();
  } else if (type === 'account') {
    content = `${gameSurface('resultPanel')}<img class="account-mascot" src="${baseUrl}assets/home-ui/account-mascot-mail-v34.webp" alt="" width="1536" height="1024" draggable="false" aria-hidden="true" />
      <div class="account-content"><h2 id="modal-title">Hoş geldin!</h2>
      <p class="account-description" id="account-description">Oynamaya hazır mısın?<br />Haydi, birlikte başlayalım!</p>
      <button type="button" class="account-google" data-action="google-signin">${googleMark()}<span>Google ile devam et</span></button>
      <p class="account-note">Google ile giriş yakında. Şimdilik üyeliksiz oyna!</p>
      <p class="account-status" role="status" aria-live="polite" hidden></p></div>`;
  } else if (type === 'pause') {
    content = `${gameSurface('resultPanel')}<img class="leave-mascot" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" width="1536" height="1024" draggable="false" aria-hidden="true" />
      <div class="leave-content pause-content"><h2 id="modal-title">Minik bir mola!</h2>
      <p class="leave-description" id="pause-description">Hazır olduğunda devam edelim.</p>
      <button type="button" class="leave-continue pause-continue" data-action="close">${icon('playSolid')}<span>Oyuna devam et</span></button></div>`;
  } else if (type === 'leave') {
    content = `${gameSurface('resultPanel')}<img class="leave-mascot" src="${baseUrl}assets/game-ui/leave-mascot-v38.webp" alt="" width="1536" height="1024" draggable="false" aria-hidden="true" />
      <div class="leave-content"><h2 id="modal-title">Ana ekrana dönmek<br />istiyor musun?</h2>
      <p class="leave-description" id="leave-description">Şimdi dönersen bu oyun sona erecek.</p>
      <button type="button" class="leave-continue" data-action="close">${icon('playSolid')}<span>Oyuna devam et</span></button>
      <button type="button" class="leave-home" data-action="confirm-home">${icon('homeSolid')}<span>Ana ekrana dön</span></button></div>`;
  }
  document.querySelector('#modal-content').innerHTML = `<button class="close-modal" data-action="close" aria-label="Pencereyi kapat">${icon('close')}</button>${content}`;
  if (type === 'account') dialog.setAttribute('aria-describedby', 'account-description');
  else if (type === 'leave') dialog.setAttribute('aria-describedby', 'leave-description');
  else if (type === 'pause') dialog.setAttribute('aria-describedby', 'pause-description');
  else if (type === 'help') dialog.setAttribute('aria-describedby', 'help-description');
  else if (type === 'settings') dialog.setAttribute('aria-describedby', 'settings-description');
  else if (['leaderboard', 'invite'].includes(type)) dialog.setAttribute('aria-describedby', 'community-description');
  else dialog.removeAttribute('aria-describedby');
  dialog.showModal();
  if (type === 'account') dialog.querySelector('.account-google').focus({ preventScroll: true });
  else if (type === 'leave') dialog.querySelector('.leave-continue').focus({ preventScroll: true });
  else if (type === 'pause') dialog.querySelector('.pause-continue').focus({ preventScroll: true });
  else if (type === 'help') dialog.querySelector('.help-ready').focus({ preventScroll: true });
  else if (type === 'settings') dialog.querySelector('[data-level].active').focus({ preventScroll: true });
  else if (['leaderboard', 'invite'].includes(type)) dialog.querySelector('.community-ready').focus({ preventScroll: true });
  // Hide the composition as a whole while its images decode, including the
  // SVG image used by the help example. Never reveal a half-painted panel.
  dialog.classList.add('is-preparing');
  prepareImages(markupImages(content)).catch(() => {}).finally(() => {
    if (dialog.isConnected && dialog.dataset.kind === type) {
      dialog.classList.remove('is-preparing');
      if (dialog.open && !dialog.inert) {
        const preferred = dialog.querySelector('.account-google, .leave-continue, .help-ready, [data-level].active, .community-ready');
        preferred?.focus({ preventScroll: true });
      }
    }
  });
}

function closeModal({ resumeGame = true } = {}) {
  const dialog = document.querySelector('dialog');
  if (modalCloseTasks.has(dialog)) return modalCloseTasks.get(dialog);
  if (!dialog.open) return Promise.resolve();
  const finishClose = () => {
    dialog.close();
    dialog.inert = false;
    dialog.classList.remove('is-closing');
    dialog.style.removeProperty('--account-exit-opacity');
    dialog.style.removeProperty('--account-exit-transform');
    dialog.style.removeProperty('--account-backdrop-exit-opacity');
    const shouldResume = modalAutoPaused && resumeGame && screen === 'game';
    modalAutoPaused = false;
    modalCloseTasks.delete(dialog);
    if (shouldResume) setGamePaused(false);
  };
  if (dialog.classList.contains('illustrated-modal') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const current = getComputedStyle(dialog);
    dialog.style.setProperty('--account-exit-opacity', current.opacity);
    dialog.style.setProperty('--account-exit-transform', current.transform);
    dialog.style.setProperty('--account-backdrop-exit-opacity', getComputedStyle(dialog, '::backdrop').opacity);
    dialog.inert = true;
    dialog.classList.add('is-closing');
    const closing = Promise.allSettled(dialog.getAnimations().map(animation => animation.finished)).then(finishClose);
    modalCloseTasks.set(dialog, closing);
    return closing;
  }
  finishClose();
  return Promise.resolve();
}

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled || app.inert || target.closest('dialog')?.inert) return;
  const action = target.dataset.action;
  if (screen === 'result' && target.classList.contains('result-art-button')) {
    event.preventDefault();
    activateResultButton(target, action);
    return;
  }
  if (action === 'home') { event.preventDefault(); screen === 'game' ? openModal('leave') : home(); }
  else if (action === 'mode') { mode = target.dataset.mode; if (mode === 'online') openModal('invite'); else startGame(); }
  else if (action === 'level') { difficulty = target.dataset.level; savePreferences(difficulty, sound); updateSettingsLevel(target.closest('dialog'), difficulty); }
  else if (action === 'start') startGame();
  else if (action === 'match') match(target);
  else if (action === 'pause') togglePause();
  else if (action === 'sound') { sound = !sound; savePreferences(difficulty, sound); document.querySelectorAll('.sound-button').forEach(button => { button.innerHTML = soundContents(button.classList.contains('game-sound')); button.setAttribute('aria-label', `Sesi ${sound ? 'kapat' : 'aç'}`); button.setAttribute('aria-pressed', sound); button.title = `Sesi ${sound ? 'kapat' : 'aç'}`; }); beep(); }
  else if (action === 'close') closeModal();
  else if (action === 'ranking') updateLeaderboard(target.closest('dialog'), target.dataset.rankNav);
  else if (action === 'google-signin') {
    const status = document.querySelector('.account-status');
    status.textContent = 'Google ile giriş yakında hazır olacak.';
    status.hidden = false;
  }
  else if (action === 'confirm-home') closeModal({ resumeGame: false }).then(home);
  else if (['help', 'leaderboard', 'account', 'leave', 'settings'].includes(action)) openModal(action);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'game' && !starting && !game.paused) togglePause();
});
document.addEventListener('keydown', event => {
  if (event.code === 'Escape' && starting) { event.preventDefault(); home(); return; }
  if (event.code === 'Escape' && screen === 'game' && !document.querySelector('dialog').open) togglePause();
});
render();

// Warm game assets after the home page has loaded, or as soon as intent is
// clear. Do not compete with the initial home images on a cold connection.
const warmGame = () => { prepareImages(gameAssets).catch(() => {}); };
app.addEventListener('pointerover', event => {
  if (event.target.closest('[data-mode="solo"], [data-mode="local"]')) { warmGame(); preloadGameMotion().catch(() => {}); }
}, { passive: true });
app.addEventListener('focusin', event => {
  if (event.target.matches('[data-mode="solo"], [data-mode="local"]')) warmGame();
});
const warmAfterLoad = () => {
  if (navigator.connection?.saveData) return;
  if ('requestIdleCallback' in window) requestIdleCallback(warmGame, { timeout: 2000 });
  else setTimeout(warmGame, 1000);
};
if (document.readyState === 'complete') warmAfterLoad();
else window.addEventListener('load', warmAfterLoad, { once: true });

