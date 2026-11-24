import { api } from '../../api';

const BASE = '/api/admin/reports';
export const payoutStatusLabels = { menunggu: 'Menunggu', diproses: 'Diproses', berhasil: 'Selesai', gagal: 'Gagal', dibatalkan: 'Dibatalkan' };

export const listTransactions = ({ start, end } = {}) => api(`${BASE}/transactions?${new URLSearchParams({ ...(start && { start }), ...(end && { end }) })}`);

// status diganti label tampilan ('Selesai' = berhasil) agar cocok dengan dashboard & pencarian admin.
export const listPayouts = async () => (await api(`${BASE}/payouts`)).map(payout => ({ ...payout, status: payoutStatusLabels[payout.status] || payout.status }));

// Admin memproses pencairan vendor: menunggu -> diproses -> berhasil (wajib referensi transfer) | gagal; menunggu/diproses bisa dibatalkan.
export const decidePayout = async (id, status, reference) => {
  const payout = await api(`${BASE}/payouts/${encodeURIComponent(String(id).replace(/^PCR-/i, ''))}/decision`, { method: 'POST', headers: { 'X-Admin-Payouts': '1' }, body: { status, reference } });
  return { ...payout, status: payoutStatusLabels[payout.status] || payout.status };
};
