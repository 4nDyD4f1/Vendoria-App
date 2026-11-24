import { api } from '../../api';

const BASE = '/api/vendor/claims';
export const claimFilters = [['semua', 'Semua'], ['diajukan', 'Diajukan'], ['ditinjau', 'Ditinjau'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak'], ['selesai', 'Selesai']];
export const claimLabels = Object.fromEntries(claimFilters.slice(1));

export const listVendorClaims = () => api(BASE);

// from = status yang dilihat vendor; server menolak (409) bila sudah berubah.
export const processVendorClaim = (id, from) =>
  api(`${BASE}/${encodeURIComponent(String(id).replace(/^KLM-/i, ''))}/process`, { method: 'POST', headers: { 'X-Vendor-Claims': '1' }, body: { from } });
