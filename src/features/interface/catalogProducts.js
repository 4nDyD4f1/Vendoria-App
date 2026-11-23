import { products } from '../../data/mockData';
import catalogEntries from './catalogEntries.json';

// Complete the local UI catalog so every displayed card resolves to its own detail.
// These extra identifiers describe the existing design fixtures, not backend records.
const missing = catalogEntries.filter(entry => !products.some(product => product.name === entry.title));
const nextId = Math.max(...products.map(product => product.id)) + 1;
export const catalogProducts = [...products, ...missing.map((entry, index) => {
  const details = entry.text.slice(entry.text.indexOf(entry.title) + entry.title.length).trim();
  const rating = details.match(/(\d\.\d)\s*\((\d+)\)/);
  return {
    id: nextId + index,
    name: entry.title,
    category: entry.text.match(/TENDA & KANOPI|SOUND SYSTEM|DEKORASI & PELAMINAN|LIGHTING & FX|KURSI & MEJA|PANGGUNG/)?.[0] || 'PERLENGKAPAN EVENT',
    vendor: details.split(/\s+\d\.\d\s*\(/)[0],
    vendorVerified: true,
    location: details.match(/\)\s+(.+?)\s+Rp/)?.[1]?.trim() || '',
    rating: Number(rating?.[1] || 0),
    reviewCount: Number(rating?.[2] || 0),
    price: entry.price,
    image: entry.image,
    available: true,
    availableText: entry.text.trim().startsWith('Sisa') ? 'Sisa 1 Unit' : 'Tersedia',
  };
})];
