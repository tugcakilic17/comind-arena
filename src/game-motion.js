import { symbolRects } from './game-ui.js';
import { baseUrl } from './assets.js';

export const MATCH_HOLD_MS = 760;
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
  let group;
  let roundTween;
  let matchTween;
  let pose = { alpha: 1, y: 0 };
  let matchState;
  const decorations = new Set();
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
      if (!preserve.includes(record)) place(record);
    });
  }

  function syncLayout() {
    if (!scene || !alive || !panel.isConnected) return;
    const rect = host.getBoundingClientRect();
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    engine.scale.resize(Math.round(rect.width * pixelRatio), Math.round(rect.height * pixelRatio));
    const buttons = [...panel.querySelectorAll('#board .symbol')];
    const live = new Set(buttons);
    records.forEach((record, button) => {
      if (!live.has(button)) { scene.tweens.killTweensOf(record.sprite); record.sprite.destroy(); records.delete(button); }
    });
    // Read the complete layout before writing any canvas object properties.
    const layout = buttons.map(button => {
      const art = button.querySelector('.game-symbol-art');
      const box = art.getBoundingClientRect();
      const style = getComputedStyle(button);
      const inheritedScale = Number(style.getPropertyValue('--size')) || 1;
      const artScale = parseFloat(getComputedStyle(art.parentElement).scale) || 1;
      return { button, x: (box.x + box.width / 2 - rect.x) * pixelRatio,
        y: (box.y + box.height / 2 - rect.y - pose.y) * pixelRatio,
        width: art.offsetWidth * inheritedScale * artScale * pixelRatio,
        height: art.offsetHeight * inheritedScale * artScale * pixelRatio,
        angle: parseFloat(style.getPropertyValue('--tilt')) || 0 };
    });
    layout.forEach(({ button, x, y, width, height, angle }) => {
      let record = records.get(button);
      if (!record) {
        const sprite = scene.add.image(0, 0, 'symbols', button.dataset.symbol);
        group.add(sprite);
        record = { sprite, button };
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
      group.add(glint); decorations.add(glint);
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
      startTurn: record.sprite.angle - record.angle }));
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
    const record = records.get(button);
    if (!scene || !record || reduced.matches || correct) return;
    scene.tweens.killTweensOf(record.sprite);
    scene.tweens.chain({ targets: record.sprite, tweens: [
      { scaleX: record.scaleX, scaleY: record.scaleY, angle: record.angle - 4, duration: 110, ease: 'Sine.easeOut' },
      { angle: record.angle, duration: 150, ease: 'Sine.easeInOut' },
    ] });
  }

  function hover(event, entering) {
    const button = event.target.closest?.('.symbol');
    const record = records.get(button);
    if (!scene || !record || paused || reduced.matches || event.pointerType === 'touch' || button.disabled || panel.dataset.roundTransition || panel.dataset.matchedSprites) return;
    if (button.contains(event.relatedTarget)) return;
    scene.tweens.killTweensOf(record.sprite);
    if (entering) {
      scene.tweens.chain({ targets: record.sprite, tweens: [
        { scaleX: record.scaleX * 1.075, scaleY: record.scaleY * 1.075,
          angle: record.angle + 5, duration: 160, ease: 'Sine.easeOut' },
        { angle: record.angle - 2, duration: 100, ease: 'Sine.easeInOut' },
        { angle: record.angle + 2, duration: 110, ease: 'Sine.easeInOut' },
      ] });
    } else {
      scene.tweens.add({ targets: record.sprite, scaleX: record.scaleX,
        scaleY: record.scaleY, angle: record.angle, duration: 170, ease: 'Sine.easeOut' });
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

  function motionPreferenceChanged() {
    resetMatch(); settle(); syncLayout();
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
          this.load.image('symbols', `${baseUrl}assets/game-ui/symbols-atlas-v14.webp`);
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
          symbolRects.forEach(([x, y, width, height], id) => this.textures.get('symbols').add(String(id), 0, x - 2, y - 2, width + 4, height + 4));
          group = this.add.container(0, 0);
          syncLayout();
          if (pendingMatch?.every(element => element.isConnected)) celebrate(pendingMatch);
          if (paused) this.tweens.setGlobalTimeScale(0);
          engine.events.once(Phaser.Core.Events.POST_RENDER, () => {
            clearTimeout(bootTimeout);
            resolveReady();
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
    ready, tap, celebrate, transition, settle,
    sync() { resetMatch(); settle(); syncLayout(); },
    // Keep the manager's clock current during a pause so resuming cannot consume
    // the paused wall time as animation progress (including very short pauses).
    pause(value) { paused = value; scene?.tweens.setGlobalTimeScale(value ? 0 : 1); },
    destroy() {
      alive = false;
      clearTimeout(bootTimeout); resolveReady();
      observer.disconnect(); cancelAnimationFrame(resizeFrame);
      reduced.removeEventListener('change', motionPreferenceChanged);
      panel.removeEventListener('pointerover', over); panel.removeEventListener('pointerout', out);
      resetMatch(); roundTween?.destroy();
      panel.classList.remove('phaser-ready');
      if (engine) { scene?.tweens.setGlobalTimeScale(1); engine.destroy(true); }
      host.remove(); records.clear(); scene = null;
    },
  };
}
