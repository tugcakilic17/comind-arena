// Small, code-native illustrations share the same soft palette and rounded strokes.
const drawings = [
  ['Yıldız', '<path fill="#f4c85c" d="m32 6 8 16 18 3-13 13 3 18-16-8-16 8 3-18L6 25l18-3Z"/><path d="m22 28 3-6" stroke="#fff5ce" stroke-width="4"/>'],
  ['Çilek', '<path fill="#ee7b79" d="M13 26C8 49 28 60 32 59s25-16 19-33c-6-14-32-14-38 0Z"/><path fill="#7eaa74" d="m15 18 13-1 4-12 5 12 12 1-10 7-7-4-9 5Z"/><g stroke="#ffe7b4" stroke-width="3"><path d="m22 32 1 2m16-2-1 2m-8 5 1 2m10 2-1 2m-14 2 1 2m6 3 1 2"/></g>'],
  ['Gökkuşağı', '<path d="M8 44V32a24 24 0 0 1 48 0v12" fill="none" stroke="#e58c81" stroke-width="9"/><path d="M17 44V32a15 15 0 0 1 30 0v12" fill="none" stroke="#f4cb70" stroke-width="9"/><path d="M26 44V32a6 6 0 0 1 12 0v12" fill="none" stroke="#8bbab0" stroke-width="9"/><g fill="#fffdf4"><ellipse cx="13" cy="47" rx="13" ry="8"/><ellipse cx="51" cy="47" rx="13" ry="8"/></g>'],
  ['Yaprak', '<path fill="#8db581" d="M52 8C16 7 4 29 18 45S58 46 52 8Z"/><path d="M12 55 43 23m-18 18-1-12m10 2 11-1" fill="none" stroke="#5f8965" stroke-width="4"/>'],
  ['Kelebek', '<path fill="#b7a2ce" d="M29 29C12-2-3 22 15 34 0 49 19 61 29 39Z"/><path fill="#dbadd0" d="M35 29C52-2 67 22 49 34 64 49 45 61 35 39Z"/><path d="M32 25v22m0-20-7-9m7 9 7-9" stroke="#6f687d" stroke-width="4"/><circle cx="17" cy="25" r="5" fill="#f2dce9"/><circle cx="47" cy="25" r="5" fill="#fae8f1"/>'],
  ['Güneş', '<g stroke="#edb754" stroke-width="4"><path d="M32 3v7m0 44v7M3 32h7m44 0h7M11 11l5 5m32 32 5 5M11 53l5-5m32-32 5-5"/></g><circle cx="32" cy="32" r="18" fill="#f4ce69"/><path d="M25 36q7 7 14 0" stroke="#a97f48" fill="none" stroke-width="2.5"/><g fill="#a97f48"><circle cx="25" cy="29" r="2"/><circle cx="39" cy="29" r="2"/></g>'],
  ['Mantar', '<path fill="#f3dfb9" d="m24 31-3 22q10 10 22 0l-3-22"/><path fill="#df8476" d="M5 33C8 1 55 1 59 33q-27 11-54 0Z"/><g fill="#fff3da"><circle cx="23" cy="19" r="5"/><circle cx="42" cy="25" r="5"/><circle cx="11" cy="29" r="3"/></g>'],
  ['Balık', '<path fill="#86b6be" d="M43 22 59 13v37l-16-9C15 63 0 33 10 25s20-16 33-3Z"/><path d="M30 20v25" stroke="#a8d2d4" stroke-width="5"/><circle cx="18" cy="30" r="3" fill="#46626b"/><path d="m17 39 5 1" stroke="#46626b" stroke-width="2"/>'],
  ['Çiçek', '<g fill="#e9a1b1"><ellipse cx="32" cy="18" rx="10" ry="15"/><ellipse cx="45" cy="27" rx="15" ry="10" transform="rotate(-25 45 27)"/><ellipse cx="40" cy="44" rx="10" ry="15" transform="rotate(-30 40 44)"/><ellipse cx="23" cy="44" rx="10" ry="15" transform="rotate(30 23 44)"/><ellipse cx="18" cy="27" rx="15" ry="10" transform="rotate(25 18 27)"/></g><circle cx="32" cy="32" r="11" fill="#f4d47e"/><g fill="#a9814e"><circle cx="28" cy="31" r="1.5"/><circle cx="36" cy="31" r="1.5"/></g><path d="M29 36q3 3 6 0" stroke="#a9814e" fill="none" stroke-width="2"/>'],
  ['Ay', '<path fill="#f1cf7a" d="M46 5C17 0 0 30 16 49S56 58 61 38C32 46 23 21 46 5Z"/><circle cx="22" cy="35" r="2" fill="#b29453"/><path d="M20 43q5 4 8 0" stroke="#b29453" fill="none" stroke-width="2"/>'],
  ['Kiraz', '<path d="M21 37q9-12 11-31 1 21 15 28" fill="none" stroke="#7c9a64" stroke-width="3"/><path fill="#92b578" d="M32 7q20-4 21 13-17 3-21-13"/><circle cx="19" cy="44" r="13" fill="#d87d83"/><circle cx="46" cy="43" r="13" fill="#e68e8b"/><path d="m13 39 3-2m24 1 3-2" stroke="#fce0cf" stroke-width="4"/>'],
  ['Arı', '<ellipse cx="24" cy="16" rx="10" ry="12" fill="#d3e7e5" transform="rotate(-25 24 16)"/><ellipse cx="42" cy="16" rx="10" ry="12" fill="#d3e7e5" transform="rotate(25 42 16)"/><ellipse cx="32" cy="38" rx="23" ry="17" fill="#f1c964"/><path d="M27 23v30m13-29v27" stroke="#8c7b59" stroke-width="7"/><circle cx="17" cy="34" r="2" fill="#5d6452"/>'],
  ['Bulut', '<path fill="#afd0d8" d="M13 49C-2 47 0 27 15 27 11 7 43 3 47 24 66 19 73 50 51 50Z"/><path d="M23 36h1m15 0h1" stroke="#5f7e88" stroke-width="4"/><path d="M28 42q4 3 8 0" fill="none" stroke="#5f7e88" stroke-width="2"/>'],
  ['Elma', '<path fill="#dd8c79" d="M31 20C4 2-3 40 15 56q10 8 17 1 8 7 17-1C68 40 60 2 33 20Z"/><path d="m32 22 3-15" stroke="#8f7955" stroke-width="4"/><path fill="#8faf77" d="M35 13q6-14 20-8-5 14-20 8"/><path d="M15 28q-5 8-1 14" stroke="#f4c4aa" stroke-width="4" fill="none"/>'],
  ['Roket', '<path fill="#e99382" d="m20 35-11 6-3 16 18-7m20-15 11 6 3 16-18-7"/><path fill="#b7d4cc" d="M32 3C9 18 18 45 23 50h18C49 38 52 17 32 3Z"/><circle cx="32" cy="27" r="9" fill="#fff4dc"/><circle cx="32" cy="27" r="5" fill="#85adae"/><path fill="#f2c560" d="m25 52 7 11 7-11"/>'],
  ['Kalp', '<path fill="#eaa0a4" d="M32 56 9 35C-8 16 18-2 32 16 46-2 72 16 55 35Z"/><path d="M13 22q2-8 10-5" stroke="#f9d3d3" stroke-width="5" fill="none"/>'],
  ['Uçurtma', '<path fill="#a9bfce" d="m32 3 22 23-22 28L10 26Z"/><path fill="#e5a4a1" d="M32 3v23H10Z"/><path fill="#efd087" d="M32 26h22L32 54Z"/><path d="m32 54 5 5-2 5" stroke="#9c8d77" fill="none" stroke-width="2"/>'],
  ['Kaplumbağa', '<g fill="#a4bc82"><circle cx="53" cy="30" r="10"/><ellipse cx="17" cy="48" rx="6" ry="9"/><ellipse cx="38" cy="48" rx="6" ry="9"/></g><path fill="#6e9473" d="M5 39C4 2 50 2 50 39Z"/><path d="m17 13 5 14-6 12m20-27-5 15 8 12m-17-12h9" fill="none" stroke="#a4bd88" stroke-width="3"/><circle cx="56" cy="27" r="2" fill="#415d49"/>'],
  ['Dondurma', '<path fill="#d9ac75" d="m17 29 15 33 15-33"/><path d="m23 36 15 15m-7-16 11 10m-4-9-12 13" stroke="#f0cc96" stroke-width="2"/><path fill="#d8b4d3" d="M11 30a10 10 0 0 1 5-17c-1-17 32-17 32 0 15 0 15 22 3 22H18Z"/><circle cx="32" cy="8" r="5" fill="#df8c90"/>'],
  ['Balina', '<path fill="#87b4c5" d="M8 26C7 4 42 6 45 29q4 10 9-1l-4-7 14 2-4 16C48 67 4 60 8 26Z"/><path fill="#c5dcda" d="M9 38q17 12 35-1C39 60 14 57 9 38Z"/><circle cx="19" cy="29" r="2.5" fill="#4b6c79"/><path d="M27 9V2m0 4-7-3m7 3 6-3" stroke="#91c6d5" stroke-width="3"/>'],
  ['Havuç', '<path fill="#e7a164" d="M15 20c14-15 35 0 29 12L15 60Z"/><path d="m29 20 1-15m3 15L45 6m-9 17 18-6" stroke="#89ac75" stroke-width="5"/><path d="m22 30 7 4m-11 6 5 3" stroke="#f5c48c" stroke-width="3"/>'],
  ['Taç', '<path fill="#e8c46b" d="m8 17 12 11L32 8l12 20 12-11-5 34H13Z"/><path d="M15 45h34" stroke="#f8e2a0" stroke-width="4"/><circle cx="32" cy="35" r="5" fill="#d9958e"/>'],
  ['Salyangoz', '<path d="M9 46h40q13 0 12-13" fill="none" stroke="#afbd8f" stroke-width="10"/><circle cx="26" cy="31" r="21" fill="#d8b5a4"/><path d="M28 43c-20 0-20-27-2-25 13 1 10 18 0 15-5-2-2-8 1-7" fill="none" stroke="#b78d80" stroke-width="3"/><path d="m56 30-3-9m7 10 2-10" stroke="#8f9f75" stroke-width="2.5"/>'],
  ['Papatya', '<g fill="#f1e7ca"><ellipse cx="32" cy="16" rx="8" ry="15"/><ellipse cx="32" cy="48" rx="8" ry="15"/><ellipse cx="16" cy="32" rx="15" ry="8"/><ellipse cx="48" cy="32" rx="15" ry="8"/><ellipse cx="20" cy="20" rx="8" ry="13" transform="rotate(-45 20 20)"/><ellipse cx="44" cy="44" rx="8" ry="13" transform="rotate(-45 44 44)"/><ellipse cx="20" cy="44" rx="8" ry="13" transform="rotate(45 20 44)"/><ellipse cx="44" cy="20" rx="8" ry="13" transform="rotate(45 44 20)"/></g><circle cx="32" cy="32" r="12" fill="#eac868"/>'],
  ['Armut', '<path fill="#b6c17b" d="M23 16c0-13 19-13 19 0 0 15 17 18 13 33C49 70 7 65 9 45c1-14 14-15 14-29Z"/><path d="m33 12 4-10" stroke="#8f8054" stroke-width="4"/><path d="M19 37q-5 6-3 12" stroke="#dbe1a5" stroke-width="4" fill="none"/>'],
  ['Deniz yıldızı', '<path fill="#e9aa88" d="m32 4 8 18 20 3-15 14 4 21-17-11-17 11 4-21L4 25l20-3Z"/><g fill="#f8d1b4"><circle cx="31" cy="19" r="2"/><circle cx="20" cy="30" r="2"/><circle cx="43" cy="30" r="2"/><circle cx="24" cy="43" r="2"/><circle cx="39" cy="43" r="2"/></g>'],
  ['Ağaç', '<path d="M32 34v25" stroke="#ac9070" stroke-width="9"/><path fill="#92b48a" d="M32 2 12 25h9L5 44q27 10 54 0L43 25h9Z"/><path d="m32 20 1 17" stroke="#bad0a8" stroke-width="3"/>'],
  ['Hediye', '<path fill="#dba6b6" d="M10 24h44v34H10Z"/><path fill="#ecc3c8" d="M6 20h52v12H6Z"/><path d="M32 20v38" stroke="#f3d582" stroke-width="8"/><path d="M32 20C2 22 15-5 32 20 49-5 62 22 32 20Z" fill="none" stroke="#e6c574" stroke-width="5"/>'],
  ['Tilki', '<path fill="#dca47b" d="m8 8 22 11h4L56 8l-2 33-22 20L10 41Z"/><path fill="#f9e5c7" d="m10 33 22 10 22-10-4 14-18 14-18-14Z"/><path fill="#aa7d68" d="m13 16 11 5-12 9m39-14-11 5 12 9"/><g fill="#655e51"><circle cx="22" cy="32" r="2.5"/><circle cx="42" cy="32" r="2.5"/><path d="m27 44 5 5 5-5Z"/></g>'],
  ['Balon', '<ellipse cx="31" cy="24" rx="20" ry="23" fill="#a5b6d4"/><path fill="#a5b6d4" d="m31 45-5 8h10Z"/><path d="M31 52q10 5 1 11" stroke="#a09587" stroke-width="2" fill="none"/><path d="M20 13q-5 6-3 12" stroke="#d5def0" stroke-width="4" fill="none"/>'],
  ['Deniz kabuğu', '<path fill="#d7aec5" d="M27 56C10 44-4 27 7 18c5-5 10-2 13 0-1-20 20-20 24-5 15-10 26 5 16 17L38 56Z"/><path d="m32 52-4-37m6 37 16-31m-21 30L12 25" stroke="#f0d4e1" stroke-width="3"/>'],
];

