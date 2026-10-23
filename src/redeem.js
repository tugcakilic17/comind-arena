import { api } from './api.js';

// Future campaigns use this server boundary. No client-side reward or success flag.
export async function redeemCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(code)) {
    throw new Error('3–64 karakterlik, harf, rakam ve tire içeren bir kod gir.');
  }
  return api('gifts/redeem', { method: 'POST', body: { code } });
}
