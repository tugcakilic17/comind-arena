import { baseUrl } from './assets.js';

export const playerAvatars = Object.freeze({
  white: { label: 'Beyaz papağan', color: '#eee8d9', wash: '#fff8df' },
  lilac: { label: 'Lavanta renkli papağan', color: '#b899dd', wash: '#eee3fb' },
  rose: { label: 'Pembe papağan', color: '#df9aac', wash: '#ffe6eb' },
});
const storageKey = 'comind.player-avatar.v1';
const valid = avatar => Object.hasOwn(playerAvatars, avatar);
let guestAvatar = 'white';
try { const stored = localStorage.getItem(storageKey); if (valid(stored)) guestAvatar = stored; } catch {}
let activeAvatar = guestAvatar;

export function syncPlayerAvatar(user) {
  activeAvatar = user ? (valid(user.avatar) ? user.avatar : 'white') : guestAvatar;
}
export function saveGuestAvatar(avatar) {
  if (!valid(avatar)) return;
  guestAvatar = activeAvatar = avatar;
  try { localStorage.setItem(storageKey, avatar); } catch {}
}
export function currentPlayerAvatar() { return activeAvatar; }
export function playerPortraitUrl(pose = 'idle', avatar = activeAvatar) {
  const choice = valid(avatar) ? avatar : 'white';
  return `${baseUrl}assets/characters/player-${choice}-${pose === 'cheer' ? 'cheer' : 'idle'}-v1.webp`;
}
export function playerFace(className = '', avatar = activeAvatar) {
  return `<span class="player-face ${className}" aria-hidden="true"><img data-player-avatar="idle" src="${playerPortraitUrl('idle', avatar)}" alt="" width="64" height="64" draggable="false" /></span>`;
}