export const symbols = drawings.map(([name, body]) => ({ name, body }));
let illustrationId = 0;
function clayColor(hex, lightness = 0) {
  const channels = [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16));
  const mean = channels.reduce((a, b) => a + b, 0) / 3;
  const shaded = channels.map(channel => {
    const saturated = mean + (channel - mean) * 1.55;
    return Math.round(Math.max(0, Math.min(255, lightness >= 0 ? saturated + (255 - saturated) * lightness : saturated * (1 + lightness))));
  });
  return `rgb(${shaded.join(',')})`;
}
export function symbolSvg(id, className = '') {
  const symbol = symbols[id];
  const prefix = `clay-${illustrationId++}`;
  const colors = [...new Set([...symbol.body.matchAll(/fill="(#[a-f\d]{6})"/gi)].map(match => match[1]))];
  const gradients = colors.map((color, index) => `<linearGradient id="${prefix}-${index}" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${clayColor(color, .28)}"/><stop offset=".4" stop-color="${clayColor(color, .04)}"/><stop offset="1" stop-color="${clayColor(color, -.19)}"/></linearGradient>`).join('');
  const body = symbol.body.replace(/fill="(#[a-f\d]{6})"/gi, (_, color) => `fill="url(#${prefix}-${colors.indexOf(color)})"`);
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs>${gradients}</defs>${body}</svg>`;
}

const uiPaths = {
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-4-4L5 15l-1 5Z"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="3"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
  gift: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M3 6h18v5H3zM12 6v15m0-15C4 7 5-2 12 6c7-8 8 1 0 0Z"/>',
  playSolid: '<path d="M4 3.8a1.8 1.8 0 0 1 2.7-1.5l14.2 8.2a1.8 1.8 0 0 1 0 3L6.7 21.7A1.8 1.8 0 0 1 4 20.2Z" fill="currentColor" stroke="none"/>',
  homeSolid: '<path d="M10.6 2.8a2.2 2.2 0 0 1 2.8 0l3 2.5V4.1a.8.8 0 0 1 .8-.8h1.5a.8.8 0 0 1 .8.8v4l3.4 2.8c1 .9.4 2.5-.9 2.5h-1.5v7a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6.1a1.4 1.4 0 0 0-1.4-1.4h-2.8a1.4 1.4 0 0 0-1.4 1.4v6.1H5.3a1.5 1.5 0 0 1-1.5-1.5v-7H2.1c-1.3 0-1.9-1.6-.9-2.5Z" fill="currentColor" stroke="none"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm4 11v5m-4 2h8M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m0-15a3 3 0 0 1 0 6m3 3a5 5 0 0 1 3 5v1"/>',
  bot: '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M1 11v5m22-5v5M8 12h.01M16 12h.01m-8 4h8"/>',
  link: '<path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1" transform="translate(0 -1) scale(.95)"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 1-1 1-1 2m0 3h.01"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  time: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  spark: '<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Zm8-1v4m-2-2h4"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
};
export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${uiPaths[name] || uiPaths.spark}</svg>`;
}

export function googleMark() {
  return `<svg class="google-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.87 0-5.3-1.94-6.17-4.55H2.17v2.84A11 11 0 0 0 12 23Z"/><path fill="#fbbc05" d="M5.83 14.08A6.6 6.6 0 0 1 5.48 12c0-.72.13-1.42.35-2.08V7.08H2.17A11 11 0 0 0 1 12c0 1.77.42 3.43 1.17 4.92l3.66-2.84Z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1a11 11 0 0 0-9.83 6.08l3.66 2.84c.87-2.61 3.3-4.54 6.17-4.54Z"/></svg>`;
}
