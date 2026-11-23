import { api } from '../../api';

const base = '/api/vendor/orders';
const headers = { 'X-Vendor-Orders': '1' };

export const orderStatusFilters = [
  ['semua', 'Semua'],
  ['menunggu_pembayaran', 'Menunggu Pembayaran'],
  ['menunggu_konfirmasi', 'Menunggu Konfirmasi'],
  ['dikonfirmasi', 'Dikonfirmasi'],
  ['berjalan', 'Berjalan'],
  ['dikembalikan', 'Dikembalikan'],
  ['selesai', 'Selesai'],
  ['dibatalkan', 'Dibatalkan'],
];

export const orderStatusLabels = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  dikonfirmasi: 'Dikonfirmasi',
  berjalan: 'Berjalan',
  dikembalikan: 'Dikembalikan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const paymentTypeLabels = { deposit: 'Deposit', pelunasan: 'Pelunasan' };
export const paymentMethodLabels = { transfer_bank: 'Transfer Bank', payment_gateway: 'Payment Gateway', lainnya: 'Lainnya' };
export const paymentStatusLabels = { menunggu: 'Menunggu', terverifikasi: 'Terverifikasi', ditolak: 'Ditolak', gagal: 'Gagal' };
export const claimStatusLabels = { diajukan: 'Diajukan', ditinjau: 'Ditinjau', disetujui: 'Disetujui', ditolak: 'Ditolak', selesai: 'Selesai' };
export const kycLabels = { belum_diverifikasi: 'Belum Diverifikasi', menunggu: 'Menunggu Verifikasi', terverifikasi: 'Terverifikasi', ditolak: 'Ditolak' };

export const formatOrderDate = value => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

export const formatOrderDateTime = value => value
  ? new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

export const listVendorOrders = ({ status = 'semua', q = '', page = 1, size = 10 } = {}) =>
  api(`${base}?${new URLSearchParams({ status, q, page: String(page), size: String(size) })}`);

export const setupOrdersVendor = name =>
  api(`${base}/setup`, { method: 'POST', headers, body: { name } });

export const getVendorOrder = orderId =>
  api(`${base}/${encodeURIComponent(orderId)}`);

export const actOnVendorOrder = (orderId, { action, catatan, expected_status }) =>
  api(`${base}/${encodeURIComponent(orderId)}/action`, {
    method: 'POST',
    headers,
    body: { action, catatan, expected_status },
  });
