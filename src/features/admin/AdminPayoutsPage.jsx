import { useEffect, useRef, useState } from 'react';
import { Check, Download, Eye, RefreshCw, Search, X } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EmptyState, Modal, PageHeading, Pagination, Status } from '../vendor/VendorUi';
import { money } from '../vendor/vendorData';
import { downloadCsv } from './downloadCsv';
import AdminRefunds from './AdminRefunds';
import { decidePayout, listPayouts, payoutStatusLabels } from './reportsApi';
import '../kyc/kyc.css';
import '../kyc/admin-kyc.css';
import Skeleton from '../../components/Skeleton';

const dateTime = value => value ? new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Langkah admin per status (label tampilan). 'berhasil' wajib referensi transfer bank.
const payoutActions = {
  Menunggu: [['dibatalkan', 'Batalkan', 'danger'], ['diproses', 'Mulai proses', 'primary']],
  Diproses: [['gagal', 'Tandai gagal', 'danger'], ['dibatalkan', 'Batalkan', 'secondary'], ['berhasil', 'Tandai berhasil', 'primary']],
};

function PayoutModal({ record, process, onClose, onDecided }) {
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const actions = process ? payoutActions[record.status] || [] : [];
  const decide = async status => {
    if (pending.current) return;
    if (status === 'berhasil' && !reference.trim()) { setError('Referensi transfer wajib diisi untuk menandai berhasil.'); return; }
    pending.current = true; setBusy(true); setError('');
    try { onDecided(await decidePayout(record.id, status, status === 'berhasil' ? reference.trim() : undefined), status); }
    catch (reason) { setError(reason.message); pending.current = false; setBusy(false); }
  };
  return <Modal title={`${actions.length ? 'Proses' : 'Detail'} pencairan ${record.id}`} onClose={onClose}>
    <div className="kyc-review-summary"><Status>{record.status}</Status></div>
    <dl className="kyc-details">
      <div><dt>Vendor</dt><dd>{record.vendor}</dd></div><div><dt>No. pesanan</dt><dd>{record.order}</dd></div>
      <div><dt>Total sewa</dt><dd>{money(record.gross)}</dd></div><div><dt>Biaya platform ({record.feePercent}%)</dt><dd>− {money(record.fee)}</dd></div>
      <div><dt>Potongan klaim</dt><dd>− {money(record.claimDeduction)}</dd></div><div><dt>Deposit jaminan (kerusakan)</dt><dd>+ {money(record.deposit || 0)}</dd></div><div><dt>Dana ditransfer</dt><dd><strong>{money(record.amount)}</strong></dd></div>
      <div className="kyc-full-field"><dt>Referensi transfer</dt><dd>{record.reference || '—'}</dd></div>
      <div><dt>Bank tujuan</dt><dd>{record.bank || '—'}</dd></div><div><dt>Nomor rekening</dt><dd>{record.account || '—'}</dd></div>
      <div className="kyc-full-field"><dt>Nama pemilik rekening</dt><dd>{record.owner || '—'}</dd></div>
      <div><dt>Tanggal pengajuan</dt><dd>{dateTime(record.requestedAt)}</dd></div><div><dt>Tanggal dicairkan</dt><dd>{dateTime(record.paidAt)}</dd></div>
      <div><dt>Diproses oleh</dt><dd>{record.processedBy || '—'}</dd></div>
    </dl>
    {actions.length > 0 && record.status === 'Diproses' && <label className="v-field kyc-review-note">Referensi transfer <small>(wajib untuk berhasil)</small><input value={reference} onChange={event => setReference(event.target.value)} maxLength={150} disabled={busy} placeholder="Nomor/bukti transfer bank" /></label>}
    {actions.length > 0 && <p className="v-modal-copy">Status hanya bisa maju dan tidak dapat dikembalikan. Transfer dana dilakukan di luar aplikasi ini.</p>}
    {error && <p role="alert" className="kyc-error">{error}</p>}
    {actions.length > 0 && <div className="v-modal-actions">{actions.map(([status, label, tone]) => <button key={status} type="button" className={`v-button v-button-${tone}`} disabled={busy} onClick={() => decide(status)}>{status === 'berhasil' ? <Check size={16} /> : status === 'diproses' ? null : <X size={16} />}{label}</button>)}</div>}
  </Modal>;
}

