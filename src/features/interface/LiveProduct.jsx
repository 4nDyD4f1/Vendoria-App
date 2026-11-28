import { useEffect, useState } from 'react';
import { cappedDeposit } from './deposit';
import { Link } from 'react-router-dom';
import { Check, Clock, MapPin, Minus, Package, Plus, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { api } from '../../api';
import { catalogProducts } from './catalogProducts';
import CatalogCard, { money, Photo } from './CatalogCard';
import CatalogWishlistButton from './CatalogWishlistButton';
import AddToCartButton from './AddToCartButton';
import { useCart } from './useCart';
import './live-product.css';
import Skeleton from '../../components/Skeleton';

const tabs = [['product', '', 'Deskripsi & Spesifikasi'], ['product-condition', '/kondisi', 'Kondisi Barang & SOP Serah Terima'], ['product-reviews', '/ulasan', 'Ulasan Penyewa'], ['product-policy', '/kebijakan', 'Kebijakan Deposit & Klaim']];
const sop = [
  ['Pelunasan sebelum serah terima', 'Alat baru diserahkan setelah biaya sewa dibayar penuh.'],
  ['Foto kondisi awal oleh vendor', 'Empat foto dan catatan kondisi per alat sebelum unit diserahkan.'],
  ['Foto pengembalian oleh vendor', 'Empat foto dan catatan kondisi per alat saat unit kembali.'],
  ['Inspeksi dan pengembalian deposit', 'Vendor memeriksa unit; tanpa kerusakan, deposit dikembalikan ke penyewa.'],
];
const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const nextDay = value => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + 1); return iso(date); };
const rating = item => Number(item.rating || 0).toLocaleString('id-ID');

function Booking({ item }) {
  const { user } = useAuth();
  const cart = useCart(user);
  const [chosen, setChosen] = useState(1);
  const [dates, setDates] = useState({ startDate: '', endDate: '' });
  const entry = cart.items.find(saved => saved.id === String(item.id));
  const quantity = entry?.quantity ?? chosen;
  const days = dates.startDate && dates.endDate > dates.startDate ? Math.round((new Date(dates.endDate) - new Date(dates.startDate)) / 86400000) : 0;
  const total = Number(item.price) * quantity * days;
  const asked = Number(item.deposit) * quantity;
  const deposit = cappedDeposit(asked, total); // same rule as the cart
  const customer = !user || user.role === 'customer';

  return <aside className="product-booking" aria-label="Pesan alat">
    <p className="product-category">{item.category}</p>
    <h1>{item.name}</h1>
    <p className="product-line"><Star size={15} className="live-catalog-star" aria-hidden="true" />{item.reviewCount ? <><strong>{rating(item)}</strong>({item.reviewCount} ulasan vendor)</> : 'Belum ada ulasan'}<span aria-hidden="true">•</span>{item.vendor}</p>
    {item.verified && <p className="product-badge"><ShieldCheck size={14} aria-hidden="true" />KYC Terverifikasi</p>}
    <p className="product-price"><strong>{money(item.price)}</strong>/hari</p>
    <div className="product-dates">
      <label>Mulai<input type="date" min={iso(new Date())} value={dates.startDate} onChange={event => setDates(current => ({ startDate: event.target.value, endDate: current.endDate > event.target.value ? current.endDate : '' }))} /></label>
      <label>Selesai<input type="date" min={nextDay(dates.startDate || iso(new Date()))} value={dates.endDate} onChange={event => setDates(current => ({ ...current, endDate: event.target.value }))} /></label>
    </div>
    <p className="product-line"><Clock size={15} aria-hidden="true" />{days ? `Durasi: ${days} hari` : 'Pilih tanggal untuk melihat estimasi'}</p>
    {customer && <div className="product-quantity">
      <span>Jumlah unit <small>{entry ? '(ubah di keranjang)' : `(maks. ${item.stock} unit)`}</small></span>
      <div role="group" aria-label="Jumlah unit">
        <button type="button" aria-label="Kurangi jumlah" disabled={Boolean(entry) || quantity <= 1} onClick={() => setChosen(quantity - 1)}><Minus size={14} /></button>
        <output aria-live="polite">{quantity}</output>
        <button type="button" aria-label="Tambah jumlah" disabled={Boolean(entry) || quantity >= item.stock} onClick={() => setChosen(quantity + 1)}><Plus size={14} /></button>
      </div>
    </div>}
    <dl>
      <div><dt>Biaya sewa {days ? `(${days} hari × ${quantity} unit)` : ''}</dt><dd>{days ? money(total) : '—'}</dd></div>
      <div><dt>Bayar sekarang (deposit jaminan){days && asked > deposit ? ', dibatasi 60% biaya sewa' : !days ? ', maks. 60% biaya sewa' : ''}</dt><dd>{days ? money(deposit) : money(asked)}</dd></div>
      <div><dt>Dilunasi setelah konfirmasi vendor</dt><dd>{days ? money(total) : '—'}</dd></div>
    </dl>
    {customer && cart.error && <p className="live-catalog-cart-error" role="alert">{cart.error}</p>}
    <div className="product-actions"><AddToCartButton key={user?.user_id || 'guest'} item={item} quantity={quantity} /><CatalogWishlistButton item={item} /></div>
    <ul>{[...(item.verified ? ['Vendor terverifikasi'] : []), 'Dana escrow aman', 'Bukti foto 2 arah'].map(text => <li key={text}><Check size={14} aria-hidden="true" />{text}</li>)}</ul>
  </aside>;
}

