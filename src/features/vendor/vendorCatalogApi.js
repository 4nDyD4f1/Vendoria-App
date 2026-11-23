import { api, apiUrl } from '../../api';

const base = '/api/vendor/catalog';
const headers = { 'X-Catalog-Request': '1' };
const statusLabels = { aktif: 'Aktif', nonaktif: 'Nonaktif', arsip: 'Arsip' };
const item = value => ({ ...value, status: statusLabels[value.status], image: value.image ? apiUrl(value.image) : '' });
const state = value => ({ ...value, items: value.items.map(item) });
export const getVendorCatalog = async () => state(await api(base));
export const setupCatalogVendor = async name => state(await api(`${base}/setup`, { method: 'POST', headers, body: { name } }));
export async function saveCatalogItem(record) {
  const data = { name: record.name, category: record.category, stock: record.stock, price: record.price, status: record.status.toLowerCase(), description: record.description, condition: record.condition, deposit: record.deposit, remove_image: Boolean(record.removeImage) };
  const body = new FormData();
  body.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  if (record.imageFile) body.append('photo', record.imageFile);
  return item(await api(record.id ? `${base}/${encodeURIComponent(record.id)}` : base, { method: record.id ? 'PUT' : 'POST', headers, body }));
}
export const deleteCatalogItems = ids => api(`${base}/delete`, { method: 'POST', headers, body: { ids } });
