export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export async function api(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', signal: controller.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) { const error = new Error(data.error || 'İşlem tamamlanamadı.'); error.status = response.status; throw error; }
    return data;
  } catch (error) {
    if (error.status) throw error;
    throw new Error('Sunucuya ulaşılamıyor. Bağlantını kontrol edip yeniden dene.');
  } finally { clearTimeout(timeout); }
}
