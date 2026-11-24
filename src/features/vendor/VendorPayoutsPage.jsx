import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, Landmark, RefreshCw, Search, Wallet } from 'lucide-react';
import { EmptyState, Modal, PageHeading, Pagination, Status } from './VendorUi';
import { money } from './vendorData';
import { formatOrderDateTime } from './vendorOrdersApi';
import { listVendorPayouts, payoutLabels, requestVendorPayout } from './vendorPayoutsApi';
import './vendor-orders.css';

const accountText = payout => payout.bank ? `${payout.bank} ${payout.account}` : '—';

function RequestModal({ listing, onClose, onDone }) {
  const { account, available } = listing;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const run = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { onDone(await requestVendorPayout()); }
    catch (reason) { setError(reason.message); pending.current = false; setBusy(false); }
  };
  if (!account.account) return <Modal title="Tautkan rekening dulu" onClose={onClose} narrow>
    <p className="v-modal-copy">Anda belum punya rekening tujuan pencairan. Isi rekening di Profil bisnis, lalu kembali ke sini untuk mencairkan dana.</p>
    <div className="v-modal-actions"><button type="button" className="v-button v-button-secondary" onClick={onClose}>Nanti</button><Link className="v-button v-button-primary" to="/vendor/profil-bisnis#rekening-pencairan">Isi rekening</Link></div>
  </Modal>;
  return <Modal title="Cairkan dana" onClose={onClose} narrow>
    <dl className="vendor-orders-details">
      <div><dt>Total sewa</dt><dd>{money(available.gross)}</dd></div>
      <div><dt>Jumlah pesanan</dt><dd>{available.orders} pesanan selesai</dd></div>
      <div><dt>Biaya platform ({available.feePercent}%)</dt><dd>− {money(available.fee)}</dd></div>
      <div><dt>Potongan klaim disetujui</dt><dd>− {money(available.claimDeduction)}</dd></div>
      <div className="vendor-orders-detail-wide"><dt>Dana yang Anda terima</dt><dd><strong>{money(available.amount)}</strong></dd></div>
      <div className="vendor-orders-detail-wide"><dt>Rekening tujuan</dt><dd>{account.account.bank} {account.account.masked} · {account.account.owner}</dd></div>
    </dl>
    <p className="v-modal-copy">Biaya platform dipotong dari tiap pesanan. Satu permintaan dibuat untuk setiap pesanan, lalu diproses oleh admin. Rekening tujuan dicatat saat ini dan tidak berubah meski Anda mengganti rekening nanti.</p>
    {error && <p role="alert" className="v-field-error">{error}</p>}
    <div className="v-modal-actions"><button type="button" className="v-button v-button-secondary" disabled={busy} onClick={onClose}>Batal</button><button type="button" className="v-button v-button-primary" disabled={busy} onClick={run}>{busy ? 'Memproses…' : `Cairkan ${money(available.amount)}`}</button></div>
  </Modal>;
}

function DetailModal({ payout, onClose }) {
  return <Modal title={`Detail pencairan ${payout.id}`} onClose={onClose}>
    <dl className="vendor-orders-details">
      <div><dt>Status</dt><dd><Status>{payoutLabels[payout.status]}</Status></dd></div>
      <div><dt>Total sewa</dt><dd>{money(payout.gross)}</dd></div>
      <div><dt>Biaya platform ({payout.feePercent}%)</dt><dd>− {money(payout.fee)}</dd></div>
      <div><dt>Potongan klaim</dt><dd>− {money(payout.claimDeduction)}</dd></div>
      <div><dt>Dana diterima</dt><dd><strong>{money(payout.amount)}</strong></dd></div>
      <div><dt>No. pesanan</dt><dd>{payout.order}</dd></div>
      <div><dt>Diajukan</dt><dd>{formatOrderDateTime(payout.requestedAt)}</dd></div>
      <div><dt>Rekening tujuan</dt><dd>{accountText(payout)}</dd></div>
      <div><dt>Nama pemilik</dt><dd>{payout.owner || '—'}</dd></div>
      <div><dt>Dicairkan</dt><dd>{payout.paidAt ? formatOrderDateTime(payout.paidAt) : '—'}</dd></div>
      <div><dt>Referensi transfer</dt><dd>{payout.reference || '—'}</dd></div>
    </dl>
  </Modal>;
}

