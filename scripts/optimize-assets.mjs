// Keep the source PNGs; generate same-size WebP delivery copies for the UI.
// Set COMIND_SHARP_DIR to an installed sharp package when regenerating.
import { createRequire } from 'node:module';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const sharp = require(process.env.COMIND_SHARP_DIR || 'sharp');
const source = (await Promise.all((await readdir('src')).filter(file => /\.(js|css)$/.test(file)).map(file => readFile(path.join('src', file), 'utf8')))).join('\n');
const names = new Set([...source.matchAll(/[a-zA-Z0-9-]+\.(?:png|webp)/g)].map(match => match[0].replace(/\.webp$/, '.png')));
for (const player of ['player', 'kofen']) for (const pose of ['idle', 'cheer']) names.add(`${player}-${pose}-${player === 'player' ? 'v27' : 'v26'}.png`);
let before = 0, after = 0, count = 0;
for (const dir of ['public/assets', 'public/assets/home-ui', 'public/assets/game-ui']) {
  for (const file of await readdir(dir)) {
    if (!names.has(file)) continue;
    const input = path.join(dir, file), output = input.replace(/\.png$/, '.webp');
    // Lossless keeps painted lettering, sprite edges and alpha pixel-identical.
    await sharp(input).webp({ lossless: true, effort: 6 }).toFile(output);
    before += (await stat(input)).size; after += (await stat(output)).size; count++;
  }
}
console.log(`${count} assets: ${(before / 1e6).toFixed(1)} MB PNG → ${(after / 1e6).toFixed(1)} MB lossless WebP (${Math.round((1 - after / before) * 100)}% smaller)`);
