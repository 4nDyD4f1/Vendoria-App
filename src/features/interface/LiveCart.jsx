import { useEffect, useMemo, useRef, useState } from 'react';
import { cappedDeposit } from './deposit';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, LoaderCircle, MapPin, Minus, Package, Plus, ShieldCheck, ShoppingCart, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { api, apiUrl } from '../../api';
import { checkoutCart, removeFromCart, setCartQuantity, useCart } from './useCart';
import CheckoutHead from './CheckoutSteps';
import CartPendingPayment from './CartPendingPayment';
import { paymentFromCart, paymentOrders } from './paymentEntry';
import { useCheckoutKyc } from '../kyc/useCheckoutKyc';
import './live-cart.css';
import Skeleton from '../../components/Skeleton';

const money = value => `Rp${Number(value).toLocaleString('id-ID')}`;
const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (value, days) => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return iso(date); };
const longDate = value => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

function Photo({ item, name }) {
  const [failed, setFailed] = useState(false);
  return item?.image && !failed ? <img src={apiUrl(item.image)} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <span className="cart-photo-empty"><Package size={26} /></span>;
}

function Field({ label, error, hint, children, wide }) {
  return <label className={`cart-field${wide ? ' is-wide' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className="cart-field-error" role="alert">{error}</small>}</label>;
}

export default function LiveCart() {
  const { user } = useAuth();
  const kyc = useCheckoutKyc();
  const placing = useRef(false);
  const navigate = useNavigate();
  const resumeOrders = paymentOrders(useSearchParams()[0].get('orders'));
  const pendingPayment = resumeOrders ? <CartPendingPayment key={`${user.user_id}:${resumeOrders}`} orders={resumeOrders} /> : null;
  const cart = useCart(user);
  const [busy, setBusy] = useState([]);
  const [notice, setNotice] = useState('');
  const [addresses, setAddresses] = useState({ items: null, error: '' });
  const today = iso(new Date());
  const [form, setForm] = useState({ eventName: '', category: '', startDate: '', endDate: '', venue: '', address: '', picName: user?.nama || '', picPhone: user?.no_telp || '', note: '' });
  const [useSaved, setUseSaved] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [errors, setErrors] = useState({});
  const [submit, setSubmit] = useState({ pending: false, error: '' });

  useEffect(() => {
    let active = true;
    api('/api/account/addresses').then(items => { if (active) setAddresses({ items, error: '' }); }, error => { if (active) setAddresses({ items: [], error: error.message }); });
    return () => { active = false; };
  }, []);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const saved = addresses.items || [];
  const chosen = saved.find(address => address.id === savedId);
  const choose = id => {
    setSavedId(id);
    const address = saved.find(entry => entry.id === id);
    if (address) setForm(current => ({ ...current, venue: address.name, address: address.address, note: address.note || '' }));
  };
  const toggleSaved = checked => {
    setUseSaved(checked);
    if (checked) choose(savedId || (saved.find(address => address.primary) || saved[0]).id);
  };

  const days = form.startDate && form.endDate && form.endDate > form.startDate ? Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) : 0;
  const vendors = useMemo(() => [...Map.groupBy(cart.items, entry => entry.vendorId).values()], [cart.items]);
  const usable = cart.items.filter(entry => entry.available);
  const unavailable = cart.items.length - usable.length;
  const perDay = usable.reduce((sum, entry) => sum + Number(entry.item.price) * entry.quantity, 0);
  const total = perDay * days;
  // Satu pesanan per vendor, jadi batas deposit dihitung per vendor.
  const orders = vendors.map(entries => entries.filter(entry => entry.available)).map(entries => ({
    set: entries.reduce((sum, entry) => sum + Number(entry.item.deposit) * entry.quantity, 0),
    rent: entries.reduce((sum, entry) => sum + Number(entry.item.price) * entry.quantity, 0) * days,
  }));
  const deposit = orders.reduce((sum, order) => sum + cappedDeposit(order.set, order.rent), 0);
  const capped = days > 0 && orders.some(order => order.set > cappedDeposit(order.set, order.rent));

  const run = async (id, action) => {
    setNotice(''); setBusy(current => [...current, id]);
    try { await action(); } catch (failure) { setNotice(failure.message); } finally { setBusy(current => current.filter(entry => entry !== id)); }
  };

  const validate = () => {
    const next = {};
    if (!form.eventName.trim()) next.eventName = 'Nama acara wajib diisi.';
    if (!form.category) next.category = 'Pilih kategori acara.';
    if (!form.startDate || form.startDate < today) next.startDate = 'Pilih tanggal mulai (hari ini atau setelahnya).';
    if (!form.endDate || form.endDate <= form.startDate) next.endDate = 'Tanggal selesai harus setelah tanggal mulai.';
    else if (days > 60) next.endDate = 'Masa sewa maksimal 60 hari.';
    if (!form.venue.trim()) next.venue = 'Nama venue wajib diisi.';
    if (!form.address.trim()) next.address = 'Alamat lengkap venue wajib diisi.';
    if (!form.picName.trim()) next.picName = 'Nama PIC wajib diisi.';
    if (!/^\+?[0-9][0-9 -]{7,18}$/.test(form.picPhone.trim())) next.picPhone = 'Nomor WhatsApp tidak valid.';
    return next;
  };
  const place = async event => {
    event.preventDefault();
    if (placing.current) return;
    placing.current = true;
    setSubmit({ pending: true, error: '' });
    try {
      if (!await kyc.verify()) return;
      const found = validate();
      setErrors(found);
      if (Object.keys(found).length) { document.querySelector('.cart-field-error')?.closest('label')?.querySelector('input,select,textarea')?.focus(); return; }
      const placed = await checkoutCart(form);
      const entry = paymentFromCart(user.user_id, placed.orders.map(order => order.orderId));
      navigate(entry.to, { state: entry.state });
    } catch (failure) {
      setErrors(failure.errors || {});
      if (!kyc.reject(failure)) setSubmit({ pending: false, error: failure.message });
    } finally { placing.current = false; setSubmit(current => ({ ...current, pending: false })); }
  };

  const head = <CheckoutHead current={0} crumb="Keranjang" title="Keranjang & Checkout" subtitle="Tinjau alat, lengkapi data acara, lalu lanjut ke pembayaran deposit." />;

  if (!cart.ready) return <div className="cart-page">{head}<Skeleton variant="detail" label="Memuat keranjang…" /></div>;
  if (cart.error && !cart.items.length) return <div className="cart-page">{head}{pendingPayment}<div className="cart-error" role="alert"><p>{cart.error}</p><button type="button" onClick={cart.reload}>Muat ulang keranjang</button></div></div>;
  if (!cart.items.length) return <div className="cart-page">{head}{pendingPayment}{!pendingPayment && <div className="cart-empty"><ShoppingCart size={34} /><h2>Keranjang masih kosong</h2><p>Pilih alat dari katalog, lalu tekan “Tambah ke keranjang” pada kartu atau detail alat.</p><Link className="cart-primary" to="/catalog">Jelajahi katalog <ArrowRight size={16} /></Link></div>}</div>;

  const canSubmit = !submit.pending && !unavailable && usable.length > 0;
  return <form className="cart-page" onSubmit={place} noValidate>{head}{pendingPayment}
    <div className="cart-layout">
      <div className="cart-main">
        {notice && <p className="cart-alert" role="alert">{notice}</p>}
        {unavailable > 0 && <p className="cart-alert" role="alert">{unavailable} alat sudah tidak tersedia. Hapus dari keranjang untuk melanjutkan checkout.</p>}
        {vendors.map(group => {
          const first = group[0];
          return <section className="cart-card" key={first.vendorId} aria-label={`Alat dari ${first.item?.vendor || 'vendor'}`}>
            <header className="cart-vendor"><div><h2>{first.item?.vendor || 'Vendor tidak tersedia'}</h2>{first.item?.verified && <span className="cart-kyc"><ShieldCheck size={13} /> KYC</span>}</div>
              {first.item && <p>{first.item.reviewCount ? <><Star size={13} fill="currentColor" />{Number(first.item.rating || 0).toLocaleString('id-ID')}</> : 'Belum ada ulasan'}<MapPin size={13} />{first.item.city || 'Kota belum diisi'}</p>}</header>
            {group.map(entry => {
              const pending = busy.includes(entry.id);
              return <article key={entry.id} className={`cart-item${entry.available ? '' : ' is-unavailable'}`}>
                <div className="cart-photo"><Photo item={entry.item} name={entry.name} /></div>
                <div className="cart-item-body">
                  <p className="cart-category">{entry.item?.category || 'Alat'}{entry.item && <span>Stok: {entry.item.stock}</span>}</p>
                  <h3>{entry.name}</h3>
                  {entry.available ? <p className="cart-unit">{money(entry.item.price)} <small>/hari · deposit {money(entry.item.deposit)}/unit</small></p> : <p className="cart-unit cart-unit-off">Alat ini tidak lagi tersedia.</p>}
                  <div className="cart-item-actions">
                    {entry.available && <div className="cart-qty" role="group" aria-label={`Jumlah ${entry.name}`}>
                      <button type="button" aria-label="Kurangi jumlah" disabled={pending || entry.quantity <= 1} onClick={() => run(entry.id, () => setCartQuantity(entry.id, entry.quantity - 1))}><Minus size={14} /></button>
                      <output aria-live="polite">{entry.quantity}</output>
                      <button type="button" aria-label="Tambah jumlah" disabled={pending || entry.quantity >= entry.item.stock} onClick={() => run(entry.id, () => setCartQuantity(entry.id, entry.quantity + 1))}><Plus size={14} /></button>
                    </div>}
                    <button type="button" className="cart-remove" disabled={pending} onClick={() => run(entry.id, () => removeFromCart(entry.id))}>{pending ? <LoaderCircle size={14} className="wishlist-spinner" /> : <Trash2 size={14} />} Hapus</button>
                  </div>
                </div>
                {entry.available && <div className="cart-line"><strong>{days ? money(Number(entry.item.price) * entry.quantity * days) : '—'}</strong><small>{days ? `${entry.quantity} unit × ${days} hari` : 'Pilih tanggal sewa'}</small></div>}
              </article>;
            })}
          </section>;
        })}

        <section className="cart-card cart-event" aria-labelledby="cart-event-title">
          <h2 id="cart-event-title">Detail Acara &amp; Lokasi</h2>
          <div className="cart-grid">
            <Field label="Nama acara" error={errors.eventName}><input value={form.eventName} maxLength={150} placeholder="Contoh: Festival Musik Kampus 2026" onChange={event => set('eventName', event.target.value)} aria-invalid={Boolean(errors.eventName)} /></Field>
            <Field label="Kategori acara" error={errors.category}><select value={form.category} onChange={event => set('category', event.target.value)} aria-invalid={Boolean(errors.category)}><option value="">Pilih kategori</option>{cart.categories.map(name => <option key={name}>{name}</option>)}</select></Field>
            <Field label="Tanggal mulai" error={errors.startDate}><input type="date" min={today} value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value, endDate: current.endDate && current.endDate <= event.target.value ? '' : current.endDate }))} aria-invalid={Boolean(errors.startDate)} /></Field>
            <Field label="Tanggal selesai" error={errors.endDate} hint={days ? `Masa sewa ${days} hari` : undefined}><input type="date" min={form.startDate ? addDays(form.startDate, 1) : today} value={form.endDate} onChange={event => set('endDate', event.target.value)} aria-invalid={Boolean(errors.endDate)} /></Field>
          </div>

          <div className="cart-saved">
            <label className={`cart-check${saved.length ? '' : ' is-disabled'}`}><input type="checkbox" checked={useSaved} disabled={!saved.length} onChange={event => toggleSaved(event.target.checked)} /><span>Gunakan alamat tersimpan</span></label>
            {addresses.items === null && <Skeleton variant="inline" label="Memuat alamat tersimpan…" />}
            {addresses.error && <small className="cart-field-error" role="alert">{addresses.error}</small>}
            {addresses.items && !saved.length && !addresses.error && <small>Belum ada alamat tersimpan. <Link to="/akun/alamat">Tambahkan di Akun › Alamat Acara</Link></small>}
            {useSaved && <div className="cart-saved-pick">
              <label className="cart-field is-wide"><span>Pilih alamat acara</span>
                <select value={savedId} onChange={event => choose(event.target.value)} aria-label="Alamat acara tersimpan">{saved.map(address => <option key={address.id} value={address.id}>{address.primary ? '★ ' : ''}{address.name} — {address.address}</option>)}</select></label>
              {chosen && <p className="cart-saved-preview"><MapPin size={15} /><span><strong>{chosen.name}{chosen.primary && <em>Utama</em>}</strong>{chosen.address}{chosen.note && <small>Catatan: {chosen.note}</small>}</span></p>}
            </div>}
          </div>

          <div className="cart-grid">
            <Field label="Nama venue" error={errors.venue}><input value={form.venue} maxLength={150} readOnly={useSaved} placeholder="Gedung / lapangan" onChange={event => set('venue', event.target.value)} aria-invalid={Boolean(errors.venue)} /></Field>
            <Field label="Nama PIC lapangan" error={errors.picName}><input value={form.picName} maxLength={120} onChange={event => set('picName', event.target.value)} aria-invalid={Boolean(errors.picName)} /></Field>
            <Field label="Alamat lengkap venue" wide error={errors.address} hint={useSaved ? 'Terisi dari alamat tersimpan. Hilangkan centang untuk mengubahnya.' : undefined}><input value={form.address} maxLength={500} readOnly={useSaved} placeholder="Jalan, kelurahan, kota" onChange={event => set('address', event.target.value)} aria-invalid={Boolean(errors.address)} /></Field>
            <Field label="WhatsApp PIC" error={errors.picPhone}><input type="tel" inputMode="tel" value={form.picPhone} maxLength={20} placeholder="0812 3456 7890" onChange={event => set('picPhone', event.target.value)} aria-invalid={Boolean(errors.picPhone)} /></Field>
            <Field label="Catatan akses & loading" wide error={errors.note} hint={`${form.note.length}/300`}><textarea rows={3} value={form.note} maxLength={300} readOnly={useSaved} placeholder="Akses truk, lantai, jam bongkar muat" onChange={event => set('note', event.target.value)} /></Field>
          </div>
        </section>
      </div>

      <aside className="cart-summary" aria-label="Ringkasan pembayaran">
        <h2>{vendors.length} Vendor · {usable.length} Jenis Alat</h2>
        <dl>
          <div><dt>Total sewa {days ? `(${days} hari)` : ''}</dt><dd>{days ? money(total) : '—'}</dd></div>
          <div><dt>Jaminan deposit escrow</dt><dd>{days ? money(deposit) : '—'}</dd></div>
          <div><dt>Logistik &amp; pemasangan</dt><dd>Dibayar saat pelunasan</dd></div>
          <div className="cart-pay"><dt>Bayar sekarang (deposit)</dt><dd>{days ? money(deposit) : '—'}</dd></div>
          {capped && <div><dt>Deposit dibatasi maksimal 60% dari biaya sewa</dt><dd /></div>}
        </dl>
        <p className="cart-remaining"><Clock size={15} />{days ? `Setelah vendor konfirmasi, sewa ${money(total)} dilunasi penuh sebelum serah terima. Deposit jaminan tidak mengurangi tagihan.` : 'Pilih tanggal sewa untuk melihat total pembayaran.'}</p>
        {submit.error && <p className="cart-alert" role="alert">{submit.error}</p>}
        {kyc.notice}
        <button className="cart-primary" type="submit" disabled={!canSubmit}>{submit.pending ? <LoaderCircle className="wishlist-spinner" size={16} /> : null}Buat Pesanan &amp; Lanjut Bayar<ArrowRight size={16} /></button>
        {vendors.length > 1 && <p className="cart-hint"><CalendarDays size={14} />Pesanan otomatis dipisah per vendor.</p>}
        <ul className="cart-assure"><li><Check size={14} />Deposit disimpan escrow, bukan ke vendor</li><li><Check size={14} />Stok dicek ulang saat pesanan dibuat</li><li><Check size={14} />Pesanan tercatat di Pesanan Saya</li></ul>
      </aside>
    </div>
  </form>;
}
