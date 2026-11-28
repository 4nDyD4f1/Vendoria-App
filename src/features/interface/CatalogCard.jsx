import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Package, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { apiUrl } from '../../api';
import CatalogWishlistButton from './CatalogWishlistButton';
import AddToCartButton from './AddToCartButton';
import './live-catalog.css';

export const money = value => `Rp${Number(value).toLocaleString('id-ID')}`;

export function Photo({ item }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed
    ? <img src={apiUrl(item.image)} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
    : <div className="live-catalog-photo-empty"><Package size={32} aria-hidden="true" /><span>Foto belum tersedia</span></div>;
}

export default function CatalogCard({ item }) {
  const { user } = useAuth();
  const to = `/product/${item.id}`;
  return <article className="live-catalog-card">
    <div className="live-catalog-photo-wrap"><div className="live-catalog-photo"><Photo item={item} /><span className="live-catalog-stock">{item.stock === 1 ? 'Sisa 1 unit' : 'Tersedia'}</span></div><CatalogWishlistButton item={item} overlay /></div>
    <div className="live-catalog-card-body"><p className="live-catalog-category">{item.category}</p><h2><Link className="live-catalog-link" to={to}>{item.name}</Link></h2>
      <p className="live-catalog-vendor">{item.verified && <ShieldCheck size={14} aria-label="Vendor terverifikasi" />}{item.vendor}</p>
      <p className="live-catalog-meta"><Star size={14} className="live-catalog-star" aria-hidden="true" />{item.reviewCount ? `${Number(item.rating || 0).toLocaleString('id-ID')} (${item.reviewCount})` : 'Belum ada ulasan'}<span aria-hidden="true">•</span><MapPin size={14} aria-hidden="true" />{item.city || 'Kota belum diisi'}</p>
      <div className="live-catalog-price"><span><strong>{money(item.price)}</strong>/hari</span><div className="live-catalog-card-actions"><AddToCartButton key={user?.user_id || 'guest'} item={item} compact /></div></div>
    </div>
  </article>;
}
