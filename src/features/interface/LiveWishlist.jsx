import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Heart, LoaderCircle, MapPin, Package, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { apiUrl } from '../../api';
import { useWishlist } from './useWishlist';
import './wishlist-page.css';

const money = value => `Rp${Number(value).toLocaleString('id-ID')}`;
function SavedPhoto({ entry }) {
  const [failed, setFailed] = useState(false);
  return entry.item?.image && !failed ? <img src={apiUrl(entry.item.image)} alt={entry.name} loading="lazy" onError={() => setFailed(true)} /> : <span className="wishlist-page-placeholder"><Package size={30} /><span>{entry.available ? 'Foto belum tersedia' : 'Alat tidak tersedia'}</span></span>;
}

export default function LiveWishlist() {
  const { user } = useAuth();
  const wishlist = useWishlist(user);
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState('');
  const query = params.get('q') || '';
  const [searchDraft, setSearchDraft] = useState({ query, value: query });
  if (searchDraft.query !== query) setSearchDraft({ query, value: query });
  const draft = searchDraft.query === query ? searchDraft.value : query;
  const category = params.get('category') || '';
  const status = ['available', 'unavailable'].includes(params.get('status')) ? params.get('status') : '';
  const sort = ['price-low', 'price-high'].includes(params.get('sort')) ? params.get('sort') : 'latest';
  const update = changes => setParams(previous => {
    const next = new URLSearchParams(previous); next.delete('page');
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    return next;
  }, { replace: true });
  const categories = [...new Map(wishlist.items.filter(entry => entry.item).map(entry => [entry.item.categoryId, entry.item.category])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'));
  const available = wishlist.items.filter(entry => entry.available).length;
  const filtered = wishlist.items.filter(entry => {
    const text = `${entry.name} ${entry.item?.vendor || ''} ${entry.item?.city || ''}`.toLocaleLowerCase('id');
    return text.includes(query.trim().toLocaleLowerCase('id')) && (!category || entry.item?.categoryId === category)
      && (!status || (status === 'available' ? entry.available : !entry.available));
  });
  if (sort === 'price-low' || sort === 'price-high') filtered.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return (Number(a.item?.price || 0) - Number(b.item?.price || 0)) * (sort === 'price-low' ? 1 : -1);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const requested = Number(params.get('page'));
  const page = Math.min(pages, Number.isInteger(requested) && requested > 0 ? requested : 1);
  const visible = filtered.slice((page - 1) * 12, page * 12);
  const remove = async entry => {
    setNotice('');
    try { await wishlist.setSaved(entry.id, false); setNotice(`${entry.name} dihapus dari wishlist.`); }
    catch { /* The shared wishlist alert reports the failed request. */ }
  };
  return <div className="wishlist-page">
    <nav className="wishlist-page-breadcrumb" aria-label="Breadcrumb"><Link to="/">Beranda</Link><ChevronRight size={13} /><span>Wishlist</span></nav>
    <section className="wishlist-page-hero">
      <div><span className="wishlist-page-eyebrow"><Heart size={14} /> PILIHAN FAVORITMU</span><h1>Wishlist Alat Event <span>{wishlist.ready ? `${wishlist.items.length} alat` : '…'}</span></h1><p>Simpan alat favorit dan cek harga serta ketersediaannya sebelum merencanakan acara.</p></div>
      <Link className="wishlist-page-primary" to="/catalog">Jelajahi katalog <ArrowRight size={16} /></Link>
    </section>
    {wishlist.loading ? <div className="wishlist-page-empty" role="status"><LoaderCircle className="wishlist-spinner" size={28} /><p>Memuat wishlist…</p></div> : <>
      {wishlist.error && <div className="wishlist-page-error" role="alert"><p>{wishlist.error}</p><button type="button" onClick={() => wishlist.accountChanged ? window.location.reload() : wishlist.refresh().catch(() => {})}>{wishlist.accountChanged ? 'Muat ulang halaman' : 'Muat ulang wishlist'}</button>{[401, 403].includes(wishlist.errorStatus) && <Link to="/login" state={{ message: 'Masuk kembali jika sesi akun Anda telah berakhir.' }}>Masuk kembali</Link>}</div>}
      <p className="wishlist-page-notice" role="status">{notice}</p>
      {wishlist.ready && wishlist.items.length > 0 && <>
        <div className="wishlist-page-summary"><span><strong>{available}</strong> alat tersedia</span><span><strong>{wishlist.items.length - available}</strong> belum tersedia</span><span>Tersimpan di akun Anda · maksimal {wishlist.limit} alat</span></div>
        <div className="wishlist-page-filters">
          <form className="wishlist-page-search" onSubmit={event => { event.preventDefault(); update({ q: draft.trim() }); }}><Search size={17} /><input type="search" aria-label="Cari di wishlist" placeholder="Cari nama alat, vendor, atau kota…" maxLength={120} value={draft} onChange={event => setSearchDraft({ query, value: event.target.value })} /><button type="submit">Cari</button></form>
          <select aria-label="Kategori wishlist" value={category} onChange={event => update({ category: event.target.value })}><option value="">Semua kategori</option>{category && !categories.some(([id]) => id === category) && <option value={category}>Kategori tidak tersedia</option>}{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <select aria-label="Ketersediaan wishlist" value={status} onChange={event => update({ status: event.target.value })}><option value="">Semua status</option><option value="available">Tersedia</option><option value="unavailable">Belum tersedia</option></select>
          <select aria-label="Urutkan wishlist" value={sort} onChange={event => update({ sort: event.target.value })}><option value="latest">Terbaru disimpan</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select>
        </div>
        <p className="wishlist-page-results">Menampilkan {visible.length} dari {filtered.length} alat</p>
      </>}
      {wishlist.ready && visible.length > 0 ? <div className="wishlist-page-grid">{visible.map(entry => <article key={entry.id} className={`wishlist-page-card${entry.available ? '' : ' is-unavailable'}`}>
        <div className="wishlist-page-photo"><SavedPhoto key={`${entry.id}:${entry.item?.image || ''}`} entry={entry} /><span className="wishlist-page-availability">{entry.available ? 'Tersedia' : 'Belum tersedia'}</span></div>
        <div className="wishlist-page-card-body"><p className="wishlist-page-category">{entry.item?.category || 'Alat tersimpan'}</p><h2>{entry.name}</h2>
          {entry.item ? <><p className="wishlist-page-vendor">{entry.item.verified && <ShieldCheck size={14} aria-label="Vendor terverifikasi" />}{entry.item.vendor}</p><p className="wishlist-page-city"><MapPin size={13} />{entry.item.city || 'Kota belum diisi'}</p></> : <p className="wishlist-page-unavailable-note">Alat ini sedang tidak dapat disewa. Anda dapat menyimpannya atau menghapusnya dari wishlist.</p>}
          <div className="wishlist-page-card-actions">{entry.item ? <span><strong>{money(entry.item.price)}</strong><small> /hari</small></span> : <span>Harga belum tersedia</span>}{entry.available && <Link to={`/product/${encodeURIComponent(entry.id)}`} aria-label={`Lihat detail ${entry.name}`}>Lihat <ArrowRight size={14} /></Link>}</div>
          <button className="wishlist-page-remove" type="button" aria-label={`Hapus ${entry.name} dari wishlist`} disabled={wishlist.pending.includes(entry.id)} onClick={() => remove(entry)}>{wishlist.pending.includes(entry.id) ? <LoaderCircle className="wishlist-spinner" size={15} /> : <Trash2 size={15} />}Hapus dari wishlist</button>
        </div>
      </article>)}</div> : wishlist.ready && <div className="wishlist-page-empty" role="status"><Heart size={34} /><h2>{wishlist.items.length ? 'Tidak ada alat yang sesuai' : 'Wishlist masih kosong'}</h2><p>{wishlist.items.length ? 'Coba kata kunci, kategori, atau status yang berbeda.' : 'Tekan ikon hati pada alat di katalog untuk menyimpannya di akun Anda.'}</p>{wishlist.items.length ? <button type="button" onClick={() => { setSearchDraft({ query, value: '' }); setParams({}); }}>Bersihkan filter</button> : <Link className="wishlist-page-primary" to="/catalog">Jelajahi katalog <ArrowRight size={15} /></Link>}</div>}
      {wishlist.ready && pages > 1 && <nav className="wishlist-page-pagination" aria-label="Halaman wishlist"><button type="button" disabled={page <= 1} aria-label="Halaman sebelumnya" onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(page - 1)); return next; })}><ChevronLeft size={16} /></button><span>Halaman {page} dari {pages}</span><button type="button" disabled={page >= pages} aria-label="Halaman berikutnya" onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(page + 1)); return next; })}><ChevronRight size={16} /></button></nav>}
    </>}
  </div>;
}
