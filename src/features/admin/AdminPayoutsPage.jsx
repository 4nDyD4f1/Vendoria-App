import { useEffect, useState } from 'react';
import { Download, Eye, RefreshCw, Search } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EmptyState, Modal, PageHeading, Pagination, Status } from '../vendor/VendorUi';
import { money } from '../vendor/vendorData';
import { downloadCsv } from './downloadCsv';
import { listPayouts, payoutStatusLabels } from './reportsApi';
import '../kyc/kyc.css';
import '../kyc/admin-kyc.css';

const dateTime = value => value ? new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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
  const close = () => { setSelected(null); if (routeId) navigate('/admin/laporan/pencairan', { replace: true }); };
  const exportCsv = () => downloadCsv('laporan-pencairan-vendoria.csv', [['No. pencairan', 'No. pesanan', 'Vendor', 'Nominal', 'Status', 'Referensi transfer', 'Tanggal pengajuan', 'Tanggal dicairkan', 'Diproses oleh'], ...filtered.map(item => [item.id, item.order, item.vendor, item.amount, item.status, item.reference, item.requestedAt, item.paidAt, item.processedBy])]);

  return <div className="admin-kyc">
    <PageHeading title="Pencairan dana" description="Pantau pencairan dana vendor dari pesanan yang selesai."><button className="v-button v-button-secondary" type="button" disabled={!filtered.length} onClick={exportCsv}><Download size={16} />Unduh CSV</button></PageHeading>
    <div className="v-inline-stats"><div><span>Total pencairan selesai</span><strong>{sum(['Selesai'])}</strong></div><div><span>Dalam proses</span><strong>{sum(['Menunggu', 'Diproses'])}</strong></div><div><span>Jumlah vendor</span><strong>{new Set(filtered.map(item => item.vendor)).size} vendor</strong></div></div>
    <section className="v-card" aria-label="Daftar pencairan dana">
      <div className="admin-kyc-toolbar"><label><Search size={17} /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={120} placeholder="Cari nomor pencairan, pesanan, atau vendor" aria-label="Cari pencairan" /></label><div className="v-table-filters"><select aria-label="Filter status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{Object.values(payoutStatusLabels).map(label => <option key={label}>{label}</option>)}</select></div><button type="button" className="v-button v-button-secondary" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button></div>
      {error ? <p className="kyc-error admin-kyc-list-error" role="alert">{error}</p> : !payouts ? <p role="status" className="admin-kyc-loading">Memuat pencairan…</p> : !shown.length ? <EmptyState title={payouts.length ? 'Tidak ada hasil yang cocok' : 'Belum ada pencairan'} description={payouts.length ? 'Coba kata kunci lain atau sesuaikan filter Anda.' : 'Pencairan dana vendor akan muncul di sini.'} /> : <div className="v-table-scroll"><table className="v-table"><thead><tr><th>No. Pencairan</th><th>Vendor</th><th>Pesanan</th><th>Tanggal</th><th>Nominal</th><th>Status</th><th>Operasi</th></tr></thead><tbody>{shown.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.vendor}</td><td>{item.order}</td><td>{dateTime(item.requestedAt)}</td><td className="v-number">{money(item.amount)}</td><td><Status>{item.status}</Status></td><td><div className="v-row-actions"><button type="button" className="v-icon-button" aria-label={`Lihat pencairan ${item.id}`} title="Lihat detail" onClick={() => setSelected(item.id)}><Eye size={16} /></button></div></td></tr>)}</tbody></table></div>}
      {payouts && !error && <Pagination count={filtered.length} page={current} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} />}
    </section>
    {record && <Modal title={`Detail pencairan ${record.id}`} onClose={close}><div className="kyc-review-summary"><Status>{record.status}</Status></div><dl className="kyc-details"><div><dt>Vendor</dt><dd>{record.vendor}</dd></div><div><dt>No. pesanan</dt><dd>{record.order}</dd></div><div><dt>Nominal</dt><dd>{money(record.amount)}</dd></div><div><dt>Referensi transfer</dt><dd>{record.reference || '—'}</dd></div><div><dt>Tanggal pengajuan</dt><dd>{dateTime(record.requestedAt)}</dd></div><div><dt>Tanggal dicairkan</dt><dd>{dateTime(record.paidAt)}</dd></div><div><dt>Diproses oleh</dt><dd>{record.processedBy || '—'}</dd></div></dl></Modal>}
  </div>;
}
