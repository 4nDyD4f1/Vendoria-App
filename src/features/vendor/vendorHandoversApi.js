import { api } from '../../api';

const base = '/api/vendor/handovers';
const headers = { 'X-Handover-Request': '1' };

export const listVendorHandovers = ({ status = 'semua', q = '', page = 1, size = 10 } = {}) =>
  api(`${base}?${new URLSearchParams({ status, q, page: String(page), size: String(size) })}`);
export const getVendorHandover = id => api(`${base}/${encodeURIComponent(id)}`);
export const uploadHandoverEvidence = (id, input, photo) => {
  const body = new FormData();
  body.append('data', new Blob([JSON.stringify(input)], { type: 'application/json' }));
  body.append('photo', photo);
  return api(`${base}/${encodeURIComponent(id)}/evidence`, { method: 'POST', headers, body });
};
export const deleteHandoverEvidence = (id, evidenceId, expectedStatus) =>
  api(`${base}/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}?${new URLSearchParams({ expectedStatus })}`, { method: 'DELETE', headers });
export const actOnHandover = (id, input) => api(`${base}/${encodeURIComponent(id)}/action`, { method: 'POST', headers, body: input });
