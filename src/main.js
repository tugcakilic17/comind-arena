import './style.css';
import './game-ui.css';
import './game-motion.css';
import './account-ui.css';
import './leave-ui.css';
import { helpView } from './help-ui.js';
import './frontend-flow.css';
import './leaderboard-ui.css';
import './responsive.css';
import { baseUrl, prepareImages, markupImages } from './assets.js';
import { readPreferences, savePreferences } from './preferences.js';
import { createGameAudio } from './game-audio.js';
import { inviteView } from './community-ui.js';
import { leaderboardView, updateLeaderboard } from './leaderboard-ui.js';
import { settingsView, settingsProfileView, profileView } from './settings-ui.js';
import { updateProfilePoints } from './profile-points.js';
import { setupView, updateSetup, animateSetupChoice } from './setup-ui.js';
import { createMatch, currentPair, transferCard, matchWinner, matchComplete, symbolPoses, parrots, rules, normalizeSetup } from './match-rules.js';
import { redeemCode } from './redeem.js';
import { createGameMotion, preloadGameMotion, MATCH_HOLD_MS, ROUND_OUT_MS, ROUND_IN_MS } from './game-motion.js';
import { sharedSymbol } from './game.js';
import { icon, googleMark } from './icons.js';
import { gameIcon, gameSymbol, gameSurface, gameAssets, seaPierAssets } from './game-ui.js';
import { getSymbolSet } from './symbol-sets.js';
import { gameWorlds, worldBackground } from './game-worlds.js';
import { getAuthState, onAuthChange, refreshAuth, signInWithGoogle, signOut, consumeAuthResult, updatePlayerAvatar } from './auth.js';
import { enterOnline, stopOnline, onlineView, onlineAction, updateOnlineClock, getOnlineRoom, clearOnlineInvite, setOnlineInput, syncOnlineAuth, waitOnlineIdle } from './online.js';
import './match-setup.css';
import './help-ui.css';
import './settings-ui.css';
import './home-ui.css';
import './online.css';
import './large-screen.css';
import { playerPortraitUrl, playerFace, syncPlayerAvatar, saveGuestAvatar, playerAvatars, currentPlayerAvatar } from './player-avatar.js';

const app = document.querySelector('#app');
const modes = {
  solo: { title: 'Birlikte Oynayalım!', description: 'Papağanını seç!', image: 'mode-toy-basket-v2.webp', play: 'play-kofen-leaf-v9.webp' },
  local: { title: 'Yan Yana Oynayalım', description: 'Aynı cihazda 2 kişi.', image: 'mode-together-blue-red-v9.webp', play: 'play-together-coral-v9.webp' },
  online: { title: 'Arkadaşını Çağır', description: 'Arkadaşlarınla farklı cihazlardan birlikte oyna.', image: 'mode-friend-soft-v6.webp', play: 'play-friend-sky-v9.webp' },
};
const levels = { easy: 'Kolay', normal: 'Orta', fast: 'Zor' };
let mode = 'solo';
const preferences = readPreferences();
let difficulty = preferences.difficulty;
let setup = preferences.setup;
let screen = 'home';
let sound = preferences.sound;
const gameAudio = createGameAudio(sound);
let game = null;
let ticker;
let motion;
let lastTick = 0;
let modalAutoPaused = false;
const modalCloseTasks = new WeakMap();
const wrongFeedbackTimers = new WeakMap();
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
  const set = getSymbolSet(game.symbolSet);
  const poses = symbolPoses(ids.length, Math.random, ids.map(id => [...set.rects[id], set.outlines[id]]));
  return `<div class="hex-card ${variant}"><span class="card-owner">${owner}</span><div class="hex-turntable"><img class="hex-art" src="${baseUrl}assets/game-ui/${variant === 'opponent-hex' ? 'card-mint-paired-v21.webp' : 'card-lavender-leafy-v21.webp'}" alt="" draggable="false" /><div class="card-symbols">${ids.map((id, index) => `<button type="button" class="symbol scattered-symbol" style="left:${poses[index].x.toFixed(3)}%;top:${poses[index].y.toFixed(3)}%;width:${poses[index].width.toFixed(3)}%;height:${poses[index].height.toFixed(3)}%;--tilt:${poses[index].angle}deg;--size:${poses[index].size.toFixed(3)}" data-action="match" data-side="${side}" data-symbol="${id}" aria-label="${esc(set.names[id])}${interactive ? ' simgesini seç' : ''}" ${interactive ? '' : 'disabled'}>${gameSymbol(id, true, set.key)}</button>`).join('')}</div></div></div>`;
}

function homePollen() {
  return `<div class="home-pollen" aria-hidden="true">${Array.from({ length: 24 }, (_, index) => {
    const fluffy = index % 4 === 0;
    const duration = 20 + index % 6 * 3;
    return `<span class="pollen-grain${fluffy ? ' pollen-fluffy' : ''}" style="--pollen-x:${(index * 37 + 4) % 100}%;--pollen-size:${fluffy ? 13 + index % 3 * 2 : 4 + index % 4}px;--pollen-drift:${(index % 2 ? -1 : 1) * (24 + index % 5 * 12)}px;--pollen-duration:${duration}s;--pollen-delay:-${(index * 11 + 3) % duration}s;--pollen-opacity:${fluffy ? .65 : .35 + index % 3 * .12}"><i></i></span>`;
  }).join('')}</div>`;
}

