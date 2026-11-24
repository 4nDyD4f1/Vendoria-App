import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronRight, LoaderCircle, MapPin, Package, RefreshCw, Search, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { api, apiUrl } from '../../api';
import './live-orders.css';

const statuses = {
  semua: 'Semua', menunggu_pembayaran: 'Menunggu pembayaran', menunggu_konfirmasi: 'Menunggu konfirmasi',
  dikonfirmasi: 'Terkonfirmasi', berjalan: 'Sedang disewa', dikembalikan: 'Dikembalikan', selesai: 'Selesai', dibatalkan: 'Dibatalkan',
};
const label = value => statuses[value] || String(value || '—').replaceAll('_', ' ');
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value, time = false) => value ? new Date(time ? value : `${value}T00:00:00`).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '—';
const detailPath = order => `/pesanan/${encodeURIComponent(order.orderId)}`;

// Invalidate older requests on navigation/account changes and revalidate on focus.
function useOrderResource(url, owner) {
  const control = useRef({ sequence: 0, active: false });
  const [state, setState] = useState({ url: null, owner: null, data: null, error: '', status: 0, loading: false });
  const load = useCallback(() => {
    if (!url) return Promise.resolve();
    const lifecycle = control.current;
    const request = ++lifecycle.sequence;
    setState(previous => ({ ...previous, loading: true }));
    return api(url).then(data => {
      if (data.userId != null && String(data.userId) !== owner)
        throw Object.assign(new Error('Akun berubah. Muat ulang halaman untuk melanjutkan.'), { status: 409 });
      if (lifecycle.active && request === lifecycle.sequence) setState({ url, owner, data, error: '', status: 0, loading: false });
    }).catch(error => {
      if (lifecycle.active && request === lifecycle.sequence) setState(previous => ({ url, owner,
        data: previous.url === url && previous.owner === owner && ![401, 403, 404, 409].includes(error.status) ? previous.data : null,
        error: error.message, status: error.status, loading: false }));
    });
  }, [url, owner]);
  useEffect(() => {
    const lifecycle = control.current;
    lifecycle.active = true;
    queueMicrotask(() => { if (lifecycle.active) load(); });
    const focus = () => { if (!document.hidden) load(); };
    window.addEventListener('focus', focus);
    const timer = setInterval(focus, 30_000);
    return () => { lifecycle.active = false; ++lifecycle.sequence; clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [load]);
  const current = state.url === url && state.owner === owner;
  return { data: current ? state.data : null, error: current ? state.error : '', status: current ? state.status : 0,
    loading: Boolean(url) && (!current || state.loading), refresh: load,
    accept: data => { ++control.current.sequence; setState({ url, owner, data, error: '', status: 0, loading: false }); } };
}

function Status({ value }) { return <span className={`co-status co-status-${value}`}>{label(value)}</span>; }
function LoadState({ resource, children }) {
  return <>{resource.error && <div className="co-error" role="alert"><p>{resource.error}</p>
    {[401, 403].includes(resource.status) ? <Link to="/login">Masuk kembali</Link> : <button type="button" onClick={resource.status === 409 ? () => window.location.reload() : resource.refresh}>{resource.status === 409 ? 'Muat ulang halaman' : 'Coba lagi'}</button>}</div>}
    {!resource.data && resource.loading && <div className="co-empty" role="status"><LoaderCircle className="co-spinner" size={28} /><p>Memuat pesanan…</p></div>}
    {resource.data && children}</>;
}
function Photo({ src, name }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={apiUrl(src)} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <span className="co-photo-placeholder"><Package size={26} /><span>Foto belum tersedia</span></span>;
}
function Breadcrumb({ detail = false }) {
  return <nav className="co-breadcrumb" aria-label="Breadcrumb"><Link to="/">Beranda</Link><ChevronRight size={13} />{detail ? <><Link to="/pesanan">Pesanan Saya</Link><ChevronRight size={13} /><span>Detail pesanan</span></> : <span>Pesanan Saya</span>}</nav>;
}
function PayLink({ order }) {
  return order.status === 'menunggu_pembayaran' ? <Link className="co-primary" to={`/keranjang?orders=${encodeURIComponent(order.orderId)}`}>Bayar deposit <ArrowRight size={15} /></Link> : null;
}

function OrdersList({ owner }) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const status = Object.hasOwn(statuses, params.get('status')) ? params.get('status') : 'semua';
  const requestedPage = Number(params.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1_000_000 ? requestedPage : 1;
  const [draft, setDraft] = useState({ query, value: query });
  if (draft.query !== query) setDraft({ query, value: query });
  const search = draft.query === query ? draft.value : query;
  const update = changes => setParams(previous => {
    const next = new URLSearchParams(previous); next.delete('page');
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    return next;
  });
  const resource = useOrderResource(`/api/orders?${new URLSearchParams({ status, q: query, page: String(page), size: '10' })}`, owner);
  const data = resource.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  return <div className="co-page"><Breadcrumb /><header className="co-heading"><div><p className="co-eyebrow">PENYEWAAN ANDA</p><h1>Pesanan Saya</h1><p>Pantau pembayaran, jadwal sewa, dan perkembangan pesanan Anda.</p></div><Link className="co-secondary" to="/catalog">Jelajahi katalog <ArrowRight size={16} /></Link></header>
    <div className="co-toolbar"><form className="co-search" onSubmit={event => { event.preventDefault(); update({ q: search.trim() }); }}><Search size={18} /><input type="search" aria-label="Cari pesanan" placeholder="Cari kode pesanan, alat, atau vendor…" maxLength={120} value={search} onChange={event => setDraft({ query, value: event.target.value })} /><button type="submit">Cari</button></form><button className="co-secondary" type="button" disabled={resource.loading} onClick={resource.refresh}><RefreshCw size={15} />Muat ulang</button></div>
    <nav className="co-tabs" aria-label="Filter status pesanan">{Object.entries(statuses).map(([key, name]) => <button key={key} type="button" aria-current={key === status ? 'page' : undefined} onClick={() => update({ status: key === 'semua' ? '' : key })}>{name}{data && <span>{data.counts[key] ?? 0}</span>}</button>)}</nav>
    <LoadState resource={resource}>{data && <>
      <div className="co-summary"><p><strong>{data.total}</strong> pesanan{query ? ` cocok dengan “${query}”` : ''}</p><p><ShieldCheck size={17} />Deposit terverifikasi pesanan aktif <strong>{money(data.escrow)}</strong></p></div>
      {data.items.length ? <div className="co-list">{data.items.map(order => <article className="co-card" key={order.orderId}>
        <div className="co-card-top"><div><Link className="co-code" to={detailPath(order)}>#{order.code}</Link><p className="co-muted">Dipesan {date(order.orderedAt, true)}</p></div><Status value={order.status} /></div>
        <div className="co-card-body"><div className="co-package"><Package size={25} /></div><div className="co-order-info"><h2>{order.equipmentSummary || 'Rincian alat belum tersedia'}</h2><p>{order.vendorName}{order.vendorCity ? ` · ${order.vendorCity}` : ''}</p><p><CalendarDays size={15} />{date(order.startDate)} – {date(order.endDate)}</p>{order.location && <p><MapPin size={15} />{order.location}</p>}</div><dl className="co-card-totals"><div><dt>Total sewa</dt><dd>{money(order.totalRental)}</dd></div><div><dt>Deposit</dt><dd>{money(order.totalDp)}</dd></div><div><dt>Pembayaran terverifikasi</dt><dd>{money(order.paid)}</dd></div></dl></div>
        <div className="co-card-actions">{order.hasOpenClaim && <span className="co-muted">Klaim sedang diproses</span>}<Link className="co-secondary" to={detailPath(order)}>Lihat detail <ChevronRight size={15} /></Link><PayLink order={order} />{order.canReview && <Link className="co-secondary" to={`${detailPath(order)}/pengembalian`}>Beri ulasan <Star size={15} /></Link>}</div>
      </article>)}</div> : <section className="co-empty" role="status"><Package size={36} /><h2>{query || status !== 'semua' ? 'Tidak ada pesanan yang sesuai' : 'Belum ada pesanan'}</h2><p>{query || status !== 'semua' ? 'Coba kata kunci atau status yang berbeda.' : 'Pilih alat di katalog untuk memulai penyewaan Anda.'}</p>{query || status !== 'semua' ? <button className="co-secondary" type="button" onClick={() => { setDraft({ query: '', value: '' }); setParams({}); }}>Bersihkan filter</button> : <Link className="co-primary" to="/catalog">Cari alat</Link>}</section>}
      {pages > 1 && <nav className="co-pagination" aria-label="Halaman pesanan"><button className="co-secondary" type="button" disabled={data.page <= 1 || resource.loading} onClick={() => update({ page: String(data.page - 1) })}>Sebelumnya</button><span>Halaman {data.page} dari {pages}</span><button className="co-secondary" type="button" disabled={data.page >= pages || resource.loading} onClick={() => update({ page: String(data.page + 1) })}>Berikutnya</button></nav>}
    </>}</LoadState>
  </div>;
}

function ReviewForm({ order, owner, onSaved }) {
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return <form className="co-review-form" aria-label="Ulasan pesanan" onSubmit={async event => {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setState({ busy: true, error: '' });
    try {
      const saved = await api(`/api/orders/${order.orderId}/review`, { method: 'POST', headers: { 'X-Customer-Orders': '1', 'X-Customer-Orders-Owner': String(owner) }, body: { rating: Number(rating), comment } });
      if (mounted.current) onSaved(saved);
    } catch (error) { if (mounted.current) setState({ busy: false, error: error.message }); }
    finally { pending.current = false; }
  }}><h2>Beri ulasan penyewaan</h2><p className="co-muted">Ulasan dapat dikirim satu kali setelah pesanan selesai.</p>
    <label>Penilaian<select value={rating} disabled={state.busy} onChange={event => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} bintang</option>)}</select></label>
    <label>Pengalaman Anda (opsional)<textarea rows={4} maxLength={1000} value={comment} disabled={state.busy} onChange={event => setComment(event.target.value)} /></label>
    {state.error && <p className="co-error" role="alert">{state.error}</p>}<button className="co-primary" type="submit" disabled={state.busy}>{state.busy && <LoaderCircle size={16} className="co-spinner" />}Kirim ulasan</button>
  </form>;
}

