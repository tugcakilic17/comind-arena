import { api } from './api.js';
const endpoint = name => `/api/auth/${name}`;
let user = null;
let configured = false;
let available = false;
let pending = false;
let message = '';
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener(getAuthState()));
export const getAuthState = () => ({ user, configured, available, pending, message });
export function onAuthChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }

export async function refreshAuth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(endpoint('me'), { credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('unavailable');
    const state = await response.json();
    if (typeof state.configured !== 'boolean') throw new Error('unavailable');
    user = state.user;
    configured = state.configured;
    available = true;
  } catch { available = false; configured = false; user = null; }
  finally { clearTimeout(timeout); notify(); }
}

export async function signInWithGoogle() {
  if (pending) return;
  pending = true; message = ''; notify();
  await refreshAuth();
  if (!available || !configured) {
    pending = false;
    message = 'Google ile girişe şu an ulaşılamıyor. Biraz sonra yeniden deneyebilirsin.';
    notify();
    return;
  }
  // Google identity verification and session creation happen only on the backend.
  const destination = new URL(endpoint('google'), location.origin);
  const room = new URL(location.href).searchParams.get('room');
  if (/^[A-HJ-NP-Z2-9]{8}$/.test(room || '')) destination.searchParams.set('room', room);
  window.location.assign(destination);
}

export async function updatePlayerAvatar(avatar) {
  const result = await api('auth/profile', { method: 'PATCH', body: { avatar } });
  user = result.user;
  notify();
  return user;
}

export async function signOut() {
  if (pending) return;
  pending = true; message = ''; notify();
  try {
    const response = await fetch(endpoint('logout'), { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('logout');
    user = null;
    message = 'Çıkış yaptın. İstediğinde tekrar görüşelim!';
  } catch { message = 'Çıkış yapılamadı. Lütfen yeniden dene.'; }
  finally { pending = false; notify(); }
}

export function consumeAuthResult() {
  const url = new URL(window.location.href);
  const result = url.searchParams.get('auth');
  if (!result) return false;
  url.searchParams.delete('auth');
  window.history.replaceState(window.history.state, '', url);
  message = ({
    success: '',
    cancelled: 'Google ile giriş iptal edildi. Hazır olduğunda yeniden deneyebilirsin.',
    expired: 'Giriş isteğinin süresi doldu. Lütfen yeniden dene.',
    failed: 'Google ile giriş tamamlanamadı. Lütfen yeniden dene.',
    unavailable: 'Google ile girişe şu an ulaşılamıyor. Biraz sonra yeniden deneyebilirsin.',
  })[result] || '';
  return result === 'success' || Boolean(message);
}
