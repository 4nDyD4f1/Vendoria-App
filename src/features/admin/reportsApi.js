import { api } from '../../api';

const BASE = '/api/admin/reports';
export const payoutStatusLabels = { menunggu: 'Menunggu', diproses: 'Diproses', berhasil: 'Selesai', gagal: 'Gagal', dibatalkan: 'Dibatalkan' };

export const listTransactions = ({ start, end } = {}) => api(`${BASE}/transactions?${new URLSearchParams({ ...(start && { start }), ...(end && { end }) })}`);

// status diganti label tampilan ('Selesai' = berhasil) agar cocok dengan dashboard & pencarian admin.
export const listPayouts = async () => (await api(`${BASE}/payouts`)).map(payout => ({ ...payout, status: payoutStatusLabels[payout.status] || payout.status }));
