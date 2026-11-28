import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Camera, ExternalLink, RefreshCw, Search, Trash2 } from 'lucide-react';
import { apiUrl } from '../../api';
import { BackLink, EmptyState, Modal, PageHeading, Pagination } from './VendorUi';
import { formatOrderDate, formatOrderDateTime, orderStatusLabels } from './vendorOrdersApi';
import { money } from './vendorData';
import { OrderStatusBadge } from './OrderProcessModal';
import { actOnHandover, deleteHandoverEvidence, getVendorHandover, listVendorHandovers, reportDamage, uploadHandoverEvidence } from './vendorHandoversApi';
import './vendor-orders.css';
import './vendor-handovers.css';

const filters = ['semua', 'dikonfirmasi', 'berjalan', 'dikembalikan', 'selesai'];
const phaseLabels = { serah_terima: 'Penyerahan alat', pengembalian: 'Pengembalian alat' };
const editable = (type, status) => type === 'serah_terima' ? status === 'dikonfirmasi' : ['berjalan', 'dikembalikan'].includes(status);

function EvidenceItem({ item, type, detail, busy, onUpload, onDelete }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const field = useRef(null);
  const entries = detail.evidence.filter(row => row.itemId === item.itemId && row.type === type);
  const canEdit = editable(type, detail.order.status) && !(type === 'serah_terima' && detail.order.awaitingSettlement);
  const submit = async event => {
    event.preventDefault();
    if (!note.trim() || !file) { setError('Isi catatan kondisi dan pilih foto terlebih dahulu.'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Gunakan JPG atau PNG maksimal 5 MB.'); return;
    }
    setError('');
    if (await onUpload({ itemId: item.itemId, type, note: note.trim() }, file)) {
      setFile(null); if (field.current) field.current.value = '';
    }
  };
  return <article className="vh-item">
    <div className="vh-item-heading"><div><h3>{item.name}</h3><p>{item.quantity} unit · {entries.filter(row => row.available).length}/{detail.photosPerItem} foto tersedia</p></div><Camera size={21} /></div>
    {entries.length > 0 && <div className="vh-evidence-grid">{entries.map((row, index) => <figure key={row.id}>
      {row.available ? <a href={apiUrl(row.photoUrl)} target="_blank" rel="noreferrer" aria-label={`Buka foto ${index + 1} ${item.name}`}><img src={apiUrl(row.photoUrl)} alt={`Bukti ${phaseLabels[type].toLowerCase()} ${item.name}, foto ${index + 1}`} loading="lazy" /></a> : <div className="vh-missing">File bukti tidak tersedia</div>}
      <figcaption><strong>Foto {index + 1}</strong><p>{row.note}</p><small>{row.examiner || 'Pemeriksa'} · {formatOrderDateTime(row.recordedAt)}</small>
        {canEdit && !detail.evidenceProtected && <button className="v-text-danger" type="button" disabled={busy} onClick={() => onDelete(row)}><Trash2 size={14} />Hapus foto draft</button>}
      </figcaption>
    </figure>)}</div>}
    {canEdit && entries.length < detail.photosPerItem && <form className="vh-upload" onSubmit={submit}>
      <label className="v-field"><span>Catatan kondisi {item.quantity} unit</span><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={2} required disabled={busy} placeholder="Catat jumlah, kelengkapan, fungsi, dan kerusakan yang terlihat…" /></label>
      <label className="v-field"><span>Foto sudut {entries.length + 1} dari {detail.photosPerItem}</span><input ref={field} type="file" accept="image/jpeg,image/png" required disabled={busy} onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      {error && <p className="v-field-error" role="alert">{error}</p>}
      <button className="v-button v-button-secondary" type="submit" disabled={busy}>{busy ? 'Memproses…' : 'Unggah bukti'}</button>
    </form>}
    {!canEdit && !entries.length && <p className="vh-muted">Belum ada bukti tercatat untuk tahap ini.</p>}
  </article>;
}

function HandoverDetail({ orderId, notify, onChanged }) {
  const [state, setState] = useState({ detail: null, error: '' });
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [damage, setDamage] = useState('');
  const pending = useRef(false);
  const lifetime = useRef(null);
  useEffect(() => {
    const life = new AbortController(); lifetime.current = life;
    getVendorHandover(orderId).then(detail => {
      if (!life.signal.aborted) setState({ detail, error: '' });
    }).catch(error => { if (!life.signal.aborted) setState(current => ({ ...current, error: error.message })); });
    return () => life.abort();
  }, [orderId, refresh]);
  const run = async (send, message) => {
    if (pending.current) return false;
    const life = lifetime.current;
    pending.current = true; setBusy(true); setState(current => ({ ...current, error: '' }));
    try {
      const detail = await send();
      if (life.signal.aborted) return false;
      setState({ detail, error: '' }); setConfirmed(false); setDeleting(null);
      onChanged(); notify(message); return true;
    } catch (error) {
      if (!life.signal.aborted) setState(current => ({ ...current, error: error.message }));
      return false;
    } finally {
      pending.current = false; if (!life.signal.aborted) setBusy(false);
    }
  };
  const { detail, error } = state;
  const order = detail?.order;
  const view = order?.status === 'dikonfirmasi' ? 'serah_terima' : 'pengembalian';
  const evidence = type => detail.items.map(item => <EvidenceItem key={`${item.itemId}:${type}`} item={item} type={type} detail={detail} busy={busy}
    onUpload={(input, photo) => run(() => uploadHandoverEvidence(orderId, { ...input, expectedStatus: order.status }, photo), 'Bukti kondisi tersimpan.')}
    onDelete={setDeleting} />);
  const next = order && !order.awaitingSettlement && !order.reportOpen && ({ dikonfirmasi: ['handover', 'Konfirmasi penyerahan & mulai sewa', detail.handoverComplete], berjalan: ['receive', 'Konfirmasi alat telah kembali', detail.returnComplete], dikembalikan: ['complete', 'Selesaikan pemeriksaan & pesanan', detail.returnComplete && !order.hasOpenClaim] })[order.status];
  return <>
    <BackLink to="/vendor/serah-terima">Kembali ke serah terima</BackLink>
    <PageHeading title={order ? `Serah terima ${order.code}` : 'Detail serah terima'} description="Dokumentasikan kondisi setiap alat sebelum dan sesudah masa sewa.">
      <button className="v-button v-button-secondary" type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button>
    </PageHeading>
    {error && <p className="vendor-orders-error" role="alert">{error}</p>}
    {!detail && !error && <p role="status">Memuat serah terima…</p>}
    {detail && <>
      <section className="v-card vh-summary"><OrderStatusBadge status={order.status} awaiting={order.awaitingSettlement} /><dl><div><dt>Pelanggan</dt><dd>{order.customer}</dd></div><div><dt>Periode sewa</dt><dd>{formatOrderDate(order.start)} – {formatOrderDate(order.end)}</dd></div><div><dt>Lokasi</dt><dd>{order.venue || 'Belum diisi'}</dd></div></dl><Link to={`/vendor/pesanan/${order.orderId}`} className="v-text-button">Lihat pesanan <ExternalLink size={14} /></Link></section>
      <section className="v-card vh-phase"><h2>{phaseLabels[view]}</h2><p className="vh-muted">Ambil 4 foto berbeda untuk setiap jenis alat: tampak keseluruhan, sisi lain, kelengkapan, serta fungsi atau kondisi detail. JPG/PNG maksimal 5 MB dan 12 megapiksel. Bukti penyerahan dikunci saat sewa dimulai; bukti pengembalian dikunci saat pesanan selesai.</p>
        {detail.evidenceProtected && <p className="vendor-orders-hint">Pesanan memiliki riwayat klaim. Foto yang sudah tersimpan dilindungi dan tidak dapat dihapus.</p>}
        {order.awaitingSettlement && <p className="vendor-orders-hint" role="status">Menunggu pelunasan dari pelanggan. Serah terima terbuka setelah biaya sewa dibayar penuh.</p>}
        {order.reportOpen && <p className="vendor-orders-hint" role="status">Pelanggan melaporkan pesanan ini, jadi pesanan tidak dapat diproses dulu. <Link to="/vendor/klaim">Buka klaim untuk menanggapi</Link></p>}
        {!detail.items.length && <EmptyState title="Pesanan belum memiliki item" description="Pesanan tanpa item belum dapat diproses untuk serah terima." />}
        {evidence(view)}
      </section>
      {view === 'pengembalian' && detail.items.length > 0 && <details className="v-card vh-phase vh-earlier"><summary>Lihat bukti penyerahan alat</summary>{evidence('serah_terima')}</details>}
      {order.status === 'dikembalikan' && Number(detail.deposit) > 0 && !detail.claimStatus && <section className="v-card vh-confirm"><h2>Ada kerusakan atau masalah?</h2>
        <p className="vh-muted">Laporan dikirim ke admin. Bila disetujui, deposit jaminan {money(detail.deposit)} menjadi milik Anda. Bila tidak ada laporan, deposit dikembalikan ke pelanggan saat pesanan selesai.</p>
        <form onSubmit={event => { event.preventDefault(); if (damage.trim()) run(() => reportDamage(orderId, damage.trim()), 'Laporan kerusakan dikirim ke admin.'); }}>
          <label className="v-field"><span>Jelaskan kerusakan</span><textarea value={damage} onChange={event => setDamage(event.target.value)} maxLength={1000} rows={3} required disabled={busy} /></label>
          <button className="v-button v-button-secondary" type="submit" disabled={busy || !damage.trim()}>Laporkan kerusakan</button>
        </form>
      </section>}
      {detail.claimStatus && <p className="vendor-orders-hint" role="status">{detail.claimStatus === 'disetujui' ? `Laporan kerusakan disetujui admin. Deposit ${money(detail.deposit)} masuk pencairan Anda setelah pesanan selesai.`
        : ['ditolak', 'selesai'].includes(detail.claimStatus) ? 'Laporan klaim sudah ditutup.' : 'Laporan kerusakan menunggu keputusan admin.'} <Link to="/vendor/klaim">Buka klaim</Link></p>}
      {next && <section className="v-card vh-confirm"><h2>Tindak lanjut</h2>
        {order.hasOpenClaim && <p className="vendor-orders-hint">Pesanan memiliki klaim aktif. Penyelesaian menunggu keputusan admin. <Link to="/vendor/klaim">Buka klaim</Link></p>}
        {!next[2] && <p className="vh-muted">Lengkapi bukti kondisi semua alat dan pastikan tidak ada klaim aktif yang menghalangi penyelesaian.</p>}
        <label className="v-field"><span>Catatan serah terima (opsional)</span><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={2} disabled={busy} /></label>
        <label className="vh-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy} /><span>Saya telah memeriksa jumlah, kelengkapan, fungsi, dan kondisi alat bersama pihak terkait.</span></label>
        <button className="v-button v-button-primary" type="button" disabled={busy || !confirmed || !next[2]} onClick={() => run(() => actOnHandover(orderId, { action: next[0], expectedStatus: order.status, confirmed, note }), 'Status pesanan dan riwayat pemeriksaan diperbarui.')}>{busy ? 'Memproses…' : next[1]}</button>
      </section>}
      <section className="v-card vh-history"><h2>Riwayat pesanan</h2>{detail.history.length ? <ol>{detail.history.map(entry => <li key={entry.riwayat_id}><strong>{orderStatusLabels[entry.status_baru] || entry.status_baru}</strong><small>{entry.diubah_oleh || 'Sistem'} · {formatOrderDateTime(entry.diubah_pada)}</small>{entry.catatan && <p>{entry.catatan}</p>}</li>)}</ol> : <p className="vh-muted">Belum ada riwayat status.</p>}</section>
    </>}
    {deleting && <Modal title="Hapus foto draft?" onClose={() => { if (!busy) setDeleting(null); }} narrow><p>Foto draft ini akan dihapus. Unggah penggantinya sebelum mengonfirmasi pemeriksaan.</p><div className="v-modal-actions"><button className="v-button v-button-secondary" type="button" disabled={busy} onClick={() => setDeleting(null)}>Batal</button><button className="v-button v-button-danger" type="button" disabled={busy} onClick={() => run(() => deleteHandoverEvidence(orderId, deleting.id, order.status), 'Foto draft dihapus.')}>Hapus foto</button></div></Modal>}
  </>;
}

function HandoverList({ onLoaded }) {
  const [status, setStatus] = useState('semua');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({ listing: null, error: '', key: null });
  const requestKey = JSON.stringify([status, search, page, size, refresh]);
  useEffect(() => { const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    const life = new AbortController();
    listVendorHandovers({ status, q: search, page, size }).then(listing => {
      if (!life.signal.aborted) {
        const lastPage = Math.max(1, Math.ceil(listing.total / size));
        if (page > lastPage) { setPage(lastPage); return; }
        setState({ listing, key: requestKey, error: '' }); onLoaded(listing);
      }
    }).catch(error => { if (!life.signal.aborted) setState({ listing: null, error: error.message, key: requestKey }); });
    return () => life.abort();
  }, [status, search, page, size, refresh, onLoaded, requestKey]);
  const loading = state.key !== requestKey;
  const listing = loading ? null : state.listing;
  const error = loading ? '' : state.error;
  return <>
    <PageHeading eyebrow="PORTAL VENDOR" title="Serah terima" description="Penyerahan, pengembalian, dan pemeriksaan alat dari pesanan Anda yang telah dikonfirmasi." />
    <section className="v-card v-records-card">
      <div className="vendor-orders-toolbar vh-toolbar"><label><Search size={17} /><input type="search" maxLength={120} placeholder="Cari pesanan, pelanggan, atau alat…" aria-label="Cari serah terima" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <select aria-label="Filter status pesanan" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>{filters.map(value => <option key={value} value={value}>{value === 'semua' ? 'Semua tahap' : orderStatusLabels[value]}</option>)}</select>
        <button className="v-button v-button-secondary" type="button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button>
      </div>
      {error ? <p className="vendor-orders-error" role="alert">{error}</p> : loading ? <p className="vendor-orders-loading" role="status">Memuat serah terima…</p> : !listing?.items.length ? <EmptyState title="Belum ada serah terima" description="Pesanan yang telah dikonfirmasi akan muncul otomatis. Anda tidak perlu membuat catatan pesanan secara manual." /> : <div className="v-table-scroll" role="region" aria-label="Daftar serah terima" tabIndex={0}><table className="v-table"><thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Jadwal sewa</th><th>Status</th><th>Bukti awal / akhir</th><th>Aksi</th></tr></thead><tbody>{listing.items.map(order => <tr key={order.orderId}>
        <td><Link className="v-record-id" to={`/vendor/serah-terima/${order.orderId}`}>{order.code}</Link></td><td>{order.customer}</td><td>{formatOrderDate(order.start)} – {formatOrderDate(order.end)}</td><td><OrderStatusBadge status={order.status} awaiting={order.awaitingSettlement} /></td><td>{order.handoverPhotos} / {order.returnPhotos}<small className="vendor-orders-subtext">{order.itemsCount} jenis alat · 4 foto / jenis / tahap</small></td><td><Link className="v-button v-button-secondary" to={`/vendor/serah-terima/${order.orderId}`}>Buka pemeriksaan</Link></td>
      </tr>)}</tbody></table></div>}
      {!loading && !error && listing && <Pagination count={listing.total} page={page} size={size} onPage={setPage} onSize={value => { setSize(value); setPage(1); }} />}
    </section>
  </>;
}

export default function VendorHandoversPage({ segments, onLoaded, notify }) {
  const [version, setVersion] = useState(0);
  const onChanged = useCallback(() => setVersion(value => value + 1), []);
  if (segments[1] && (!/^[1-9]\d*$/.test(segments[1]) || segments[2])) return <Navigate to="/vendor/serah-terima" replace />;
  return <div className="vh-page">{segments[1] ? <HandoverDetail key={segments[1]} orderId={segments[1]} notify={notify} onChanged={onChanged} /> : <HandoverList key={version} onLoaded={onLoaded} />}</div>;
}
