import { api } from '../../api';

const BASE = '/api/admin/notifications';
const headers = { 'X-Admin-Notifications': '1' };

// 'time' = teks relatif untuk tampilan; createdAt tetap ISO dari server.
function ago(iso) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} jam lalu`;
  return `${Math.floor(minutes / 1440)} hari lalu`;
}

export const listNotifications = async () => (await api(BASE)).map(item => ({ ...item, time: ago(item.createdAt) }));
export const readNotifications = ids => api(`${BASE}/read`, { method: 'POST', headers, body: { ids } });
export const dismissNotifications = ids => api(`${BASE}/dismiss`, { method: 'POST', headers, body: { ids } });
