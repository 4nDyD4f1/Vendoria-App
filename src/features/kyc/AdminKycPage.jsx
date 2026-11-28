import { useEffect, useState } from 'react';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EmptyState, PageHeading, Pagination } from '../vendor/VendorUi';
import SlidingTabs from '../interface/SlidingTabs';
import { kycStatus, listKyc } from './kycApi';
import KycReviewModal from './KycReviewModal';
import './kyc.css';
import './admin-kyc.css';
import Skeleton from '../../components/Skeleton';

const filters = [['menunggu', 'Menunggu'], ['terverifikasi', 'Terverifikasi'], ['ditolak', 'Ditolak'], ['semua', 'Semua']];

export default function AdminKycPage({ segments, onLoaded }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('menunggu');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [loaded, setLoaded] = useState({ key: null, result: null, error: '' });
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null);
  const requestKey = JSON.stringify([status, query, page, size, refresh]);
  const result = loaded.result;
  const loading = loaded.key !== requestKey;
  const error = loading ? '' : loaded.error;
  const routeId = segments[1]?.replace(/^KYC-/i, '');
  const id = selected || (/^[0-9]+$/.test(routeId || '') ? routeId : null);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const lifecycle = new AbortController();
    listKyc({ status, q: query, page, size }).then(value => {
      if (lifecycle.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(value.total / size));
      if (page > lastPage) { setPage(lastPage); return; }
      setLoaded({ key: requestKey, result: value, error: '' }); onLoaded(value);
    }).catch(reason => { if (!lifecycle.signal.aborted) setLoaded({ key: requestKey, result: null, error: reason.message }); });
    return () => { lifecycle.abort(); };
  }, [status, query, page, size, refresh, onLoaded, requestKey]);

  if (segments[1] && (!/^[0-9]+$/.test(routeId) || segments[2])) return <Navigate to="/admin/kyc" replace />;
  const close = () => { setSelected(null); if (routeId) navigate('/admin/kyc', { replace: true }); };
  const tabs = filters.map(([key, label]) => ({ key: `admin-kyc-${key}`, label: `${label}${result ? ` (${result.counts[key] || 0})` : ''}` }));

  return <div className="admin-kyc">
    <PageHeading eyebrow="PEMERIKSAAN IDENTITAS" title="Verifikasi KYC" description="Tinjau dokumen customer dan vendor, lalu berikan keputusan verifikasi." />
    <SlidingTabs tabs={tabs} active={filters.findIndex(([key]) => key === status)} onSelect={index => { setStatus(filters[index][0]); setPage(1); setNotice(''); }} label="Filter status KYC" className="admin-kyc-status-tabs" />
    {notice && <p className="kyc-notice" role="status">{notice}</p>}
    <section className="v-card" id={`admin-kyc-${status}-panel`} role="tabpanel" aria-labelledby={`admin-kyc-${status}-tab`} tabIndex={0}>
      <div className="admin-kyc-toolbar"><label><Search size={17} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} maxLength={120} placeholder="Cari nama, email, atau nomor pengajuan" aria-label="Cari pengajuan KYC" /></label><button type="button" className="v-button v-button-secondary" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button></div>
      {error ? <p className="kyc-error admin-kyc-list-error" role="alert">{error}</p> : loading ? <Skeleton variant="list" label="Memuat pengajuan KYC…" /> : !result?.items.length ? <EmptyState title="Belum ada pengajuan" description={query ? 'Tidak ada pengajuan yang cocok dengan pencarian.' : 'Pengajuan dengan status ini akan muncul di sini.'} /> : <div className="v-table-scroll"><table className="v-table"><thead><tr><th>No. Pengajuan</th><th>Nama Pemohon</th><th>Jenis Akun</th><th>Tanggal Pengajuan</th><th>Status</th><th>Operasi</th></tr></thead><tbody>{result.items.map(record => <tr key={record.kyc_id}><td>KYC-{record.kyc_id}</td><td><strong>{record.nama}</strong><small className="admin-kyc-email">{record.email}</small></td><td>{record.role === 'vendor' ? 'Vendor' : 'Customer'}</td><td>{new Date(record.diajukan_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><span className={`kyc-status kyc-status-${record.status}`}>{kycStatus[record.status]}</span></td><td><button type="button" className="v-button v-button-secondary" onClick={() => setSelected(String(record.kyc_id))} aria-label={`Lihat pengajuan KYC-${record.kyc_id}`}><Eye size={15} />Lihat</button></td></tr>)}</tbody></table></div>}
      {!loading && !error && <Pagination count={result?.total || 0} page={page} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} />}
    </section>
    {id && <KycReviewModal key={id} id={id} onClose={close} onDecided={nextStatus => { close(); setNotice(nextStatus === 'terverifikasi' ? 'Pengajuan disetujui. Status akun sudah diperbarui.' : 'Pengajuan ditolak. Catatan tersedia untuk pemohon.'); setRefresh(value => value + 1); }} />}
  </div>;
}
