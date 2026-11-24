import { api } from '../../api';

const BASE = '/api/admin/catalog';
const labels = { aktif: 'Aktif', nonaktif: 'Nonaktif', arsip: 'Arsip' };
const toRecord = item => ({ ...item, status: labels[item.status] || item.status });

export const listCatalog = async () => (await api(BASE)).map(toRecord);

export const saveCatalogStatus = async (id, status) =>
  toRecord(await api(`${BASE}/${encodeURIComponent(id)}/status`, { method: 'PUT', headers: { 'X-Admin-Catalog': '1' }, body: { status: status.toLowerCase() } }));
