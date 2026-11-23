import { api } from '../../api';

const base = '/api/admin/accounts';
const headers = { 'X-Admin-Accounts': '1' };
const kindFor = key => key === 'customers' ? 'customer' : 'vendor';
export const listAccounts = () => api(base);
export async function saveAccount(key, record) {
  const body = { name: record.name, email: record.email, phone: record.phone, status: record.status, notes: record.notes, password: record.password || null,
    ...(key === 'vendors' ? { owner: record.owner, city: record.city, address: record.address, description: record.description, businessStatus: record.businessStatus } : {}) };
  const path = `${base}/${kindFor(key)}${record.id ? `/${encodeURIComponent(record.id)}` : ''}`;
  try { return await api(path, { method: record.id ? 'PUT' : 'POST', headers, body }); }
  catch (error) {
    if (!Object.keys(error.errors ?? {}).length) {
      if (error.message.startsWith('Email')) error.errors = { email: error.message };
      else if (error.message.startsWith('Kata sandi')) error.errors = { password: error.message };
    }
    throw error;
  }
}
export const deleteAccounts = (key, ids) => api(`${base}/${kindFor(key)}/delete`, { method: 'POST', headers, body: { ids } });
