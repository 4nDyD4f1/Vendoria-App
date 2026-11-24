import { api } from '../../api';

// Bentuk backend (nama/catatan) <-> bentuk resource admin (name/notes).
const toRecord = a => ({ id: String(a.user_id), name: a.nama, email: a.email, status: a.status, notes: a.catatan ?? '' });
const BASE = '/api/admin/administrators';
const toBody = record => ({ nama: record.name, email: record.email, status: record.status, catatan: record.notes, password: record.password || null });

export const listAdministrators = () => api(BASE).then(rows => rows.map(toRecord));

export async function saveAdministrator(record) {
  try {
    const saved = await api(`${BASE}${record.id ? `/${encodeURIComponent(record.id)}` : ''}`, {
      method: record.id ? 'PUT' : 'POST', body: toBody(record),
    });
    return toRecord(saved);
  } catch (error) {
    if (error.status === 409 && !Object.keys(error.errors ?? {}).length) error.errors = { email: error.message };
    const fields = { nama: 'name', catatan: 'notes' };
    error.errors = Object.fromEntries(Object.entries(error.errors ?? {}).map(([key, message]) => [fields[key] ?? key, message]));
    throw error;
  }
}

export const deleteAdministrator = id => api(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
