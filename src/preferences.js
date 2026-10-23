import { normalizeSetup } from './match-rules.js';
const key = 'comind.preferences.v1';
export function readPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return {
      difficulty: ['easy', 'normal', 'fast'].includes(value?.difficulty) ? value.difficulty : 'easy',
      sound: typeof value?.sound === 'boolean' ? value.sound : false,
      setup: normalizeSetup(value?.setup),
    };
  } catch { return { difficulty: 'easy', sound: false, setup: normalizeSetup() }; }
}
export function savePreferences(difficulty, sound, setup) {
  try { localStorage.setItem(key, JSON.stringify({ difficulty, sound, setup: normalizeSetup(setup) })); }
  catch { /* A private or full browser store must not prevent playing. */ }
}
