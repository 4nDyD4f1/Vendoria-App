import { use, useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, LocateFixed, Package, Search } from 'lucide-react';
import { api } from '../../api';
import { InterfaceContext } from './InterfaceContext';
import DesignNode from './DesignNode';
import CatalogDropdown from './CatalogDropdown';
import CatalogCard from './CatalogCard';
import { useWishlist } from './useWishlist';
import { useCart } from './useCart';
import './live-catalog.css';
import Skeleton from '../../components/Skeleton';

const sortLabels = { popular: 'Paling populer', 'price-low': 'Harga terendah', 'price-high': 'Harga tertinggi', rating: 'Rating tertinggi' };
const empty = { items: [], cities: [], categories: [], total: 0, available: 0, page: 1, size: 12 };

export default function LiveCatalog({ loadDesign }) {
  const parent = useContext(InterfaceContext);
  const wishlist = useWishlist(parent.user);
  const cart = useCart(parent.user);
  const tree = use(loadDesign('84:4705'));
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const city = params.get('city') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'popular';
  const page = params.get('page') || '1';
  const detailId = params.get('item');
  const [searchDraft, setSearchDraft] = useState({ q, value: q });
  if (searchDraft.q !== q) setSearchDraft({ q, value: q });
  const draft = searchDraft.q === q ? searchDraft.value : q;
  const setDraft = value => setSearchDraft({ q, value });
  const [response, setResponse] = useState({ data: empty, key: null, error: '' });
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([q, city, category, sort, page, retry]);
  const data = response.data;
  const loading = response.key !== requestKey;
  const error = loading ? '' : response.error;
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const mounted = useRef(true);
  const locationAttempt = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const request = new AbortController();
    const query = new URLSearchParams({ q, city, category, sort, page, size: '12' });
    api(`/api/catalog?${query}`).then(result => {
      if (!request.signal.aborted) setResponse({ data: result, key: requestKey, error: '' });
    }).catch(failure => { if (!request.signal.aborted) setResponse(previous => ({ data: previous.data, key: requestKey, error: failure.message })); });
    return () => request.abort();
  }, [q, city, category, sort, page, requestKey]);

  const update = (changes, resetPage = true) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (resetPage) next.delete('page');
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, String(value)); else next.delete(key);
      }
      return next;
    });
  };
  // A new page of results starts at the top; filters and sorting keep the reader's place.
  const goToPage = number => { update({ page: number }, false); window.scrollTo(0, 0); };
  const chooseCity = value => {
    locationAttempt.current += 1;
    setLocating(false); setLocationNote(''); update({ city: value === 'Semua lokasi' ? '' : value });
  };
  const detect = () => {
    if (!navigator.geolocation) { setLocationNote('Browser tidak mendukung lokasi. Silakan pilih kota secara manual.'); return; }
    const attempt = ++locationAttempt.current;
    const active = () => mounted.current && attempt === locationAttempt.current;
    setLocating(true); setLocationNote('');
    navigator.geolocation.getCurrentPosition(async position => {
      if (!active()) return;
      try {
        const result = await api('/api/catalog/nearby-city', { method: 'POST', body: { latitude: position.coords.latitude, longitude: position.coords.longitude } });
        if (active()) {
          update({ city: result.city });
          setLocationNote(`Kota vendor terdekat: ${result.city} (±${result.distanceKm.toLocaleString('id-ID')} km). Anda dapat menggantinya secara manual.`);
        }
      } catch (failure) { if (active()) setLocationNote(failure.message); }
      finally { if (active()) setLocating(false); }
    }, failure => {
      if (!active()) return;
      setLocating(false);
      setLocationNote(failure.code === 1 ? 'Izin lokasi ditolak. Silakan pilih kota secara manual.' : 'Lokasi belum berhasil diperoleh. Coba lagi atau pilih kota secara manual.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  };
  const totalPages = Math.max(1, Math.ceil(data.total / data.size));
  const categoryOptions = ['Semua kategori', ...data.categories.map(item => item.name)];
  const currentCategory = data.categories.find(item => item.id === category)?.name || 'Semua kategori';
  const currentCity = city || 'Semua lokasi';
  const cityOptions = ['Semua lokasi', ...new Set([...data.cities, ...(city && !data.cities.includes(city) ? [city] : [])])];
  const search = event => { event?.preventDefault(); update({ q: draft.trim() }); };

  const renderNode = (node, props) => {
    if (node.id === '84:4798') return <div {...props} className={`${props.className} live-catalog-search-wrap`}>
      <form className="live-catalog-search" onSubmit={search}>
        <label className="live-catalog-query"><Search size={18} aria-hidden="true" /><input aria-label="Kata kunci katalog" placeholder="Cari sound system, tenda, lighting..." maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} /></label>
        <CatalogDropdown kind="category" options={categoryOptions} value={currentCategory} onChange={name => update({ category: data.categories.find(item => item.name === name)?.id || '' })} containerProps={{ className: '' }} />
        <CatalogDropdown kind="location" options={cityOptions} value={currentCity} onChange={chooseCity} containerProps={{ className: 'live-catalog-city' }} />
        <button className="live-catalog-primary" type="submit">Cari alat <ArrowRight size={15} /></button>
      </form>
      <div className="live-catalog-location-help"><button type="button" onClick={detect} disabled={locating} aria-describedby="catalog-location-help"><LocateFixed size={15} />{locating ? 'Mencari lokasi…' : 'Gunakan lokasi saya'}</button><span id="catalog-location-help">Temukan kota vendor dalam 50 km dari lokasimu.</span></div>
      <p className="live-catalog-location-note" role="status">{locationNote || (!loading && !error && !data.cities.length ? 'Belum ada kota yang tersedia untuk dipilih.' : '')}</p>
    </div>;
    if (node.id === '84:4791') return <CatalogDropdown kind="sort" options={Object.values(sortLabels)} value={sortLabels[sort] || sortLabels.popular} onChange={label => update({ sort: Object.keys(sortLabels).find(key => sortLabels[key] === label) })} containerProps={props} />;
    if (node.id === '84:4821') return null;
    if (node.id === '84:4843') return <div {...props} className={`${props.className} live-catalog-grid`} aria-busy={loading}>
      {cart.error && <div className="live-catalog-status" role="alert"><p>Keranjang: {cart.error}</p><button type="button" onClick={cart.reload}>Muat ulang keranjang</button></div>}
      {wishlist.error && <div className="live-catalog-status" role="alert"><p>Wishlist: {wishlist.error}</p><button type="button" onClick={() => wishlist.refresh().catch(() => {})}>Muat ulang wishlist</button></div>}
      {loading ? <Skeleton variant="cards" label="Memuat katalog…" /> : error ? <div className="live-catalog-status" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></div> : !data.items.length ? <div className="live-catalog-status" role="status"><Package size={30} /><h2>{data.available ? 'Tidak ada alat yang sesuai' : 'Belum ada alat siap sewa'}</h2><p>{data.available ? 'Coba kota, kategori, atau kata kunci lain.' : 'Alat akan muncul setelah vendor aktif menambahkan barang aktif dengan stok tersedia.'}</p><button type="button" onClick={() => { setDraft(''); setParams({}); }}>Bersihkan filter</button></div> : data.items.map(item => <CatalogCard key={item.id} item={item} />)}
    </div>;
    if (node.id === '84:5352') return <nav className="live-catalog-pagination" aria-label="Halaman katalog">
      <button type="button" disabled={loading || data.page <= 1} onClick={() => goToPage(data.page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={16} /></button>
      <span aria-live="polite" aria-atomic="true">Halaman <strong>{data.page}</strong> dari {totalPages}</span>
      <button type="button" disabled={loading || data.page >= totalPages} onClick={() => goToPage(data.page + 1)} aria-label="Halaman berikutnya"><ChevronRight size={16} /></button>
    </nav>;
    return undefined;
  };
  const context = { ...parent, renderNode, formatText: (text, ancestors) => {
    const id = ancestors.at(-1)?.id;
    if (id === '84:4778') return `${data.available} Alat Siap Sewa`;
    if (id === '84:4783') return 'Perlengkapan event dari vendor di berbagai kota. Pilih kota sesuai kebutuhan acaramu.';
    if (id === '84:4842') return loading ? <Skeleton variant="inline" label="Memuat hasil katalog…" /> : error ? 'Katalog belum dapat dimuat' : `Menampilkan ${data.items.length} dari ${data.total} alat event${city ? ` di ${city}` : ''}`;
    return parent.formatText(text, ancestors);
  } };
  // Old /catalog?item= links used to open a popup.
  if (detailId) return <Navigate to={`/product/${encodeURIComponent(detailId)}`} replace />;
  return <InterfaceContext.Provider value={context}><DesignNode node={tree} /></InterfaceContext.Provider>;
}
