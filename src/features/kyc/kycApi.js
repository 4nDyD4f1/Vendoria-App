import { api } from '../../api';

export const kycStatus = { belum_diverifikasi: 'Belum Terverifikasi', menunggu: 'Menunggu Verifikasi', terverifikasi: 'Terverifikasi', ditolak: 'Ditolak' };
export const getMyKyc = () => api('/api/kyc/me');
export const getKyc = id => api(`/api/kyc/${encodeURIComponent(id)}`);
export const listKyc = ({ status = 'menunggu', q = '', page = 1, size = 10 } = {}) => api(`/api/admin/kyc?${new URLSearchParams({ status, q, page, size })}`);
export const decideKyc = (id, status, catatan_admin) => api(`/api/admin/kyc/${encodeURIComponent(id)}/decision`, { method: 'POST', body: { status, catatan_admin } });
export const submitKyc = (data, ktp, selfie) => {
  const body = new FormData();
  body.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  body.append('ktp', ktp);
  body.append('selfie', selfie);
  return api('/api/kyc', { method: 'POST', body, headers: { 'X-KYC-Request': '1' } });
};
