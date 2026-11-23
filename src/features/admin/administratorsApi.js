import { api } from '../../api';

// Bentuk backend (nama/catatan) <-> bentuk resource admin (name/notes).
const toRecord = a => ({ id: String(a.user_id), name: a.nama, email: a.email, status: a.status, notes: a.catatan ?? '' });
const toBody = r => ({ nama: r.name, email: r.email, status: r.status, catatan: r.notes, password: r.password || null });
const FIELD = { nama: 'name', catatan: 'notes' };
const BASE = '/api/admin/administrators';

export const listAdministrators = () => api(BASE).then(rows => rows.map(toRecord));

export async function saveAdministrator(record) {
  try {
    const saved = record.id
      ? await api(`${BASE}/${record.id}`, { method: 'PUT', body: toBody(record) })
      : await api(BASE, { method: 'POST', body: toBody(record) });
    return toRecord(saved);
  } catch (error) {
    // error per-field dari backend memakai nama backend; 409 = email sudah dipakai
    if (error.status === 409 && !Object.keys(error.errors).length) error.errors = { email: error.message };
    error.errors = Object.fromEntries(Object.entries(error.errors ?? {}).map(([key, message]) => [FIELD[key] ?? key, message]));
    throw error;
  }
}

export const deleteAdministrator = id => api(`${BASE}/${id}`, { method: 'DELETE' });