function Evidence({ owner, orderId, mode }) {
  const resource = useOrderResource(`/api/orders/${orderId}/handovers`, owner);
  const type = mode === 'order-return' ? 'pengembalian' : 'serah_terima';
  const data = resource.data;
  const evidence = data?.evidence.filter(entry => entry.type === type) || [];
  return <section className="co-card"><h2>Bukti {type === 'pengembalian' ? 'pengembalian' : 'serah terima'}</h2><p className="co-muted co-section-note">Bukti pemeriksaan dicatat oleh vendor dan dapat Anda lihat di sini.</p><LoadState resource={resource}>{data && <>
    <p className="co-section-note">{(type === 'pengembalian' ? data.returnComplete : data.handoverComplete) ? 'Bukti pemeriksaan lengkap.' : 'Bukti pemeriksaan belum lengkap.'}</p>
    {evidence.length ? <div className="co-evidence-grid">{evidence.map(entry => <article key={entry.id}><div className="co-evidence-photo"><Photo key={entry.photoUrl} src={entry.available ? entry.photoUrl : null} name={`Bukti ${type.replace('_', ' ')}`} /></div><p>{data.items.find(item => item.itemId === entry.itemId)?.name || 'Alat pesanan'}</p><p className="co-muted">{date(entry.recordedAt, true)}{entry.examiner ? ` · ${entry.examiner}` : ''}</p><p className="co-note">{entry.note}</p></article>)}</div> : <p className="co-muted">Belum ada bukti untuk tahap ini.</p>}
  </>}</LoadState></section>;
}