function Reviews({ item }) {
  const [state, setState] = useState({ items: null, error: '' });
  useEffect(() => {
    let active = true;
    api(`/api/catalog/${item.id}/reviews`).then(items => { if (active) setState({ items, error: '' }); }, error => { if (active) setState({ items: null, error: error.message }); });
    return () => { active = false; };
  }, [item.id]);
  if (state.error) return <p className="product-text" role="alert">{state.error}</p>;
  if (!state.items) return <Skeleton variant="text" label="Memuat ulasan…" />;
  return <ul className="product-reviews">{state.items.map((review, index) => <li key={index}>
    <p className="product-line"><strong>{review.author}</strong>
      <span className="product-stars" role="img" aria-label={`${review.rating} dari 5 bintang`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} size={13} className={value <= review.rating ? 'live-catalog-star' : undefined} aria-hidden="true" />)}</span>
      <time dateTime={review.at}>{new Date(review.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
    {review.comment && <p className="product-text">{review.comment}</p>}
    {review.items && <small>Menyewa: {review.items}</small>}
  </li>)}</ul>;
}

function TabPanel({ item, tab }) {
  if (tab === 'product-condition') return <>
    <h2>Kondisi barang &amp; SOP serah terima</h2>
    <p className="product-text">{item.condition || 'Kondisi belum diisi oleh vendor.'}</p>
    <ol>{sop.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}</ol>
  </>;
  if (tab === 'product-reviews') return <>
    <h2>Ulasan penyewa</h2>
    {item.reviewCount
      ? <><p className="product-score"><Star size={22} className="live-catalog-star" aria-hidden="true" /><strong>{rating(item)}</strong>dari {item.reviewCount} ulasan untuk {item.vendor}</p><Reviews item={item} /></>
      : <p className="product-text">Belum ada ulasan untuk vendor ini.</p>}
  </>;
  if (tab === 'product-policy') return <>
    <h2>Kebijakan deposit &amp; klaim</h2>
    <h3>Deposit jaminan</h3>
    <ul><li>Deposit {money(item.deposit)} per unit dibayar saat memesan dan tidak mengurangi biaya sewa</li><li>Deposit yang ditagih paling banyak 60% dari biaya sewa pesanan</li><li>Pesanan batal otomatis bila deposit tidak dibayar dalam 24 jam</li><li>Vendor harus mengonfirmasi dalam 24 jam setelah deposit dibayar; bila tidak, pesanan batal dan deposit dikembalikan</li><li>Biaya sewa dilunasi penuh setelah vendor mengonfirmasi, sebelum serah terima</li><li>Deposit dikembalikan setelah pesanan selesai tanpa masalah, atau bila pesanan batal sebelum pelunasan</li><li>Deposit diberikan ke vendor bila laporan kerusakan disetujui admin</li></ul>
    <h3>Laporan penyewa</h3>
    <ul><li>Barang tidak sampai: mulai tanggal sewa; bila disetujui, sewa dan deposit kembali 100%</li><li>Barang kurang atau tidak sesuai: maksimal 24 jam setelah serah terima</li><li>Rusak, tidak berfungsi, atau masalah lain: selama masa sewa</li><li>Sertakan foto bukti (kecuali barang tidak sampai); satu laporan per pesanan</li><li>Vendor dapat menanggapi sebelum admin memutuskan</li></ul>
  </>;
  return <>
    <h2>Tentang perlengkapan ini</h2>
    <p className="product-text">{item.description || 'Deskripsi belum diisi oleh vendor.'}</p>
    <dl className="product-specs"><div><dt>Kategori</dt><dd>{item.category}</dd></div><div><dt>Stok</dt><dd>{item.stock} unit</dd></div><div><dt>Minimal DP</dt><dd>{money(item.deposit)}</dd></div></dl>
  </>;
}

