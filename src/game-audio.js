import { baseUrl } from './assets.js';

export function createGameAudio(initiallyEnabled = false) {
  let enabled = initiallyEnabled;
  let context;
  let clickBuffer;
  let decoding;
  const voices = new Set();
  // Fetch early so the first gesture can play the supplied recording promptly.
  const clickData = fetch(`${baseUrl}assets/sounds/tiklama.wav`)
    .then(response => {
      if (!response.ok) throw new Error('Click sound unavailable');
      return response.arrayBuffer();
    }).catch(() => null);

  function ready() {
    if (!enabled) return null;
    try {
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    } catch { return null; }
  }

  function track(source, gain) {
    voices.add(source);
    source.connect(gain).connect(context.destination);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
  }

  async function click() {
    const audio = ready();
    if (!audio) return;
    const requestedAt = performance.now();
    try {
      decoding ||= clickData.then(data => data ? audio.decodeAudioData(data) : null).catch(() => null);
      clickBuffer ||= await decoding;
      // Never replay a delayed click after the user has moved on or muted audio.
      if (!enabled || !clickBuffer || performance.now() - requestedAt > 250) return;
      const source = audio.createBufferSource();
      const gain = audio.createGain();
      source.buffer = clickBuffer;
      gain.gain.value = .55;
      track(source, gain);
      source.start();
    } catch { /* Audio must never interrupt navigation. */ }
  }

  function answer(correct) {
    const audio = ready();
    if (!audio) return;
    // The same mellow timbre, with an ascending major third for success and
    // a lower descending whole step for retry. A soft attack avoids sharp pops.
    const notes = correct ? [523.25, 659.25] : [349.23, 311.13];
    const start = audio.currentTime;
    notes.forEach((frequency, index) => {
      const at = start + index * .115;
      const duration = correct ? .32 : .27;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(correct ? .065 : .05, at + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration - .025);
      gain.gain.linearRampToValueAtTime(0, at + duration);
      track(oscillator, gain);
      oscillator.start(at);
      oscillator.stop(at + duration);
    });
  }

  return {
    click,
    answer,
    setEnabled(value) {
      enabled = Boolean(value);
      if (!enabled) for (const voice of voices) voice.stop();
    },
  };
}
