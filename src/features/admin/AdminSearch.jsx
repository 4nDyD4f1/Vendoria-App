import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { EmptyState, PageHeading } from '../vendor/VendorUi';
import { adminResources } from './adminData';

export default function AdminSearch({ data }) {
  const location = useLocation();
  const [query, setQuery] = useState(new URLSearchParams(location.search).get('q') || '');
  const matches = Object.entries(adminResources).flatMap(([key, resource]) => data[key].filter(record => Object.values(record).some(value => String(value).toLowerCase().includes(query.trim().toLowerCase()))).map(record => ({ ...record, resource })));
  const shown = query.trim() ? matches : matches.slice(0, 10);
  return <><PageHeading title="Pencarian admin" description="Temukan pengguna, alat, pengajuan KYC, klaim, dan pencairan." /><section className="v-card v-search-page"><label className="v-search-field"><Search size={18} /><input aria-label="Cari di seluruh area admin" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, bisnis, atau nomor data…" /></label><p className="v-search-count">{query.trim() ? `${matches.length} hasil untuk “${query.trim()}”` : 'Data terbaru di workspace'}</p>{shown.length ? <div className="v-search-results">{shown.map(record => <Link key={`${record.resource.path}-${record.id}`} to={`/admin/${record.resource.path}/${record.id}`}><span className="v-search-kind">{record.resource.title}</span><div><strong>{record.name || record.reason || record.vendor || record.id}</strong><small>{record.id}</small></div><ArrowRight size={17} /></Link>)}</div> : <EmptyState title="Tidak ada hasil yang cocok" description="Coba nama atau nomor data yang berbeda." />}</section></>;
}
