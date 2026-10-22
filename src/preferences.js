const key = 'comind.preferences.v1';
export function readPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return {
      difficulty: ['easy', 'normal', 'fast'].includes(value?.difficulty) ? value.difficulty : 'easy',
      sound: typeof value?.sound === 'boolean' ? value.sound : false,
    };
  } catch { return { difficulty: 'easy', sound: false }; }
}
export function savePreferences(difficulty, sound) {
  try { localStorage.setItem(key, JSON.stringify({ difficulty, sound })); }
  catch { /* A private or full browser store must not prevent playing. */ }
}
