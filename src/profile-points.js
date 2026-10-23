import { api } from './api.js';

const number = new Intl.NumberFormat('tr-TR');

export async function updateProfilePoints(dialog) {
  const card = dialog?.querySelector('.profile-points');
  if (!card) return;
  try {
    const data = await api('arena/leaderboard?start=0&center=self');
    if (!card.isConnected) return;
    card.querySelector('[data-profile-points]').textContent = `${number.format(data.self?.score ?? 0)} puan`;
    card.querySelector('[data-profile-rank]').textContent = data.self
      ? `${data.self.rank}. sıradasın · Liderlik tablosunu aç`
      : 'İlk arkadaş maçınla sıralamaya katıl';
  } catch {
    if (!card.isConnected) return;
    card.querySelector('[data-profile-points]').textContent = 'Puan yüklenemedi';
    card.querySelector('[data-profile-rank]').textContent = 'Liderlik tablosundan yeniden dene';
  } finally {
    if (card.isConnected) card.removeAttribute('aria-busy');
  }
}
