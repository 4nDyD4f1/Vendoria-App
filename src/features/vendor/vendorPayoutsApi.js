import { api } from '../../api';

export const payoutLabels = { menunggu: 'Menunggu', diproses: 'Diproses', berhasil: 'Selesai', gagal: 'Gagal', dibatalkan: 'Dibatalkan' };
export const payoutBanks = ['BCA', 'Mandiri', 'BRI', 'BNI'];

export const getPayoutAccount = () => api('/api/vendor/payout-account');
export const savePayoutAccount = ({ bank, number, owner }) =>
  api('/api/vendor/payout-account', { method: 'PUT', headers: { 'X-Vendor-Payout-Account': '1' }, body: { bank, number, owner } });

export const listVendorPayouts = () => api('/api/vendor/payouts');
export const requestVendorPayout = () => api('/api/vendor/payouts/request', { method: 'POST', headers: { 'X-Vendor-Payouts': '1' } });
