import { getSymbolSet } from './symbol-sets.js';
import { baseUrl } from './assets.js';

export const MATCH_HOLD_MS = 960;
export const ROUND_OUT_MS = 160;
export const ROUND_IN_MS = 220;

let phaserModule;
export function preloadGameMotion() {
  phaserModule ||= import('phaser').catch(error => { phaserModule = null; throw error; });
  return phaserModule;
}

// Phaser draws and animates the existing PNG symbols. Native buttons remain the
// input and accessibility layer, with a complete visible fallback while loading.
export function createGameMotion(panel) {
  const symbolSet = getSymbolSet(panel.dataset.symbolSet);
  const host = document.createElement('div');
  host.className = 'phaser-layer';
  host.setAttribute('aria-hidden', 'true');
  panel.append(host);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let alive = true;
  let fallback = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const bootTimeout = setTimeout(useFallback, 4000);
  let engine;
  let scene;
  let paused = false;
  let resizeFrame;
  let pendingMatch;
  let pixelRatio = 1;
  let records = new Map();
  const cardLayers = new Map();
  let group;
  let roundTween;
  let matchTween;
  let pose = { alpha: 1, y: 0 };
  let matchState;
  const decorations = new Set();
  let transferAnimation;
  let transferHost;
  let hintArt;
  let hintAnimation;
  let hintOwner = null;
  let transferDestination;
  panel.dataset.motion = 'loading';

  function useFallback() {
    if (!alive) return;
    fallback = true;
    clearTimeout(bootTimeout);
    panel.classList.remove('phaser-ready');
    panel.dataset.motion = 'fallback';
    engine?.destroy(true);
    host.replaceChildren();
    scene = null;
    positionCardPiles();
    resolveReady();
  }

  function applyPose() {
    const cards = panel.querySelector('.game-cards');
    // Keep the wooden supports fixed while the cards and symbols change together.
    cards?.querySelectorAll('.hex-card').forEach(card => {
      card.style.opacity = pose.alpha;
      card.style.transform = `translateY(${pose.y}px)`;
    });
    group?.setAlpha(pose.alpha).setY(pose.y * pixelRatio);
  }

  function place(record, amount = 1, turn = 0, lift = 0) {
    record.sprite.setPosition(record.x, record.y + lift * pixelRatio)
      .setScale(record.scaleX * amount, record.scaleY * amount)
      .setAngle(record.angle + turn);
  }

  function stopEffect(record) {
    scene?.tweens.killTweensOf(record.effect);
  }

  function clearWrongTint(record) {
    record.wrongTintTimer?.remove();
    record.wrongTintTimer = null;
    record.sprite.setTexture('symbols', record.button.dataset.symbol);
  }

  function renderEffect(record) {
    // Tween a relative offset: Phaser wraps its angle accessor to ±180°, which
    // turns absolute 270° → 275° tweens into an unintended full revolution.
    place(record, record.effect.size, record.effect.turn);
  }

  function clearDecorations() {
    decorations.forEach(sprite => { scene?.tweens.killTweensOf(sprite); sprite.destroy(); });
    decorations.clear();
  }

  function resetMatch(preserve = []) {
    matchTween?.destroy();
    matchTween = null;
    matchState = null;
    pendingMatch = null;
    clearDecorations();
    delete panel.dataset.matchAnimating;
    delete panel.dataset.matchedSprites;
    records.forEach(record => {
      scene?.tweens.killTweensOf(record.sprite);
      stopEffect(record);
      clearWrongTint(record);
      Object.assign(record.effect, { size: 1, turn: 0 });
      if (!preserve.includes(record)) place(record);
    });
  }

  function positionCardPiles() {
    const pileRatio = Number(getComputedStyle(panel).getPropertyValue('--pile-width-ratio')) || 0;
    panel.querySelectorAll('#board .player-card').forEach(player => {
      const pile = player.querySelector('.card-pile');
      const card = player.querySelector('.hex-card');
      if (!pile || !card) return;
      const parent = player.getBoundingClientRect(), box = card.getBoundingClientRect();
      const size = pileRatio ? box.width * pileRatio : Math.min(76, box.width * .2);
      const left = player.dataset.owner === '0' ? box.left - parent.left + box.width * .08 - size * .35 : box.right - parent.left - box.width * .08 - size * .65;
      pile.style.cssText = `left:${Math.max(0, Math.min(parent.width - size, left))}px;top:${box.bottom - parent.top - box.height * .044 - size * .82}px;width:${size}px;height:${size * 1.04}px`;
    });
  }

  function syncLayout() {
    positionCardPiles();
    if (!scene || !alive || !panel.isConnected) return;
    const rect = host.getBoundingClientRect();
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    engine.scale.resize(Math.round(rect.width * pixelRatio), Math.round(rect.height * pixelRatio));
    const buttons = [...panel.querySelectorAll('#board .symbol')];
    const live = new Set(buttons);
    records.forEach((record, button) => {
      if (!live.has(button)) { stopEffect(record); clearWrongTint(record); scene.tweens.killTweensOf(record.sprite); record.sprite.destroy(); records.delete(button); }
    });
    const tables = [...panel.querySelectorAll('#board .hex-turntable')];
    cardLayers.forEach((layer, table) => {
      if (!tables.includes(table)) { layer.destroy(); cardLayers.delete(table); }
    });
    const centers = new Map(tables.map(table => {
      const box = table.getBoundingClientRect();
      const matrix = new DOMMatrix(getComputedStyle(table).transform);
      return [table, { x: (box.x + box.width / 2 - rect.x) * pixelRatio,
        y: (box.y + box.height / 2 - rect.y - pose.y) * pixelRatio,
        angle: Math.atan2(matrix.b, matrix.a) }];
    }));
    // Read the complete layout before writing any canvas object properties.
    const layout = buttons.map(button => {
      const art = button.querySelector('.game-symbol-art');
      const box = art.getBoundingClientRect();
      const style = getComputedStyle(button);
      const inheritedScale = Number(style.getPropertyValue('--size')) || 1;
      const artScale = parseFloat(getComputedStyle(art.parentElement).scale) || 1;
      const table = button.closest('.hex-turntable');
      const center = centers.get(table);
      const dx = (box.x + box.width / 2 - rect.x) * pixelRatio - center.x;
      const dy = (box.y + box.height / 2 - rect.y - pose.y) * pixelRatio - center.y;
      // The container supplies the card's rotation. Store the resting pose in
      // card-local coordinates so the original symbol tweens remain unchanged.
      return { button, table, x: dx * Math.cos(center.angle) + dy * Math.sin(center.angle),
        y: -dx * Math.sin(center.angle) + dy * Math.cos(center.angle),
        width: art.offsetWidth * inheritedScale * artScale * pixelRatio,
        height: art.offsetHeight * inheritedScale * artScale * pixelRatio,
        angle: parseFloat(style.getPropertyValue('--tilt')) || 0 };
    });
    centers.forEach((center, table) => {
      let layer = cardLayers.get(table);
      if (!layer) { layer = scene.add.container(0, 0); group.add(layer); cardLayers.set(table, layer); }
      layer.setPosition(center.x, center.y).setRotation(center.angle);
    });
    layout.forEach(({ button, table, x, y, width, height, angle }) => {
      let record = records.get(button);
      if (!record) {
        const sprite = scene.add.image(0, 0, 'symbols', button.dataset.symbol);
        const layer = cardLayers.get(table);
        layer.add(sprite);
        record = { sprite, button, layer, effect: { size: 1, turn: 0 } };
        records.set(button, record);
      }
      Object.assign(record, { x, y, angle, scaleX: width / record.sprite.width, scaleY: height / record.sprite.height });
      place(record);
    });
    applyPose();
    if (matchState) renderMatch();
    panel.classList.add('phaser-ready');
    panel.dataset.motion = 'ready';
    host.dataset.spriteCount = records.size;
  }

  function scheduleLayout() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(syncLayout);
  }

  function renderMatch() {
    if (!matchState) return;
    matchState.records.forEach(({ record, startX, startY, startTurn }, index) => {
      record.sprite.setPosition(record.x, record.y + matchState.lift * pixelRatio)
        .setScale(record.scaleX * (matchState.size + (startX - 1) * matchState.blend),
          record.scaleY * (matchState.size + (startY - 1) * matchState.blend))
        .setAngle(record.angle + matchState.turn * (index ? -1 : 1) + startTurn * matchState.blend);
    });
  }

  function sparkle(record) {
    if (reduced.matches) return;
    const radius = Math.max(record.sprite.displayWidth, record.sprite.displayHeight) / 2;
    // Four small raster glints, local to the found symbol; never a full-screen burst.
    for (let index = 0; index < 4; index++) {
      const angle = (index * Math.PI / 2) + Math.PI / 4;
      const x = record.x + Math.cos(angle) * radius * .65;
      const y = record.y + Math.sin(angle) * radius * .65;
      const glint = scene.add.image(x, y, 'glint').setDisplaySize(10 * pixelRatio, 10 * pixelRatio).setAlpha(0);
      record.layer.add(glint); decorations.add(glint);
      scene.tweens.add({ targets: glint, alpha: .8, duration: 100, delay: 100 });
      scene.tweens.add({ targets: glint, x: record.x + Math.cos(angle) * (radius + 13 * pixelRatio),
        y: record.y + Math.sin(angle) * (radius + 13 * pixelRatio), alpha: 0,
        angle: 35, delay: 200, duration: 310, ease: 'Sine.easeOut',
        onComplete: () => { decorations.delete(glint); glint.destroy(); } });
    }
  }

  function celebrate(elements) {
    if (!scene) { pendingMatch = elements; return; }
    const matched = elements.map(element => records.get(element)).filter(Boolean);
    if (!matched.length) return;
    // Start exactly where hover left the artwork. There is no separate press /
    // release bounce or reset frame before the shared match movement.
    const starts = matched.map(record => ({ record,
      startX: record.sprite.scaleX / record.scaleX,
      startY: record.sprite.scaleY / record.scaleY,
      startTurn: record.effect.turn }));
    resetMatch(matched);
    matched.forEach(record => { scene.tweens.killTweensOf(record.sprite); record.sprite.setDepth(2); });
    panel.dataset.matchAnimating = 'true';
    panel.dataset.matchedSprites = matched.length;
    matchState = { records: starts, size: 1, turn: 0, lift: 0, blend: 1 };
    if (reduced.matches) return;
    matched.forEach(sparkle);
    matchTween = scene.tweens.chain({ targets: matchState, tweens: [
      { blend: 0, size: 1.24, turn: 11, lift: -7, duration: 240, ease: 'Sine.easeOut', onUpdate: renderMatch },
      { size: 1, turn: 0, lift: 0, duration: 310, ease: 'Sine.easeInOut', onUpdate: renderMatch },
    ], onComplete: () => {
      if (!alive) return;
      matched.forEach(record => place(record));
      delete panel.dataset.matchAnimating;
      matchState = null;
    } });
  }

  function tap(button, correct) {
    stopHint();
    const record = records.get(button);
    if (!scene || !record || correct) return;
    clearWrongTint(record);
    record.sprite.setTexture('symbols-wrong', button.dataset.symbol);
    record.wrongTintTimer = scene.time.delayedCall(550, () => clearWrongTint(record));
    if (reduced.matches) return;
    stopEffect(record);
    scene.tweens.chain({ targets: record.effect, tweens: [
      { size: 1, turn: -4, duration: 110, ease: 'Sine.easeOut', onUpdate: () => renderEffect(record) },
      { turn: 0, duration: 150, ease: 'Sine.easeInOut', onUpdate: () => renderEffect(record) },
    ] });
  }

  function hover(event, entering) {
    const button = event.target.closest?.('.symbol');
    const record = records.get(button);
    if (!scene || !record || paused || reduced.matches || event.pointerType === 'touch' || button.disabled || panel.dataset.roundTransition || panel.dataset.matchedSprites) return;
    if (button.contains(event.relatedTarget)) return;
    stopEffect(record);
    if (entering) {
      scene.tweens.chain({ targets: record.effect, tweens: [
        { size: 1.075, turn: 5, duration: 160, ease: 'Sine.easeOut', onUpdate: () => renderEffect(record) },
        { turn: -2, duration: 100, ease: 'Sine.easeInOut', onUpdate: () => renderEffect(record) },
        { turn: 2, duration: 110, ease: 'Sine.easeInOut', onUpdate: () => renderEffect(record) },
      ] });
    } else {
      scene.tweens.add({ targets: record.effect, size: 1, turn: 0, duration: 170, ease: 'Sine.easeOut', onUpdate: () => renderEffect(record) });
    }
  }
  const over = event => hover(event, true);
  const out = event => hover(event, false);
  panel.addEventListener('pointerover', over);
  panel.addEventListener('pointerout', out);

  function transition(direction) {
    resetMatch();
    roundTween?.destroy();
    const entering = direction === 'in';
    panel.dataset.roundTransition = direction;
    if (!scene || reduced.matches) { pose = { alpha: 1, y: 0 }; applyPose(); return; }
    pose = entering ? { alpha: 0, y: 9 } : { alpha: 1, y: 0 };
    applyPose();
    roundTween = scene.tweens.add({ targets: pose, alpha: entering ? 1 : 0, y: entering ? 0 : -7,
      duration: entering ? ROUND_IN_MS : ROUND_OUT_MS, ease: 'Sine.easeInOut', onUpdate: applyPose });
  }

  function settle() {
    roundTween?.destroy(); roundTween = null;
    pose = { alpha: 1, y: 0 }; applyPose();
    delete panel.dataset.roundTransition;
  }

  function clearTransfer() {
    transferAnimation?.cancel(); transferAnimation = null;
    transferHost?.remove(); transferHost = null;
    transferDestination?.removeAttribute('data-receiving'); transferDestination = null;
  }

  function stopHint(clearOwner = true) {
    hintAnimation?.cancel(); hintAnimation = null;
    if (hintArt) { hintArt.style.removeProperty('filter'); hintArt.closest('.hex-card')?.removeAttribute('data-input-hint'); }
    hintArt = null;
    if (clearOwner) hintOwner = null;
  }

  function startHint(owner) {
    stopHint(false);
    hintOwner = owner;
    const art = panel.querySelector(`[data-owner="${owner}"] .hex-art`);
    if (!art) return;
    hintArt = art;
    art.closest('.hex-card').dataset.inputHint = 'true';
    const resting = `brightness(1) ${getComputedStyle(art).filter}`;
    const lit = 'brightness(1.18) drop-shadow(0 0 18px #ffd56be6)';
    if (reduced.matches) {
      art.style.filter = 'brightness(1.08) drop-shadow(0 0 12px #ffe5a3aa)';
      return;
    }
    hintAnimation = art.animate([{ filter: resting }, { filter: lit, offset: .5 }, { filter: resting }], { duration: 1300, iterations: Infinity, easing: 'ease-in-out' });
    hintAnimation.finished.catch(() => {});
  }

  function transfer(from, to) {
    clearTransfer();
    positionCardPiles();
    if (reduced.matches) return;
    const source = panel.querySelector(`[data-owner="${from}"] .hex-card`);
    const destination = panel.querySelector(`.card-pile[data-pile-owner="${to}"]`);
    const topCard = destination?.querySelector('.pile-cards img:last-child');
    if (!source || !topCard) return;
    const box = panel.getBoundingClientRect();
    const start = source.getBoundingClientRect();
    const end = topCard.getBoundingClientRect();
    const targetStyle = getComputedStyle(topCard);
    const targetMatrix = new DOMMatrix(targetStyle.transform);
    const targetAngle = Math.atan2(targetMatrix.b, targetMatrix.a) * 180 / Math.PI + (parseFloat(targetStyle.rotate) || 0);
    const sourceMatrix = new DOMMatrix(getComputedStyle(source.querySelector('.hex-turntable')).transform);
    const sourceAngle = Math.atan2(sourceMatrix.b, sourceMatrix.a) * 180 / Math.PI;
    const endAngle = sourceAngle + ((targetAngle - sourceAngle + 540) % 360 - 180);
    const host = document.createElement('div');
    host.className = 'card-transfer'; host.setAttribute('aria-hidden', 'true'); host.inert = true;
    host.style.cssText = `left:${start.left - box.left}px;top:${start.top - box.top}px;width:${start.width}px;height:${start.height}px`;
    const clone = source.cloneNode(true);
    clone.querySelectorAll('button').forEach(button => { button.disabled = true; button.tabIndex = -1; });
    // Animate the whole card from its current angle into the top card's pose.
    clone.querySelector('.hex-turntable').style.transform = 'none';
    host.append(clone); panel.append(host); transferHost = host;
    const x = end.left + end.width / 2 - start.left - start.width / 2;
    const y = end.top + end.height / 2 - start.top - start.height / 2;
    const scaleX = topCard.offsetWidth / start.width;
    const scaleY = topCard.offsetHeight / start.height;
    destination.dataset.receiving = 'true'; transferDestination = destination;
    host.dataset.destinationOwner = String(to);
    transferAnimation = host.animate([
      { transform: `translate(0,-8px) rotate(${sourceAngle}deg) scale(.96)`, opacity: .95 },
      { transform: `translate(${x * .65}px,${y * .65 - 20}px) rotate(${sourceAngle + (endAngle - sourceAngle) * .55}deg) scale(.72)`, opacity: 1, offset: .62 },
      { transform: `translate(${x}px,${y}px) rotate(${endAngle}deg) scale(${scaleX},${scaleY})`, opacity: 1, offset: .94 },
      { transform: `translate(${x}px,${y}px) rotate(${endAngle}deg) scale(${scaleX},${scaleY})`, opacity: 1 },
    ], { duration: 880, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    transferAnimation.finished.then(() => {
      if (transferHost !== host) return;
      clearTransfer();
      destination.querySelector('.pile-cards')?.animate([{ transform: 'translateY(0) scaleY(1)' }, { transform: 'translateY(2px) scaleY(.97)', offset: .35 }, { transform: 'translateY(0) scaleY(1)' }], { duration: 180, easing: 'ease-out' });
    }).catch(() => {});
  }

  function motionPreferenceChanged() {
    const owner = hintOwner;
    stopHint(); clearTransfer(); resetMatch(); settle(); syncLayout();
    if (owner !== null) startHint(owner);
  }
  reduced.addEventListener('change', motionPreferenceChanged);
  const observer = new ResizeObserver(scheduleLayout);
  observer.observe(panel);
  document.fonts.ready.then(() => { if (alive) scheduleLayout(); });

  async function boot() {
    try {
      const { default: Phaser } = await preloadGameMotion();
      if (!alive || fallback || !panel.isConnected) return;
      class SymbolsScene extends Phaser.Scene {
        preload() {
          this.load.image('symbols', `${baseUrl}assets/game-ui/${symbolSet.file}`);
          this.load.image('glint', `${baseUrl}assets/game-ui/spark-hd-v16.webp`);
          this.load.once('loaderror', () => { fallback = true; });
        }
        create() {
          if (!alive) return;
          if (fallback || !this.textures.exists('symbols') || !this.textures.exists('glint')) {
            // Let Phaser finish this create callback before disposing its scene.
            queueMicrotask(useFallback);
            return;
          }
          scene = this;
          // Canvas rendering needs a tinted texture; Phaser's setTint only
          // affects WebGL. Source-atop preserves the artwork's transparency.
          const source = this.textures.get('symbols').getSourceImage();
          const wrongTexture = this.textures.createCanvas('symbols-wrong', source.width, source.height);
          const context = wrongTexture.context;
          context.drawImage(source, 0, 0);
          context.globalCompositeOperation = 'source-atop';
          context.fillStyle = 'rgba(239, 90, 90, .3)';
          context.fillRect(0, 0, source.width, source.height);
          context.globalCompositeOperation = 'source-over';
          wrongTexture.refresh();
          symbolSet.rects.forEach(([x, y, width, height], id) => {
            for (const key of ['symbols', 'symbols-wrong']) this.textures.get(key).add(String(id), 0, x - 2, y - 2, width + 4, height + 4);
          });
          group = this.add.container(0, 0);
          syncLayout();
          if (pendingMatch?.every(element => element.isConnected)) celebrate(pendingMatch);
          if (paused) this.tweens.setGlobalTimeScale(0);
          engine.events.once(Phaser.Core.Events.POST_RENDER, () => {
            clearTimeout(bootTimeout);
            resolveReady();
          });
        }
        update() {
          // Read the same CSS rotation used by the native hit targets. Only
          // the card container rotates; hover/click tween values stay intact.
          if (panel.dataset.rotating !== 'true' || paused) return;
          cardLayers.forEach((layer, table) => {
            const matrix = new DOMMatrix(getComputedStyle(table).transform);
            layer.setRotation(Math.atan2(matrix.b, matrix.a));
          });
        }
      }
      const rect = host.getBoundingClientRect();
      pixelRatio = Math.min(devicePixelRatio || 1, 2);
      engine = new Phaser.Game({ type: Phaser.CANVAS, parent: host,
        width: Math.round(rect.width * pixelRatio), height: Math.round(rect.height * pixelRatio),
        transparent: true, banner: false, audio: { noAudio: true },
        input: { keyboard: false, mouse: false, touch: false, gamepad: false },
        render: { antialias: true, roundPixels: false, pixelArt: false },
        fps: { target: 60 }, scene: SymbolsScene,
      });
      engine.canvas.setAttribute('aria-hidden', 'true');
      engine.canvas.setAttribute('role', 'presentation');
      engine.canvas.setAttribute('tabindex', '-1');
    } catch {
      if (!alive) return;
      useFallback();
    }
  }
  boot();

  return {
    ready, tap, celebrate, transition, settle, transfer, startHint,
    sync() { clearTransfer(); resetMatch(); settle(); syncLayout(); if (hintOwner !== null) startHint(hintOwner); },
    // Keep the manager's clock current during a pause so resuming cannot consume
    // the paused wall time as animation progress (including very short pauses).
    pause(value) { paused = value; scene?.tweens.setGlobalTimeScale(value ? 0 : 1); for (const animation of [transferAnimation, hintAnimation]) if (animation) value ? animation.pause() : animation.play(); },
    destroy() {
      alive = false;
      clearTimeout(bootTimeout); resolveReady();
      observer.disconnect(); cancelAnimationFrame(resizeFrame);
      reduced.removeEventListener('change', motionPreferenceChanged);
      panel.removeEventListener('pointerover', over); panel.removeEventListener('pointerout', out);
      stopHint(); clearTransfer(); resetMatch(); roundTween?.destroy();
      panel.classList.remove('phaser-ready');
      if (engine) { scene?.tweens.setGlobalTimeScale(1); engine.destroy(true); }
      host.remove(); records.clear(); cardLayers.clear(); scene = null;
    },
  };
}