export default function VendorPayoutsPage({ segments, onLoaded, notify }) {
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [requesting, setRequesting] = useState(false);
  const [viewing, setViewing] = useState(null);
  const routeId = segments[1]?.replace(/^PCR-/i, '');

  useEffect(() => {
    const lifecycle = new AbortController();
    listVendorPayouts().then(value => { if (!lifecycle.signal.aborted) { setListing(value); setError(''); onLoaded(value.items); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setError(reason.message); });
    return () => lifecycle.abort();
  }, [refresh, onLoaded]);

  const items = listing?.items || [];
  const keyword = search.trim().toLowerCase();
  const filtered = items.filter(item => (!status || item.status === status) && (!keyword || [item.id, item.order, item.bank, item.owner].some(value => (value || '').toLowerCase().includes(keyword))));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const shown = filtered.slice((current - 1) * size, current * size);
  const sum = statuses => items.filter(item => statuses.includes(item.status)).reduce((total, item) => total + item.amount, 0);
  const target = viewing ? items.find(item => item.id === viewing) : routeId ? items.find(item => item.id === `PCR-${routeId}`) : null;

  if (segments[1] && (!/^[0-9]+$/.test(routeId) || segments[2])) return <Navigate to="/vendor/pencairan" replace />;
  if (routeId && listing && !viewing && !target) return <Navigate to="/vendor/pencairan" replace />;
  const closeDetail = () => { setViewing(null); if (routeId) navigate('/vendor/pencairan', { replace: true }); };
  const noAccount = listing && listing.account.business && !listing.account.account;

  return <div className="vendor-orders">
    <PageHeading eyebrow="PORTAL VENDOR" title="Pencairan" description="Cairkan dana hasil pesanan yang sudah selesai ke rekening Anda dan pantau prosesnya.">
      <button type="button" className="v-button v-button-primary" disabled={!listing || (listing.available.amount === 0 && Boolean(listing.account.account))} onClick={() => setRequesting(true)}><Wallet size={17} />Cairkan dana</button>
    </PageHeading>
    {listing && !listing.account.account && <section className="v-card v-settings-form" role="status" style={{ marginBottom: 24 }}>
      <div className="v-section-heading"><div className="v-heading-icon"><Landmark size={20} /></div><div><h2>Tautkan rekening terlebih dahulu</h2><p>{noAccount ? 'Anda belum punya rekening tujuan pencairan.' : 'Simpan profil bisnis dan rekening tujuan pencairan Anda.'}</p></div></div>
      <div className="v-form-actions"><Link className="v-button v-button-primary" to="/vendor/profil-bisnis#rekening-pencairan">Isi rekening di Profil bisnis</Link></div>
    </section>}
    {listing && <div className="v-inline-stats">
      <div><span>Dana siap dicairkan (setelah biaya)</span><strong>{money(listing.available.amount)}</strong></div>
      <div><span>Dalam proses</span><strong>{money(sum(['menunggu', 'diproses']))}</strong></div>
      <div><span>Sudah dicairkan</span><strong>{money(sum(['berhasil']))}</strong></div>
    </div>}
    <section className="v-card v-records-card">
      <div className="vendor-orders-toolbar">
        <label><Search size={17} /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={120} placeholder="Cari nomor pencairan, pesanan, atau bank…" aria-label="Cari pencairan" /></label>
        <div className="v-table-filters"><select aria-label="Filter status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{Object.entries(payoutLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        <button type="button" className="v-button v-button-secondary" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button>
      </div>
      {error ? <p className="vendor-orders-error vendor-orders-list-error" role="alert">{error}</p>
        : !listing ? <p role="status" className="vendor-orders-loading">Memuat pencairan…</p>
          : !shown.length ? <EmptyState title={items.length ? 'Tidak ada hasil yang cocok' : 'Belum ada pencairan'} description={items.length ? 'Coba kata kunci lain atau ubah filter status.' : 'Pencairan yang Anda ajukan lewat tombol Cairkan dana akan muncul di sini.'} />
            : <div className="v-table-scroll" tabIndex={0} role="region" aria-label="Tabel Pencairan"><table className="v-table"><caption className="v-sr-only">Daftar pencairan dana vendor</caption>
              <thead><tr><th scope="col">No. pencairan</th><th scope="col">Pesanan</th><th scope="col">Diajukan</th><th scope="col">Rekening</th><th scope="col">Dana diterima</th><th scope="col">Status</th><th scope="col" className="v-actions-cell">Operasi</th></tr></thead>
              <tbody>{shown.map(item => <tr key={item.id}>
                <td><span className="v-record-id">{item.id}</span></td><td>{item.order}</td>
                <td>{formatOrderDateTime(item.requestedAt)}</td><td>{accountText(item)}</td>
                <td className="v-number">{money(item.amount)}</td><td><Status>{payoutLabels[item.status]}</Status></td>
                <td><div className="v-row-actions"><button type="button" className="v-icon-button" aria-label={`Lihat pencairan ${item.id}`} title="Lihat detail" onClick={() => setViewing(item.id)}><Eye size={16} /></button></div></td>
              </tr>)}</tbody></table></div>}
      {listing && !error && <Pagination count={filtered.length} page={current} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} />}
    </section>
    {requesting && listing && <RequestModal listing={listing} onClose={() => setRequesting(false)} onDone={result => { setRequesting(false); notify(`Pencairan ${money(result.amount)} untuk ${result.orders} pesanan diajukan.`); setRefresh(value => value + 1); }} />}
    {target && <DetailModal key={target.id} payout={target} onClose={closeDetail} />}
  </div>;
}