function matchBackgroundUrl(portrait = false) {
  const theme = mode === 'solo' ? (game?.parrot ?? setup.parrot) : (game?.theme ?? setup.theme);
  return `${baseUrl}assets/game-ui/${worldBackground(theme, portrait)}`;
}

function render() {
  motion?.destroy();
  motion = null;
  app.className = `screen-${screen}`;
  const playing = screen === 'game';
  const matchScreen = playing || screen === 'result';
  app.innerHTML = `<div class="forest-background"${matchScreen ? ` style="--match-background:url('${matchBackgroundUrl()}');--match-portrait-background:url('${matchBackgroundUrl(true)}')"` : ''} aria-hidden="true"></div>
  ${screen === 'home' ? homePollen() : ''}
  ${playing ? '' : `<header class="site-header account-header"><a class="brand home-brand" href="${baseUrl}" data-action="home" aria-label="CoMind Arena ana sayfa"><img src="${baseUrl}assets/home-ui/brand-clean-cream-v12.webp" alt="" width="2172" height="724" draggable="false" /></a><nav aria-label="Hesap"><button type="button" class="account-button" data-action="account" aria-label="Giriş yap ve üyelik bilgisi" aria-haspopup="dialog"><img src="${baseUrl}assets/home-ui/login-clean-cream-v12.webp" alt="" width="2172" height="724" draggable="false" /></button></nav></header>`}
  <main id="main-content">${screen === 'home' ? homeView() : screen === 'online' ? onlineView() : playing ? gameView() : resultView()}</main>
  <dialog class="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>`;
  updateAccountHeader();
  if (playing) motion = createGameMotion(document.querySelector('.play-panel'));
  document.querySelector('dialog').addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
  document.querySelector('dialog').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
  document.querySelector('dialog').addEventListener('keydown', event => {
    const dialog = event.currentTarget;
    if (event.key !== 'Tab' || !dialog.classList.contains('illustrated-modal')) return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')].filter(control => control.checkVisibility());
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
    <h1 id="home-title" class="sr-only" tabindex="-1">CoMind Arena oyunları</h1>
    <div class="illustrated-modes parrot-modes soft-modes" role="group" aria-label="Oyun modu">${Object.entries(modes).map(([key, item]) => `<button type="button" class="illustrated-mode" data-action="mode" data-mode="${key}" aria-label="${item.title}" aria-describedby="mode-${key}-description"><span class="mode-art" aria-hidden="true"><img class="mode-card-image" src="${baseUrl}assets/home-ui/${item.image}" alt="" width="1254" height="1254" fetchpriority="high" draggable="false" /><span class="mode-play"><img src="${baseUrl}assets/home-ui/${item.play}" alt="" width="1536" height="1024" draggable="false" /></span></span><span class="sr-only" id="mode-${key}-description">${esc(item.description)}</span></button>`).join('')}</div>
    <nav class="wooden-menu" aria-label="Oyun menüsü">
      <button type="button" class="wooden-menu-button" data-action="help" aria-label="Nasıl oynanır?"><img src="${baseUrl}assets/home-ui/menu-help-v2.webp" alt="" width="1536" height="1024" draggable="false" /></button>
      <button type="button" class="wooden-menu-button" data-action="leaderboard" aria-label="Liderlik Tablosu"><img src="${baseUrl}assets/home-ui/menu-leaderboard-v2.webp" alt="" width="1536" height="1024" draggable="false" /></button>
      <button type="button" class="wooden-menu-button" data-action="settings" aria-label="Ayarlar"><img src="${baseUrl}assets/home-ui/menu-settings-v2.webp" alt="" width="1536" height="1024" draggable="false" /></button>
    </nav>
  </section>`;
}

function parrotFile(player, pose = 'idle') {
  if (player === 1 && mode === 'solo') return `${baseUrl}assets/${parrots[game?.parrot || setup.parrot][pose]}`;
  if (player === 1 && mode === 'local') return playerPortraitUrl(pose, currentPlayerAvatar() === 'white' ? 'lilac' : 'white');
  return playerPortraitUrl(pose);
}

function avatar(player, isKofen = false) {
  const label = isKofen ? parrots[game?.parrot || setup.parrot].name : `${player + 1}. oyuncu papağanı`;
  return `<div class="avatar-slot" data-player="${player}"><img ${player === 0 ? 'data-player-avatar="idle"' : mode === 'local' ? 'data-local-avatar="idle"' : ''} class="game-avatar avatar-idle ${isKofen ? 'kofen-avatar' : 'player-parrot'}" src="${parrotFile(player)}" alt="${label}" /><img ${player === 0 ? 'data-player-avatar="cheer"' : mode === 'local' ? 'data-local-avatar="cheer"' : ''} class="game-avatar avatar-cheer" src="${parrotFile(player, 'cheer')}" alt="" aria-hidden="true" /></div>`;
}

function playerNames() {
  return mode === 'solo' ? ['Sen', parrots[game?.parrot || setup.parrot].name] : ['1. Oyuncu', '2. Oyuncu'];
}

function gameView() {
  const names = playerNames();
  return `<section class="game-stage illustrated-game" data-rule="${game.rule}" aria-label="Oyun ekranı">
    <h1 id="game-title" class="sr-only" tabindex="-1">6gen · ${rules[game.rule].name}</h1>
    <div class="game-toolbar"><button class="round-control game-art-button" data-action="leave" aria-label="Ana ekrana dön" title="Ana ekrana dön">${gameIcon('back', 'game-control-image')}</button>
      <div class="scoreboard">${gameSurface('scoreboard')}<div class="player-score">${avatar(0)}<span><strong>${names[0]}</strong></span><b id="score-left">${game.scores[0]}</b></div>
      <div class="timer-block" aria-label="Geçen süre">${gameIcon('time')}<strong id="timer">${formatElapsed(game.elapsed)}</strong></div>
      <div class="player-score opponent"><b id="score-right">${game.scores[1]}</b><span><strong>${names[1]}</strong></span>${avatar(1, mode === 'solo')}</div></div>
      <div class="game-tools">${soundButton(true)}<button class="round-control pause-button game-art-button" data-action="pause" aria-label="Mola ver" title="Mola ver">${gameIcon('pause', 'game-control-image')}</button></div></div>
    <div class="play-panel" data-rotating="${game.rotating}" data-symbol-set="${game.symbolSet}"><h2 class="board-title"><span class="sr-only">Ortak simgeyi bul!</span><img src="${baseUrl}assets/game-ui/title-find-leafy-v17.webp" alt="" draggable="false" /></h2>
      <span id="round-label" class="sr-only">1. eşleşme</span>
      <div id="board">${boardView()}</div><div class="match-feedback" role="status" aria-live="polite" id="match-feedback"></div>
    </div></section>`;
}

function cardPileView(player) {
  const count = game.hands[player].length;
  const art = player === 0 ? 'card-lavender-leafy-v21.webp' : 'card-mint-paired-v21.webp';
  const topArt = (game.pileFaces?.[player] ?? player) === 0 ? 'card-lavender-leafy-v21.webp' : 'card-mint-paired-v21.webp';
  const layers = Math.max(1, Math.min(count, 8));
  return `<div class="card-pile" data-pile-owner="${player}" data-pile-count="${count}" role="img" aria-label="${esc(playerNames()[player])}: ${count} kart"><span class="pile-cards" aria-hidden="true">${Array.from({ length: layers }, (_, index) => `<img src="${baseUrl}assets/game-ui/${index === layers - 1 ? topArt : art}" alt="" draggable="false" style="--pile-index:${index}" />`).join('')}</span><b aria-hidden="true">${count}</b></div>`;
}

function updateCardPiles() {
  app.querySelectorAll('.card-pile').forEach(pile => { pile.outerHTML = cardPileView(Number(pile.dataset.pileOwner)); });
}

function boardView() {
  const names = playerNames();
  const collect = game.rule === 'collect';
  const seaPier = (mode === 'solo' ? game.parrot : game.theme) === 'koak';
  return `<div class="game-cards ${mode === 'local' ? 'local-cards' : ''} ${seaPier ? 'sea-pier-cards' : ''}">${gameSurface(seaPier ? 'seaPierWide' : 'woodenStage')}<div class="player-card" data-owner="0">${gameSurface(seaPier ? 'seaPierCompact' : 'woodenStage')}${card(game.pair[0], collect ? 'right' : 'left', 'player-hex', !collect || mode === 'local', names[0])}${cardPileView(0)}</div><div class="player-card" data-owner="1">${gameSurface(seaPier ? 'seaPierCompact' : 'woodenStage')}${card(game.pair[1], collect ? 'left' : 'right', 'opponent-hex', collect || mode === 'local', names[1])}${cardPileView(1)}</div></div>`;
}

function resultView() {
  const result = matchWinner(game);
  const tied = result === null;
  const winnerIndex = result ?? 0;
  const winner = winnerIndex === 0 ? (mode === 'solo' ? 'Sen kazandın!' : '1. Oyuncu kazandı!') : (mode === 'solo' ? `Bu kez ${playerNames()[1]} kazandı!` : '2. Oyuncu kazandı!');
  const mascots = tied ? [0, 1] : [winnerIndex];
  const names = playerNames();
  const subtitle = tied ? 'Birlikte harika oynadınız!' : winnerIndex === 0 ? 'Harika eşleştirdin!' : 'Bir daha deneyelim mi?';
  return `<section class="result-panel illustrated-result" aria-labelledby="result-title">
    <div class="result-mascots${tied ? ' is-tied' : ''}" aria-hidden="true">${mascots.map(player => `<img ${player === 0 ? 'data-player-avatar="cheer"' : mode === 'local' ? 'data-local-avatar="cheer"' : ''} src="${parrotFile(player, 'cheer')}" alt="" draggable="false" />`).join('')}</div>
    ${gameSurface('resultPanel')}
    <div class="result-content">
    <div class="result-heading">
    <h1 id="result-title">${tied ? 'Dostluk kazandı!' : winner}</h1>
    <p class="result-subtitle">${subtitle}<br />İlk ${game.winTarget} doğru · ${rules[game.rule].name}</p>
    </div>
    <div class="result-score" aria-label="Oyun skoru">
      <span class="result-player"><span class="result-portrait"><img class="result-score-avatar" data-player-avatar="idle" src="${parrotFile(0)}" alt="" draggable="false" /></span><span class="result-score-copy"><small>${names[0]} · doğru</small><strong>${game.scores[0]}</strong></span></span>
      <span class="result-dash" aria-hidden="true">:</span>
      <span class="result-player result-opponent"><span class="result-score-copy"><small>${names[1]} · doğru</small><strong>${game.scores[1]}</strong></span><span class="result-portrait"><img class="result-score-avatar" ${mode === 'local' ? 'data-local-avatar="idle"' : ''} src="${parrotFile(1)}" alt="" draggable="false" /></span></span>
    </div>
    <div class="result-stats"><span>${gameIcon('check')} ${game.scores.reduce((a,b) => a+b,0)} eşleşme</span><span>${gameIcon('time')} ${Math.floor(game.elapsed/1000)} saniye</span></div>
    <div class="result-actions">
    <button class="primary-button result-art-button result-replay" data-action="start" aria-label="Bir daha oynayalım">${icon('playSolid')}<span>Bir daha oynayalım</span></button>
    <button class="text-button result-art-button result-home" data-action="home" aria-label="Ana ekrana dön">${icon('homeSolid')}<span>Ana ekrana dön</span></button>
    </div>
    </div>
  </section>`;
}

async function startGame() {
  if (mode === 'online' || starting) return;
  if (!getAuthState().user) { chooseMode(mode); return; }
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
    const theme = mode === 'solo' ? setup.parrot : setup.theme;
    const symbolSet = getSymbolSet(theme);
    const selectedPoses = [0, 1].flatMap(player => ['idle', 'cheer'].map(pose => parrotFile(player, pose)));
    await Promise.all([prepareImages([...gameAssets, ...selectedPoses, `${baseUrl}assets/game-ui/${symbolSet.file}`, ...(theme === 'koak' ? seaPierAssets : []), matchBackgroundUrl(), matchBackgroundUrl(true)]), document.fonts.ready]);
    if (request !== navigationId) return;
    // Preserve the complete previous view while the connected game lays out
    // and paints its first frame. There is no loading popup or blank screen.
    pendingScreen = app.cloneNode(true);
    pendingScreen.removeAttribute('id');
    pendingScreen.removeAttribute('aria-busy');
    pendingScreen.classList.add('pending-screen');
    pendingScreen.setAttribute('aria-hidden', 'true');
    document.body.append(pendingScreen);
    game = { ...createMatch({ ...setup, symbolPoolSize: symbolSet.rects.length }), symbolSet: symbolSet.key, elapsed: 0, paused: false, round: 1, lock: 0, phase: null, botWait: botDelay() };
    game.pair = currentPair(game);
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
    motion?.startHint(game.rule === 'collect' ? 1 : 0);
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

function formatElapsed(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function tick() {
  const now = performance.now();
  const delta = now - lastTick;
  lastTick = now;
  if (screen !== 'game' || game.paused) return;
  game.elapsed += delta;
  const timer = document.querySelector('#timer');
  timer.textContent = formatElapsed(game.elapsed);
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
    gameAudio.answer(false);
    clearTimeout(wrongFeedbackTimers.get(target));
    target.classList.add('wrong');
    wrongFeedbackTimers.set(target, setTimeout(() => {
      target.classList.remove('wrong');
      wrongFeedbackTimers.delete(target);
    }, 550));
    feedback('');
  }
}

function award(player) {
  if (game.lock > 0 || game.paused || screen !== 'game') return;
  const transfer = transferCard(game, player);
  if (!transfer) return;
  game.lock = MATCH_HOLD_MS;
  game.phase = 'match';
  document.querySelectorAll('.avatar-slot').forEach(slot => slot.classList.toggle('is-cheering', Number(slot.dataset.player) === player));
  gameAudio.answer(true);
  const shared = sharedSymbol(game.pair);
  const matched = [...document.querySelectorAll(`#board [data-symbol="${shared}"]`)];
  matched.forEach(element => element.classList.add('matched'));
  motion?.celebrate(matched);
  game.pileFaces ??= [0, 1];
  game.pileFaces[transfer.to] = transfer.from;
  updateCardPiles();
  motion?.transfer(transfer.from, transfer.to);
  document.querySelector('#score-left').textContent = game.scores[0];
  document.querySelector('#score-right').textContent = game.scores[1];
  feedback(`${playerNames()[player]} · +1 doğru!`, 'correct');
}

function nextRound() {
  if (matchComplete(game)) { finishGame(); return; }
  game.phase = 'out';
  game.lock = ROUND_OUT_MS;
  document.querySelector('#board').setAttribute('aria-busy', 'true');
  motion?.transition('out');
}

function dealNextRound() {
  document.querySelectorAll('.avatar-slot').forEach(slot => slot.classList.remove('is-cheering'));
  const focusWasOnCard = !!document.activeElement?.closest('.symbol');
  game.round++;
  game.pair = currentPair(game);
  game.botWait = botDelay();
  game.phase = 'in';
  game.lock = ROUND_IN_MS;
  document.querySelector('#board').innerHTML = boardView();
  document.querySelector('#round-label').textContent = `${game.round}. eşleşme`;
  motion?.sync();
  motion?.transition('in');
  feedback('');
  if (focusWasOnCard) document.querySelector('#board button:not(:disabled)')?.focus({ preventScroll: true });
}

function feedback(message, className = '') {
  const element = document.querySelector('#match-feedback');
  element.className = className === 'correct' ? 'sr-only' : `match-feedback ${className}`;
  element.innerHTML = message ? `${gameIcon(className === 'correct' ? 'check' : 'cross')} ${esc(message)}` : '';
}

async function finishGame() {
  if (screen !== 'game' || game.phase === 'finished') return;
  clearInterval(ticker);
  game.phase = 'finished';
  game.lock = Infinity;
  app.inert = true;
  const showResult = async () => {
    await prepareImages([matchBackgroundUrl()]).catch(() => {});
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

function rememberPlayMode(nextMode) {
  try { sessionStorage.setItem('comind.pending-mode', nextMode); } catch {}
}
async function chooseMode(nextMode) {
  if (!Object.hasOwn(modes, nextMode)) return;
  mode = nextMode;
  await refreshAuth();
  if (!getAuthState().user) {
    rememberPlayMode(nextMode);
    openModal('account');
    return;
  }
  if (nextMode === 'online') beginOnline();
  else openModal('setup');
}
function home() {
  stopOnline(); clearOnlineInvite();
  navigationId++; starting = false; modalAutoPaused = false;
  clearInterval(ticker); hideLoading(); app.inert = false;
  screen = 'home'; game = null; render();
  (app.querySelector(`[data-mode="${mode}"]`) || app.querySelector('#home-title')).focus({ preventScroll: true });
}

let onlineMarkup = '';
function syncOnline(skipResultTransition = false) {
  if (screen !== 'online') return;
  const onlineRoom = getOnlineRoom();
  const theme = onlineRoom?.options?.theme;
  const themedMatch = Object.hasOwn(gameWorlds, theme) && ['playing','finished'].includes(onlineRoom.status);
  app.toggleAttribute('data-online-world', themedMatch);
  if (themedMatch) {
    const background = app.querySelector('.forest-background');
    background?.style.setProperty('--match-background', `url('${baseUrl}assets/game-ui/${worldBackground(theme)}')`);
    background?.style.setProperty('--match-portrait-background', `url('${baseUrl}assets/game-ui/${worldBackground(theme,true)}')`);
  }
  if (!skipResultTransition && app.querySelector('.online-game') && ['finished','cancelled'].includes(getOnlineRoom()?.status)) {
    if (!onlineNavigating) void navigateOnline(() => syncOnline(true), true);
    return;
  }
  const markup = onlineView();
  if (markup !== onlineMarkup) {
    const active = document.activeElement;
    const symbol = active?.dataset.symbol;
    const action = active?.dataset.action;
    const actionValue = active?.dataset.value;
    const field = active?.dataset.onlineField;
    const selection = field ? [active.selectionStart, active.selectionEnd] : null;
    const scrolls = [...app.querySelectorAll('.online-tab-content,.online-friend-list')].map(el => el.scrollTop);
    const previousTab = app.querySelector('.online-tab-content')?.dataset.tab;
    const worldPickerOpen = app.querySelector('.online-world-picker')?.open;
    const worldSummaryFocused = active?.matches('.online-world-picker summary');
    app.querySelector('main').innerHTML = markup;
    const worldPicker = app.querySelector('.online-world-picker');
    if (worldPickerOpen && worldPicker) worldPicker.open = true;
    if (worldSummaryFocused) worldPicker?.querySelector('summary').focus({ preventScroll: true });
    onlineMarkup = markup;
    const content = app.querySelector('.online-tab-content');
    if (previousTab && content && previousTab !== content.dataset.tab && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      content.animate([{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
    }
    if (action === 'online-answer') app.querySelector(`[data-action="online-answer"][data-symbol="${symbol}"]`)?.focus({ preventScroll: true });
    else if (action?.startsWith('online-')) {
      const replacement = [...app.querySelectorAll(`[data-action="${action}"]`)].find(el => el.dataset.value === actionValue && !el.disabled);
      replacement?.focus({ preventScroll: true });
    }
    if (field) {
      const input = app.querySelector(`[data-online-field="${field}"]`);
      input?.focus({ preventScroll: true });
      if (input && selection) input.setSelectionRange(...selection);
    }
    app.querySelectorAll('.online-tab-content,.online-friend-list').forEach((el,i) => { el.scrollTop = scrolls[i] || 0; });
  }
  updateOnlineClock();
}
let onlineNavigating = false;
async function navigateOnline(change, result = false) {
  if (onlineNavigating) return;
  onlineNavigating = true;
  app.inert = true;
  const transitionClass = result ? 'online-result-navigation' : 'online-navigation';
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) change();
    else if (document.startViewTransition) {
      document.documentElement.classList.add(transitionClass);
      const transition = document.startViewTransition(() => { change(); app.inert = true; });
      await transition.finished.catch(() => {});
    } else {
      await app.querySelector('main').animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-5px)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      change(); app.inert = true;
      await app.querySelector('main').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' }).finished.catch(() => {});
    }
  } finally {
    document.documentElement.classList.remove(transitionClass);
    app.inert = false;
    onlineNavigating = false;
  }
}
async function beginOnline() {
  if (onlineNavigating) return;
  if (!getAuthState().user) { rememberPlayMode('online'); openModal('account'); return; }
  await closeModal({ resumeGame: false });
  clearInterval(ticker); hideLoading();
  await navigateOnline(() => {
    mode = 'online'; screen = 'online';
    enterOnline(syncOnline, correct => gameAudio.answer(correct)); onlineMarkup = ''; render(); syncOnline();
  });
  const code = new URL(location.href).searchParams.get('room');
  if (code && getAuthState().user) onlineAction('open', code);
}
let leavingOnline = false;
async function exitOnline() {
  if (leavingOnline) return;
  leavingOnline = true;
  try {
    await waitOnlineIdle();
    if (screen !== 'online') return;
    if (getOnlineRoom() && !['finished','cancelled'].includes(getOnlineRoom().status)) {
      await onlineAction('leave');
      if (getOnlineRoom() && !['finished','cancelled'].includes(getOnlineRoom().status)) return;
    }
    await closeModal({ resumeGame: false });
    await navigateOnline(home);
  } finally { leavingOnline = false; }
}

function updateAccountHeader() {
  const button = app.querySelector('[data-action="account"]');
  if (!button) return;
  const { user } = getAuthState();
  button.classList.toggle('is-signed-in', Boolean(user));
  button.setAttribute('aria-label', user ? `${user.name}, profilim` : 'Google ile giriş yap');
  if (user) {
    button.innerHTML = `<span class="account-badge-leaves is-left" aria-hidden="true"><i></i><i></i><i></i></span><span class="account-badge-leaves is-right" aria-hidden="true"><i></i><i></i><i></i></span><span class="account-nameplate" aria-hidden="true"></span>${playerFace('account-initial')}<span class="account-header-name">${esc(user.name)}</span>`;
  } else {
    button.innerHTML = `<img src="${baseUrl}assets/home-ui/login-clean-cream-v12.webp" alt="" width="2172" height="724" draggable="false" />`;
  }
}

function accountContents() {
  const { user, pending, message } = getAuthState();
  return `${gameSurface('resultPanel')}<img class="account-mascot" src="${baseUrl}assets/home-ui/account-mascot-mail-v34.webp" alt="" width="1536" height="1024" draggable="false" aria-hidden="true" />
    <div class="account-content"><h2 id="modal-title">Hoş geldin!</h2>
    <p class="account-description" id="account-description">${user ? `${esc(user.name)}<br />Hesabınla giriş yaptın.` : 'Google hesabını seç,<br />oyuna kaldığın yerden devam et.'}</p>
    <button type="button" class="account-google" data-action="${user ? 'signout' : 'google-signin'}" ${pending ? 'disabled aria-busy="true"' : ''}>${user ? '' : googleMark()}<span>${pending ? 'Biraz bekle…' : user ? 'Çıkış yap' : 'Google ile devam et'}</span></button>
    <p class="account-note">${user ? 'Hesabınla oynamaya hazırsın.' : 'İlk girişinde hesabın otomatik oluşturulur.'}</p>
    <p class="account-status" role="status" aria-live="polite" ${message ? '' : 'hidden'}>${esc(message)}</p></div>`;
}

function updateAccount() {
  syncPlayerAvatar(getAuthState().user);
  syncOnlineAuth();
  updateAccountHeader();
  app.querySelectorAll('[data-player-avatar]').forEach(image => { image.src = playerPortraitUrl(image.dataset.playerAvatar); });
  if (mode === 'local') app.querySelectorAll('[data-local-avatar]').forEach(image => { image.src = parrotFile(1, image.dataset.localAvatar); });
  const profileDialog = app.querySelector('dialog:is([data-kind="settings"],[data-kind="profile"])[open]');
  if (profileDialog) {
    const state = getAuthState();
    if (profileDialog.dataset.kind === 'profile' && !state.user) { openModal('account'); return; }
    const activeAction = document.activeElement?.dataset.action;
    profileDialog.querySelector('.settings-profile').outerHTML = settingsProfileView(state.user, { standalone:profileDialog.dataset.kind === 'profile', pending:state.pending, message:state.message });
    updateProfilePoints(profileDialog);
    if (activeAction === 'signout' && !state.pending) profileDialog.querySelector('[data-action="signout"]')?.focus({ preventScroll:true });
  }
  const dialog = app.querySelector('dialog[data-kind="account"][open]');
  if (!dialog) return;
  const activeAction = document.activeElement?.dataset.action;
  dialog.querySelector('#modal-content').innerHTML = `<button class="close-modal" data-action="close" aria-label="Pencereyi kapat">${icon('close')}</button>${accountContents()}`;
  if (['google-signin', 'signout'].includes(activeAction)) dialog.querySelector('.account-google')?.focus({ preventScroll: true });
}

function openModal(type) {
  if (type === 'profile' && !getAuthState().user) type = 'account';
  if (screen === 'game' && !game.paused) { modalAutoPaused = true; setGamePaused(true); }
  const dialog = document.querySelector('dialog');
  dialog.dataset.kind = type;
  dialog.classList.toggle('illustrated-modal', ['account', 'leave', 'pause', 'help', 'settings', 'profile', 'setup', 'leaderboard', 'invite'].includes(type));
  let content = '';
  if (type === 'help') {
    content = helpView();
  } else if (type === 'leaderboard') {
    content = leaderboardView();
  } else if (type === 'settings') {
    content = settingsView(getAuthState().user, soundButton());
  } else if (type === 'profile') {
    content = profileView(getAuthState().user, getAuthState());
  } else if (type === 'setup') {
    content = setupView(setup, difficulty, levels, mode);
  } else if (type === 'invite') {
    content = inviteView();
  } else if (type === 'account') {
    content = accountContents();
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
  else if (type === 'profile') dialog.setAttribute('aria-describedby', 'profile-description');
  else if (['leaderboard', 'invite'].includes(type)) dialog.setAttribute('aria-describedby', 'community-description');
  else dialog.removeAttribute('aria-describedby');
  dialog.showModal();
  dialog.scrollTop = 0;
  if (type === 'leaderboard') updateLeaderboard(dialog);
  if (['settings','profile'].includes(type)) updateProfilePoints(dialog);
  if (type === 'account') dialog.querySelector('.account-google').focus({ preventScroll: true });
  else if (type === 'leave') dialog.querySelector('.leave-continue').focus({ preventScroll: true });
  else if (type === 'pause') dialog.querySelector('.pause-continue').focus({ preventScroll: true });
  else if (type === 'help') dialog.querySelector('.help-ready').focus({ preventScroll: true });
  else if (['settings','profile'].includes(type)) dialog.querySelector('.profile-edit, .settings-profile-button').focus({ preventScroll: true });
  else if (type === 'setup') dialog.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
  else if (['leaderboard', 'invite'].includes(type)) dialog.querySelector('.community-ready').focus({ preventScroll: true });
  // Hide the composition as a whole while its images decode, including the
  // SVG image used by the help example. Never reveal a half-painted panel.
  dialog.classList.add('is-preparing');
  prepareImages(markupImages(content)).catch(() => {}).finally(() => {
    if (dialog.isConnected && dialog.dataset.kind === type) {
      dialog.classList.remove('is-preparing');
      if (dialog.open && !dialog.inert) {
        const preferred = dialog.querySelector('.account-google, .settings-profile-button, [data-option][aria-pressed="true"], .leave-continue, .help-ready, .community-ready');
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

// Capture before actions replace or disable their buttons, including submit buttons.
document.addEventListener('click', event => {
  const button = event.target.closest('button, summary, [role="button"]');
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || button.closest('[inert]')) return;
  if (['match', 'online-answer', 'sound'].includes(button.dataset.action)) return;
  gameAudio.click();
}, { capture: true });

app.addEventListener('click', event => {
  const worldPicker = app.querySelector('.online-world-picker[open]');
  if (worldPicker && !worldPicker.contains(event.target)) worldPicker.open = false;
  if (screen === 'online' && !app.inert && event.target.closest('.online-shell') && !event.target.closest('.online-panel')) {
    exitOnline();
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled || app.inert || target.closest('dialog')?.inert) return;
  const action = target.dataset.action;
  if (screen === 'result' && target.classList.contains('result-art-button')) {
    event.preventDefault();
    activateResultButton(target, action);
    return;
  }
  if (action === 'home') { event.preventDefault(); screen === 'game' ? openModal('leave') : home(); }
  else if (action === 'mode') chooseMode(target.dataset.mode);
  else if (action === 'online-join') onlineAction('join', app.querySelector('#room-code')?.value);
  else if (action === 'online-answer') onlineAction('answer', target.dataset.symbol);
  else if (action === 'online-confirm-leave') openModal('leave');
  else if (action === 'online-home') getOnlineRoom()?.status === 'playing' ? openModal('leave') : exitOnline();
  else if (action === 'online-leave') onlineAction('leave');
  else if (action.startsWith('online-')) onlineAction(action.slice(7), target.dataset.value);
  else if (action === 'level') {
    if (!Object.hasOwn(levels, target.dataset.level)) return;
    difficulty = target.dataset.level; savePreferences(difficulty, sound, setup); animateSetupChoice(target);
    target.closest('dialog').querySelectorAll('[data-level]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.level === difficulty)));
  }
  else if (action === 'setup-option') {
    const key = target.dataset.option;
    if (!['parrot', 'theme', 'symbolCount', 'winTarget', 'rule'].includes(key)) return;
    setup = normalizeSetup({ ...setup, [key]: ['symbolCount', 'winTarget'].includes(key) ? Number(target.dataset.value) : target.dataset.value });
    savePreferences(difficulty, sound, setup); updateSetup(target.closest('dialog'), setup); animateSetupChoice(target);
  }
  else if (action === 'start') startGame();
  else if (action === 'match') match(target);
  else if (action === 'pause') togglePause();
  else if (action === 'sound') { sound = !sound; gameAudio.setEnabled(sound); savePreferences(difficulty, sound, setup); document.querySelectorAll('.sound-button').forEach(button => { button.innerHTML = soundContents(button.classList.contains('game-sound')); button.setAttribute('aria-label', `Sesi ${sound ? 'kapat' : 'aç'}`); button.setAttribute('aria-pressed', sound); button.title = `Sesi ${sound ? 'kapat' : 'aç'}`; }); gameAudio.click(); }
  else if (action === 'settings-tab') {
    const content = target.closest('.settings-content');
    content.dataset.tab = target.dataset.tab;
    content.querySelectorAll('[data-action="settings-tab"]').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
  }
  else if (action === 'profile-edit' || action === 'profile-cancel') {
    const profile = target.closest('.settings-profile');
    profile.outerHTML = settingsProfileView(getAuthState().user, { editing: action === 'profile-edit', standalone: target.closest('dialog').dataset.kind === 'profile', pending: getAuthState().pending, message: getAuthState().message });
    updateProfilePoints(target.closest('dialog') || document.querySelector('dialog[open]'));
    const updated = app.querySelector('.settings-profile');
    if (action === 'profile-edit') {
      updated.querySelector('input:checked')?.focus({ preventScroll: true });
      prepareImages(Object.keys(playerAvatars).map(avatar => playerPortraitUrl('idle', avatar))).catch(() => {});
    } else updated.querySelector('.profile-edit')?.focus({ preventScroll: true });
  }
  else if (action === 'copy-player-code') copyPlayerCode(target);
  else if (action === 'profile') closeModal().then(() => openModal(getAuthState().user ? 'profile' : 'account'));
  else if (action === 'account') openModal(getAuthState().user ? 'profile' : 'account');
  else if (action === 'close') closeModal();
  else if (action === 'ranking') updateLeaderboard(target.closest('dialog'), target.dataset.rankNav);
  else if (action === 'google-signin') signInWithGoogle();
  else if (action === 'signout') signOut();
  else if (action === 'confirm-home') screen === 'online' ? exitOnline() : closeModal({ resumeGame: false }).then(home);
  else if (['help', 'leaderboard', 'leave', 'settings'].includes(action)) openModal(action);
});

app.addEventListener('input', event => {
  if (event.target.dataset.onlineField) setOnlineInput(event.target.dataset.onlineField, event.target.value);
});

app.addEventListener('change', event => {
  if (!event.target.matches('#profile-avatar-form input[name="avatar"]')) return;
  const image = event.target.closest('.settings-profile').querySelector('.profile-initial img');
  image.src = playerPortraitUrl('idle', event.target.value);
});

async function copyPlayerCode(button) {
  const code = getAuthState().user?.publicCode;
  if (!code) return;
  const status = button.closest('.profile-id').querySelector('.profile-copy-status');
  try {
    await navigator.clipboard.writeText(code);
    button.innerHTML = icon('check');
    button.setAttribute('aria-label', 'Kullanıcı ID kopyalandı');
    status.textContent = 'Kopyalandı!';
  } catch { status.textContent = 'Kopyalanamadı. Kodu seçip kopyalayabilirsin.'; }
}

app.addEventListener('submit', async event => {
  if (event.target.dataset.onlineForm) {
    event.preventDefault();
    onlineAction(event.target.dataset.onlineForm);
    return;
  }
  if (event.target.id === 'profile-avatar-form') {
    event.preventDefault();
    const form = event.target;
    if (form.getAttribute('aria-busy') === 'true') return;
    const avatar = form.elements.avatar.value;
    if (!Object.hasOwn(playerAvatars, avatar)) return;
    const status = form.querySelector('.profile-status');
    form.setAttribute('aria-busy', 'true');
    form.querySelectorAll('input,button').forEach(control => { control.disabled = true; });
    status.textContent = 'Papağanın hazırlanıyor…';
    try {
      await prepareImages([playerPortraitUrl('idle', avatar), playerPortraitUrl('cheer', avatar)]);
      if (getAuthState().user) await updatePlayerAvatar(avatar);
      else { saveGuestAvatar(avatar); updateAccount(); }
      app.querySelector('.profile-edit')?.focus({ preventScroll: true });
    } catch (error) {
      status.textContent = error.message || 'Kaydedilemedi. Yeniden deneyebilirsin.';
      form.removeAttribute('aria-busy');
      form.querySelectorAll('input,button').forEach(control => { control.disabled = false; });
    }
    return;
  }
  if (event.target.id !== 'redeem-form') return;
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button');
  if (button.disabled) return;
  const status = form.closest('.settings-redeem').querySelector('#redeem-status');
  button.disabled = true; form.setAttribute('aria-busy', 'true'); status.textContent = 'Kod kontrol ediliyor…';
  try {
    const result = await redeemCode(form.elements.code.value);
    status.textContent = result.message;
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; form.removeAttribute('aria-busy'); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'game' && !starting && !game.paused) togglePause();
});
document.addEventListener('keydown', event => {
  const worldPicker = app.querySelector('.online-world-picker[open]');
  if (event.code === 'Escape' && worldPicker) {
    event.preventDefault(); worldPicker.open = false;
    worldPicker.querySelector('summary').focus({ preventScroll: true });
    return;
  }
  if (event.code === 'Escape' && starting) { event.preventDefault(); home(); return; }
  if (event.code === 'Escape' && screen === 'game' && !document.querySelector('dialog').open) togglePause();
});
render();
onAuthChange(updateAccount);
const returningFromGoogle = consumeAuthResult();
refreshAuth().then(() => {
  if (new URL(location.href).searchParams.has('room')) beginOnline();
  else if (returningFromGoogle) {
    let requestedMode;
    try { requestedMode = sessionStorage.getItem('comind.pending-mode'); } catch {}
    if (getAuthState().user && Object.hasOwn(modes, requestedMode)) {
      try { sessionStorage.removeItem('comind.pending-mode'); } catch {}
      chooseMode(requestedMode);
    } else openModal('account');
  }
});

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