function OrderDetail({ owner, reference, mode }) {
  const resource = useOrderResource(`/api/orders/${encodeURIComponent(reference)}`, owner);
  const data = resource.data;
  const order = data?.order;
  const [notice, setNotice] = useState('');
  return <div className="co-page"><Breadcrumb detail /><Link className="co-back" to="/pesanan"><ArrowLeft size={16} />Kembali ke pesanan</Link>
    <header className="co-heading"><div><p className="co-eyebrow">PENYEWAAN ANDA</p><h1>{mode === 'order-handover' ? 'Serah Terima Pesanan' : mode === 'order-return' ? 'Pengembalian & Ulasan' : 'Detail Pesanan'}</h1><p>{order ? `#${order.code}` : 'Rincian penyewaan Anda.'}</p></div>{order && <Status value={order.status} />}</header>
    <LoadState resource={resource}>{data && <>
      <nav className="co-tabs" aria-label="Bagian detail pesanan">{[['order-detail', '', 'Detail'], ['order-handover', '/serah-terima', 'Serah terima'], ['order-return', '/pengembalian', 'Pengembalian & ulasan']].map(([key, suffix, title]) => <Link key={key} to={`${detailPath(order)}${suffix}`} aria-current={mode === key ? 'page' : undefined}>{title}</Link>)}</nav>
      <p className="co-notice" role="status">{notice}</p>
      <div className="co-detail-layout"><div className="co-detail-main">
        {mode !== 'order-detail' && <Evidence key={`${order.orderId}:${mode}`} owner={owner} orderId={order.orderId} mode={mode} />}
        <section className="co-card"><h2>Rincian penyewaan</h2><dl className="co-details"><div><dt>Vendor</dt><dd>{order.vendorName}{order.vendorCity ? ` · ${order.vendorCity}` : ''}</dd></div><div><dt>Tanggal sewa</dt><dd>{date(order.startDate)} – {date(order.endDate)}</dd></div><div><dt>Lokasi acara</dt><dd>{order.location || 'Belum diisi'}</dd></div><div><dt>Dipesan pada</dt><dd>{date(order.orderedAt, true)}</dd></div></dl>
          <div className="co-items">{data.items.map(item => <article key={item.itemId}><div className="co-item-photo"><Photo key={item.photoUrl} src={item.photoUrl} name={item.name} /></div><div><p className="co-muted">{item.category}</p><h3>{item.name}</h3><p>{item.quantity} unit · {money(item.price)} /hari</p><p>Subtotal {money(item.subtotal)}</p></div></article>)}</div>
        </section>
        <section className="co-card"><h2>Riwayat pembayaran</h2>{data.payments.length ? <ul className="co-records">{data.payments.map(payment => <li key={payment.id}><div><strong>{label(payment.type)} · {label(payment.method)}</strong><p>{date(payment.paidAt || payment.createdAt, true)}</p></div><div><strong>{money(payment.amount)}</strong><p>{label(payment.status)}</p></div></li>)}</ul> : <p className="co-section-note co-muted">Belum ada pembayaran yang tercatat.</p>}</section>
        <section className="co-card"><h2>Riwayat status pesanan</h2>{data.history.length ? <ol className="co-history">{data.history.map(entry => <li key={entry.id}><strong>{label(entry.to)}</strong><time>{date(entry.at, true)}</time>{entry.note && <p className="co-note">{entry.note}</p>}</li>)}</ol> : <p className="co-section-note co-muted">Belum ada perubahan status yang tercatat.</p>}</section>
        {data.claims.length > 0 && <section className="co-card"><h2>Klaim</h2><ul className="co-records">{data.claims.map(claim => <li key={claim.id}><div><strong>KLM-{claim.id} · {label(claim.status)}</strong><p className="co-note">{claim.reason}</p><p>{date(claim.filedAt, true)}</p></div></li>)}</ul></section>}
        {data.refunds.length > 0 && <section className="co-card"><h2>Pengembalian dana</h2><ul className="co-records">{data.refunds.map(refund => <li key={refund.id}><div><strong>{money(refund.amount)} · {label(refund.status)}</strong><p className="co-note">{refund.reason}</p><p>{date(refund.refundedAt || refund.requestedAt, true)}</p></div></li>)}</ul></section>}
        {data.review ? <section className="co-card"><h2>Ulasan Anda</h2><p className="co-review-rating"><Star size={18} />{data.review.rating} / 5</p>{data.review.comment && <p className="co-note">{data.review.comment}</p>}<p className="co-muted">{date(data.review.at, true)}</p></section> : order.canReview && <section className="co-card"><ReviewForm owner={owner} order={order} onSaved={saved => { resource.accept(saved); setNotice('Ulasan berhasil disimpan.'); }} /></section>}
      </div><aside className="co-card co-payment-summary"><h2>Ringkasan biaya</h2><dl className="co-details"><div><dt>Total sewa</dt><dd>{money(order.totalRental)}</dd></div><div><dt>Deposit yang ditagihkan</dt><dd>{money(order.totalDp)}</dd></div><div><dt>Pembayaran terverifikasi</dt><dd>{money(order.paid)}</dd></div></dl><PayLink order={order} />
        {data.vendorPhone && <a className="co-secondary" href={`tel:${data.vendorPhone.replace(/[^+0-9]/g, '')}`}>Hubungi vendor</a>}
        {order.status === 'menunggu_konfirmasi' && <p className="co-muted">Menunggu konfirmasi pesanan oleh vendor.</p>}
      </aside></div>
    </>}</LoadState>
  </div>;
}

export default function LiveOrders({ mode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const owner = String(user.user_id);
  let reference;
  try { reference = decodeURIComponent(pathname.split('/')[2] || ''); } catch { reference = ''; }
  return mode === 'orders' ? <OrdersList key={owner} owner={owner} /> : <OrderDetail key={`${owner}:${reference}:${mode}`} owner={owner} reference={reference} mode={mode} />;
}