export default function AdminPayoutsPage({ segments, onLoaded }) {
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState('');
  const routeId = segments[1]?.replace(/^PCR-/i, '');

  useEffect(() => {
    const lifecycle = new AbortController();
    listPayouts().then(value => { if (!lifecycle.signal.aborted) { setPayouts(value); setError(''); onLoaded(value); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setError(reason.message); });
    return () => { lifecycle.abort(); };
  }, [refresh, onLoaded]);

  const keyword = search.trim().toLowerCase();
  const filtered = (payouts || []).filter(item => (!status || item.status === status) && (!keyword || [item.id, item.order, item.vendor, item.reference || ''].some(value => value.toLowerCase().includes(keyword))));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const shown = filtered.slice((current - 1) * size, current * size);
  const sum = labels => money(filtered.filter(item => labels.includes(item.status)).reduce((total, item) => total + item.amount, 0));
  const targetId = selected || (routeId ? `PCR-${routeId}` : null);
  const record = targetId && payouts?.find(item => item.id === targetId);

  if (segments[1] && (!/^[0-9]+$/.test(routeId) || segments[2])) return <Navigate to="/admin/laporan/pencairan" replace />;
  if (!selected && routeId && payouts && !record) return <Navigate to="/admin/laporan/pencairan" replace />;
  const close = () => { setSelected(null); setProcessing(false); if (routeId) navigate('/admin/laporan/pencairan', { replace: true }); };
  const exportCsv = () => downloadCsv('laporan-pencairan-vendoria.csv', [['No. pencairan', 'No. pesanan', 'Vendor', 'Dana ditransfer', 'Total sewa', 'Biaya platform', 'Potongan klaim', 'Deposit jaminan', 'Status', 'Referensi transfer', 'Tanggal pengajuan', 'Tanggal dicairkan', 'Diproses oleh'], ...filtered.map(item => [item.id, item.order, item.vendor, item.amount, item.gross, item.fee, item.claimDeduction, item.deposit, item.status, item.reference, item.requestedAt, item.paidAt, item.processedBy])]);

  return <div className="admin-kyc">
    <PageHeading title="Pencairan dana" description="Proses pencairan dana vendor dari pesanan yang selesai: mulai proses, catat referensi transfer, lalu tandai berhasil."><button className="v-button v-button-secondary" type="button" disabled={!filtered.length} onClick={exportCsv}><Download size={16} />Unduh CSV</button></PageHeading>
    {notice && <p className="kyc-notice" role="status">{notice}</p>}
    <div className="v-inline-stats"><div><span>Total pencairan selesai</span><strong>{sum(['Selesai'])}</strong></div><div><span>Dalam proses</span><strong>{sum(['Menunggu', 'Diproses'])}</strong></div><div><span>Jumlah vendor</span><strong>{new Set(filtered.map(item => item.vendor)).size} vendor</strong></div></div>
    <section className="v-card" aria-label="Daftar pencairan dana">
      <div className="admin-kyc-toolbar"><label><Search size={17} /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={120} placeholder="Cari nomor pencairan, pesanan, atau vendor" aria-label="Cari pencairan" /></label><div className="v-table-filters"><select aria-label="Filter status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{Object.values(payoutStatusLabels).map(label => <option key={label}>{label}</option>)}</select></div><button type="button" className="v-button v-button-secondary" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button></div>
      {error ? <p className="kyc-error admin-kyc-list-error" role="alert">{error}</p> : !payouts ? <Skeleton variant="list" label="Memuat pencairan…" /> : !shown.length ? <EmptyState title={payouts.length ? 'Tidak ada hasil yang cocok' : 'Belum ada pencairan'} description={payouts.length ? 'Coba kata kunci lain atau sesuaikan filter Anda.' : 'Pencairan dana vendor akan muncul di sini.'} /> : <div className="v-table-scroll"><table className="v-table"><thead><tr><th>No. Pencairan</th><th>Vendor</th><th>Pesanan</th><th>Tanggal</th><th>Dana ditransfer</th><th>Status</th><th>Operasi</th></tr></thead><tbody>{shown.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.vendor}</td><td>{item.order}</td><td>{dateTime(item.requestedAt)}</td><td className="v-number">{money(item.amount)}</td><td><Status>{item.status}</Status></td><td><div className="v-row-actions"><button type="button" className="v-icon-button" aria-label={`Lihat pencairan ${item.id}`} title="Lihat detail" onClick={() => { setProcessing(false); setSelected(item.id); }}><Eye size={16} /></button>{payoutActions[item.status] && <button type="button" className="v-text-button" onClick={() => { setProcessing(true); setSelected(item.id); }}>Proses</button>}</div></td></tr>)}</tbody></table></div>}
      {payouts && !error && <Pagination count={filtered.length} page={current} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} />}
    </section>
    <AdminRefunds />
    {record && <PayoutModal key={`${record.id}:${record.status}:${processing}`} record={record} process={processing} onClose={close} onDecided={(updated, status) => { close(); setNotice(`Pencairan ${updated.id} diubah menjadi ${updated.status}.`); setRefresh(value => value + 1); }} />}
  </div>;
}
