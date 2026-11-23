import { api } from '../../api';

const BASE = '/api/admin/categories';
const headers = { 'X-Admin-Categories': '1' };

export const listCategories = () => api(BASE);

export async function saveCategory(record) {
  try { return await api(record.id ? `${BASE}/${encodeURIComponent(record.id)}` : BASE, { method: record.id ? 'PUT' : 'POST', headers, body: { name: record.name } }); }
  catch (error) {
    if (error.status === 409 && !Object.keys(error.errors ?? {}).length) error.errors = { name: error.message }; // nama sudah dipakai
    throw error;
  }
}

export const deleteCategories = ids => api(`${BASE}/delete`, { method: 'POST', headers, body: { ids } });