function Related({ item }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    // shortcut: the public item has no vendorId, so match by vendor name; switch to an id filter once the API exposes it.
    api(`/api/catalog?${new URLSearchParams({ q: item.vendor, size: '60' })}`)
      .then(result => { if (active) setItems(result.items.filter(other => other.vendor === item.vendor && other.id !== item.id).slice(0, 3)); })
      .catch(() => {}); // optional section: stays hidden when it cannot load
    return () => { active = false; };
  }, [item.id, item.vendor]);
  if (!items.length) return null;
  return <section className="product-related">
    <p className="product-category">Dari vendor yang sama</p>
    <h2>Alat Lain dari Vendor Ini</h2>
    <div className="live-catalog-grid">{items.map(other => <CatalogCard key={other.id} item={other} />)}</div>
  </section>;
}

export default function LiveProduct({ id, tab, fallback }) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    const request = new AbortController();
    api(`/api/catalog/${encodeURIComponent(id)}`).then(item => { if (!request.signal.aborted) setState({ item }); })
      .catch(error => { if (!request.signal.aborted) setState({ error }); });
    return () => request.abort();
  }, [id, retry]);

  const { item, error } = state;
  if (state.loading) return <Skeleton variant="detail" label="Memuat detail alat…" />;
  // The home page still links to the Figma sample products, which have no database row.
  if (error?.status === 404 && catalogProducts.some(sample => String(sample.id) === id)) return fallback;
  if (error) return <div className="live-catalog-status" role="alert"><Package size={30} /><p>{error.message}</p>{error.status !== 404 && <button type="button" onClick={() => { setState({ loading: true }); setRetry(value => value + 1); }}>Coba lagi</button>} <Link to="/catalog">Kembali ke katalog</Link></div>;

  return <div className="product-page">
    <nav className="product-breadcrumb" aria-label="Breadcrumb"><Link to="/">Beranda</Link>›<Link to="/catalog">Katalog</Link>›<Link to={`/catalog?category=${item.categoryId}`}>{item.category}</Link>›<span aria-current="page">{item.name}</span></nav>
    <p className="product-chips"><span><Check size={14} aria-hidden="true" />Stok tersedia ({item.stock} unit)</span><span><MapPin size={14} aria-hidden="true" />{item.city || 'Kota belum diisi'}</span></p>
    <div className="product-layout">
      <div className="product-main">
        <div className="product-photo"><Photo item={item} /></div>
        <section className="product-card">
          <nav className="product-tabs" aria-label="Informasi alat">{tabs.map(([key, path, label]) => <Link key={key} to={`/product/${item.id}${path}`} aria-current={tab === key ? 'page' : undefined}>{label}{key === 'product-reviews' && ` (${item.reviewCount})`}</Link>)}</nav>
          <TabPanel item={item} tab={tab} />
        </section>
        <section className="product-card product-vendor">
          <h3>{item.vendor}</h3>
          <p className="product-line">{item.verified && <><ShieldCheck size={15} aria-hidden="true" />Vendor terverifikasi<span aria-hidden="true">•</span></>}<MapPin size={15} aria-hidden="true" />{item.city || 'Kota belum diisi'}</p>
        </section>
        <Related item={item} />
      </div>
      <Booking item={item} />
    </div>
  </div>;
}
