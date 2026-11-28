import { api } from '../../api';

const BASE = '/api/admin/claims';
export const claimStatusLabels = { ditinjau: 'Ditinjau', disetujui: 'Disetujui', ditolak: 'Ditolak', selesai: 'Selesai' };

// status diganti label tampilan ('Ditinjau', ...) agar cocok dengan dashboard & pencarian admin.
export const listClaims = async () => (await api(BASE)).map(claim => ({ ...claim, status: claimStatusLabels[claim.status] || claim.status }));

export const confirmAdminReturn = id => api(`${BASE}/${encodeURIComponent(String(id).replace(/^KLM-/i, ''))}/returned`, { method: 'POST', headers: { 'X-Admin-Claims': '1' } });

export const decideClaim = (id, status, note, extra) =>
  api(`${BASE}/${encodeURIComponent(String(id).replace(/^KLM-/i, ''))}/decision`, { method: 'POST', headers: { 'X-Admin-Claims': '1' }, body: { status, note, ...extra } });
