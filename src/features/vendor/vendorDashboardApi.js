import { api } from '../../api';
import { ago } from '../admin/notificationsApi';

export const getVendorDashboard = () => api('/api/vendor/dashboard');

// Notifikasi vendor = pesanan/klaim/pencairan yang perlu ditindak (server); 'time' = teks relatif untuk tampilan.
const NOTIFICATIONS = '/api/vendor/notifications';
const headers = { 'X-Vendor-Notifications': '1' };
export const listVendorNotifications = async () => (await api(NOTIFICATIONS)).map(item => ({ ...item, time: ago(item.createdAt) }));
export const readVendorNotifications = ids => api(`${NOTIFICATIONS}/read`, { method: 'POST', headers, body: { ids } });
export const dismissVendorNotifications = ids => api(`${NOTIFICATIONS}/dismiss`, { method: 'POST', headers, body: { ids } });
