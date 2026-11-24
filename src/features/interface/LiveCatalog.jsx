import { use, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, LocateFixed, MapPin, Package, Search, ShieldCheck, Star, X } from 'lucide-react';
import { api, apiUrl } from '../../api';
import { InterfaceContext } from './InterfaceContext';
import DesignNode from './DesignNode';
import CatalogDropdown from './CatalogDropdown';
import CatalogWishlistButton from './CatalogWishlistButton';
import AddToCartButton from './AddToCartButton';
import { useWishlist } from './useWishlist';
import { useCart } from './useCart';
import './live-catalog.css';

const sortLabels = { popular: 'Paling populer', 'price-low': 'Harga terendah', 'price-high': 'Harga tertinggi', rating: 'Rating tertinggi' };
const money = value => `Rp${Number(value).toLocaleString('id-ID')}`;
const empty = { items: [], cities: [], categories: [], total: 0, available: 0, page: 1, size: 12 };

function Photo({ item }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed
    ? <img src={apiUrl(item.image)} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
    : <div className="live-catalog-photo-empty"><Package size={32} aria-hidden="true" /><span>Foto belum tersedia</span></div>;
}

function ItemDialog({ id, onClose }) {
  const dialog = useRef(null);
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const request = new AbortController();
    api(`/api/catalog/${encodeURIComponent(id)}`).then(item => { if (!request.signal.aborted) setState({ item }); })
      .catch(error => { if (!request.signal.aborted) setState({ error: error.message }); });
    return () => request.abort();
  }, [id]);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); previous?.focus({ preventScroll: true }); };
  }, []);
  const item = state.item;
  return <dialog ref={dialog} className="live-catalog-dialog" aria-labelledby="catalog-detail-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="live-catalog-detail">
      <button type="button" className="live-catalog-close" aria-label="Tutup detail alat" onClick={onClose}><X size={20} /></button>
      <h2 id="catalog-detail-title">{item?.name || 'Detail alat'}</h2>
      {state.loading && <p role="status">Memuat detail alat…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {item && <>
        <div className="live-catalog-detail-photo"><Photo item={item} /></div>
        <p>{item.category}</p>
        <p>{item.vendor}{item.verified && <ShieldCheck size={16} aria-label="Vendor terverifikasi" />} · {item.city || 'Kota belum diisi'}</p>
        <p><strong>{money(item.price)}</strong> /hari</p>
        <dl><div><dt>Stok</dt><dd>{item.stock} unit</dd></div><div><dt>Minimal DP</dt><dd>{money(item.deposit)}</dd></div><div><dt>Kondisi</dt><dd>{item.condition || 'Belum diisi'}</dd></div></dl>
        <h3>Deskripsi</h3><p className="live-catalog-description">{item.description || 'Deskripsi belum diisi oleh vendor.'}</p>
        <p>{item.reviewCount ? `${Number(item.rating || 0).toLocaleString('id-ID')} · ${item.reviewCount} ulasan vendor` : 'Belum ada ulasan vendor'}</p>
        <div className="live-catalog-save"><CatalogWishlistButton item={item} /><span>Simpan alat ke wishlist</span></div>
        <AddToCartButton item={item} />
      </>}
    </div>
  </dialog>;
}

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
      {loading ? <p className="live-catalog-status" role="status">Memuat katalog…</p> : error ? <div className="live-catalog-status" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></div> : !data.items.length ? <div className="live-catalog-status" role="status"><Package size={30} /><h2>{data.available ? 'Tidak ada alat yang sesuai' : 'Belum ada alat siap sewa'}</h2><p>{data.available ? 'Coba kota, kategori, atau kata kunci lain.' : 'Alat akan muncul setelah vendor aktif menambahkan barang aktif dengan stok tersedia.'}</p><button type="button" onClick={() => { setDraft(''); setParams({}); }}>Bersihkan filter</button></div> : data.items.map(item => <article key={item.id} className="live-catalog-card">
        <div className="live-catalog-photo-wrap"><button type="button" className="live-catalog-photo" onClick={() => update({ item: item.id }, false)} aria-label={`Lihat detail ${item.name}`}><Photo item={item} /><span className="live-catalog-stock">{item.stock === 1 ? 'Sisa 1 unit' : 'Tersedia'}</span></button><CatalogWishlistButton item={item} overlay /></div>
        <div className="live-catalog-card-body"><p className="live-catalog-category">{item.category}</p><h2><button type="button" onClick={() => update({ item: item.id }, false)}>{item.name}</button></h2>
          <p className="live-catalog-vendor">{item.verified && <ShieldCheck size={14} aria-label="Vendor terverifikasi" />}{item.vendor}</p>
          <p className="live-catalog-meta"><Star size={13} aria-hidden="true" />{item.reviewCount ? `${Number(item.rating || 0).toLocaleString('id-ID')} (${item.reviewCount})` : 'Belum ada ulasan'}<MapPin size={13} aria-hidden="true" />{item.city || 'Kota belum diisi'}</p>
          <div className="live-catalog-price"><span><strong>{money(item.price)}</strong> /hari</span><div className="live-catalog-card-actions"><button type="button" onClick={() => update({ item: item.id }, false)}>Lihat <ArrowRight size={14} /></button><AddToCartButton key={parent.user?.user_id || 'guest'} item={item} compact /></div></div>
        </div>
      </article>)}
    </div>;
    if (node.id === '84:5352') return <nav className="live-catalog-pagination" aria-label="Halaman katalog">
      <button type="button" disabled={loading || data.page <= 1} onClick={() => update({ page: data.page - 1 }, false)} aria-label="Halaman sebelumnya"><ChevronLeft size={16} /></button>
      <span aria-live="polite" aria-atomic="true">Halaman <strong>{data.page}</strong> dari {totalPages}</span>
      <button type="button" disabled={loading || data.page >= totalPages} onClick={() => update({ page: data.page + 1 }, false)} aria-label="Halaman berikutnya"><ChevronRight size={16} /></button>
    </nav>;
    return undefined;
  };
  const context = { ...parent, renderNode, formatText: (text, ancestors) => {
    const id = ancestors.at(-1)?.id;
    if (id === '84:4778') return `${data.available} Alat Siap Sewa`;
    if (id === '84:4783') return 'Perlengkapan event dari vendor di berbagai kota. Pilih kota sesuai kebutuhan acaramu.';
    if (id === '84:4842') return loading ? 'Memuat hasil katalog…' : error ? 'Katalog belum dapat dimuat' : `Menampilkan ${data.items.length} dari ${data.total} alat event${city ? ` di ${city}` : ''}`;
    return parent.formatText(text, ancestors);
  } };
  return <InterfaceContext.Provider value={context}><DesignNode node={tree} />{detailId && <ItemDialog key={detailId} id={detailId} onClose={() => update({ item: '' }, false)} />}</InterfaceContext.Provider>;
}
