export const gameWorlds = Object.freeze({
  koak: { name: 'Deniz', background: 'sea-calm-v1.webp' },
  kofen: { name: 'Orman', background: 'forest-calm-warm-v23.webp' },
  komat: { name: 'Matematik', background: 'numbers-city-calm-v1.webp' },
  kuik: { name: 'Hikâye', background: 'beach-calm-v1.webp' },
});

export function worldBackground(theme, portrait = false) {
  const key = Object.hasOwn(gameWorlds, theme) ? theme : 'kofen';
  const file = gameWorlds[key].background;
  return portrait && key !== 'kofen' ? file.replace('.webp', '-portrait.webp') : file;
}
