import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { EmptyState, PageHeading, Pagination } from './VendorUi';
import { searchVendorWorkspace } from './vendorSearchApi';
import './vendor-search.css';

const kinds = [['all', 'Semua kategori'], ['catalog', 'Katalog'], ['orders', 'Pesanan'], ['handovers', 'Serah terima'], ['claims', 'Klaim'], ['payouts', 'Pencairan']];
const positive = (value, fallback, max) => /^\d+$/.test(value || '') && Number(value) > 0 && Number(value) <= max ? Number(value) : fallback;

export default function VendorSearchPage({ onLoaded }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [draft, setDraft] = useState({ source: q, value: q });
  // Reset the local draft when a URL change (including Back/Forward) arrives.
  if (draft.source !== q) setDraft({ source: q, value: q });
  const query = draft.source === q ? draft.value : q;
  const kind = kinds.some(([key]) => key === params.get('kind')) ? params.get('kind') : 'all';
  const page = positive(params.get('page'), 1, 1_000_000);
  const size = [5, 10, 20].includes(Number(params.get('size'))) ? Number(params.get('size')) : 10;
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState(null);
  const requestKey = JSON.stringify([q, kind, page, size, retry]);
  const current = response?.key === requestKey ? response : null;
  const result = current?.data;
  const busy = query !== q || !current;

  useEffect(() => {
    if (query === q) return;
    const timer = setTimeout(() => setParams(previous => {
      const next = new URLSearchParams(previous);
      if (query) next.set('q', query); else next.delete('q');
      next.set('page', '1');
      return next;
    }, { replace: true }), 300);
    return () => clearTimeout(timer);
  }, [query, q, setParams]);

  useEffect(() => {
    const lifecycle = new AbortController();
    searchVendorWorkspace({ q, kind, page, size }).then(data => {
      if (lifecycle.signal.aborted) return;
      setResponse({ key: requestKey, data });
      onLoaded?.(data);
    }).catch(error => { if (!lifecycle.signal.aborted) setResponse({ key: requestKey, error: error.message }); });
    return () => lifecycle.abort();
  }, [q, kind, page, size, requestKey, onLoaded]);

  const change = (values, replace = false) => {
    const next = new URLSearchParams(params);
    Object.entries({ q: query, ...values }).forEach(([key, value]) => value === '' ? next.delete(key) : next.set(key, String(value)));
    setParams(next, { replace });
  };

  return <>
    <PageHeading title="Pencarian workspace" description="Temukan alat, pesanan, serah terima, klaim, dan pencairan milik bisnis Anda." />
    <section className="v-card v-search-page">
      <div className="v-search-controls">
        <label className="v-search-field"><Search size={18} /><input type="search" aria-label="Cari di seluruh workspace" value={query} maxLength={120} onChange={event => setDraft({ source: q, value: event.target.value })} placeholder="Cari nama alat, pelanggan, atau nomor pesanan…" /></label>
        <label className="v-search-category">Kategori<select aria-label="Kategori pencarian" value={kind} onChange={event => change({ kind: event.target.value, page: 1 })}>{kinds.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <div aria-live="polite" aria-atomic="true"><p className="v-search-count">{busy ? 'Mencari…' : current.error ? 'Pencarian belum berhasil' : `${result.total} hasil${q.trim() ? ` untuk “${q.trim()}”` : ''}`}</p></div>
      <div aria-busy={busy}>
        {busy ? <EmptyState title="Memuat hasil pencarian" description="Mohon tunggu sebentar." /> : current.error ? <div role="alert"><EmptyState title="Pencarian tidak dapat dimuat" description={current.error}><button type="button" className="v-button v-button-secondary" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></EmptyState></div> : !result.vendor ? <EmptyState title="Profil bisnis belum tersedia" description="Lengkapi profil bisnis untuk mulai mengelola data vendor."><Link className="v-button v-button-secondary" to="/vendor/profil-bisnis">Buka profil bisnis</Link></EmptyState> : result.items.length ? <>
          <div className="v-search-results">{result.items.map(item => <Link key={`${item.kind}-${item.id}`} to={item.path}><span className="v-search-kind">{item.label}</span><div><strong>{item.title}</strong><small>{item.subtitle}</small><small>{item.status.replaceAll('_', ' ')}</small></div><ArrowRight size={17} /></Link>)}</div>
          <Pagination count={result.total} page={result.page} size={result.size} onPage={value => change({ page: value })} onSize={value => change({ size: value, page: 1 })} />
        </> : <EmptyState title="Tidak ada hasil" description={q.trim() || kind !== 'all' ? 'Coba kata kunci atau kategori yang berbeda.' : 'Data bisnis Anda akan muncul di sini setelah tersedia.'} />}
      </div>
    </section>
  </>;
}
