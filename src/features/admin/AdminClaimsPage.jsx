import { useEffect, useRef, useState } from 'react';
import { Check, Eye, RefreshCw, Search, X } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EmptyState, Modal, PageHeading, Pagination, Status } from '../vendor/VendorUi';
import { money, shortDate } from '../vendor/vendorData';
import { confirmAdminReturn, claimStatusLabels, decideClaim, listClaims } from './claimsApi';
import '../kyc/kyc.css';
import '../kyc/admin-kyc.css';
import ClaimEvidence from '../shared/ClaimEvidence';
import ClaimHandover from './ClaimHandover';
import { isCustomerReport, needsUnits, reportTypes } from '../shared/reportTypes';

const decisionEffects = {
  tidak_sampai: 'Setujui: sewa dan deposit dikembalikan 100%, pesanan dibatalkan, vendor tidak mendapat apa-apa.',
  tidak_sesuai: 'Setujui: customer mengembalikan barang dulu; setelah diterima, sewa dan deposit dikembalikan 100%.',
  kurang: 'Setujui: dana senilai unit yang kurang dikembalikan ke customer; sisanya hak vendor.',
  tidak_berfungsi: 'Setujui: dana senilai unit bermasalah untuk sisa hari sewa dikembalikan ke customer.',
  lainnya: 'Setujui: tentukan nominal yang adil untuk dikembalikan ke customer.',
};

function ClaimModal({ claim, process, onClose, onDecided }) {
  const [note, setNote] = useState('');
  const [units, setUnits] = useState(String(claim.units || ''));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const deciding = process && claim.status === 'Ditinjau';
  const report = isCustomerReport(claim);
  const decide = async decision => {
    if (pending.current) return;
    if (decision === 'ditolak' && !note.trim()) { setError('Alasan penolakan wajib diisi.'); return; }
    if (decision === 'disetujui' && claim.type === 'lainnya' && !(Number(amount) > 0)) { setError('Isi nominal pengembalian.'); return; }
    const extra = decision !== 'disetujui' ? {} : needsUnits(claim.type) ? { units: Number(units) } : claim.type === 'lainnya' ? { amount: Number(amount) } : {};
    pending.current = true; setBusy(true); setError('');
    try { await decideClaim(claim.id, decision, note.trim(), extra); onDecided(decision); }
    catch (reason) { setError(reason.message); pending.current = false; setBusy(false); }
  };
  const returned = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await confirmAdminReturn(claim.id); onDecided('disetujui'); }
    catch (reason) { setError(reason.message); pending.current = false; setBusy(false); }
  };
  return <Modal title={`Detail klaim ${claim.id}`} onClose={onClose}>
    <div className="kyc-review-summary"><Status>{claim.status}</Status></div>
    <dl className="kyc-details">
      <div><dt>No. pesanan</dt><dd>{claim.order}</dd></div><div><dt>Tanggal pengajuan</dt><dd>{shortDate(claim.date)}</dd></div>
      <div><dt>Customer</dt><dd>{claim.customer}</dd></div><div><dt>Vendor</dt><dd>{claim.vendor}</dd></div>
      <div><dt>Deposit jaminan</dt><dd>{money(claim.amount)}</dd></div>
      {claim.decidedBy && <div><dt>Diputuskan oleh</dt><dd>{claim.decidedBy}</dd></div>}
      <div className="kyc-full-field"><dt>Perihal klaim</dt><dd>{claim.reason}</dd></div>
      {claim.type && <div><dt>Jenis</dt><dd>{reportTypes[claim.type]}{claim.item ? ` · ${claim.item} × ${claim.units}` : ''}</dd></div>}
      <ClaimEvidence claim={claim} className="kyc-full-field" />
      {claim.compensation != null && <div><dt>{report ? 'Dikembalikan ke customer' : 'Deposit diberikan ke vendor'}</dt><dd>{money(claim.compensation)}</dd></div>}
      {!deciding && claim.note && <div className="kyc-full-field"><dt>Catatan admin</dt><dd>{claim.note}</dd></div>}
    </dl>
    {claim.orderId && <ClaimHandover orderId={claim.orderId} />}
    {deciding && <p className="v-modal-copy">{report ? decisionEffects[claim.type] : 'Setujui: seluruh deposit jaminan diberikan ke vendor. Tolak: deposit kembali ke customer setelah pesanan selesai.'}</p>}
    {deciding && needsUnits(claim.type) && <label className="v-field kyc-review-note">Jumlah unit yang disetujui<input type="number" min="1" value={units} onChange={event => setUnits(event.target.value)} disabled={busy} /></label>}
    {deciding && claim.type === 'lainnya' && <label className="v-field kyc-review-note">Nominal pengembalian (Rp)<input type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} disabled={busy} /></label>}
    {claim.awaitingReturn && <><p className="v-modal-copy">Menunggu barang kembali ke vendor. Bila sudah ada bukti barang kembali, konfirmasi di sini.</p><button type="button" className="v-button v-button-primary" disabled={busy} onClick={returned}>Barang sudah kembali</button></>}
    {deciding && <label className="v-field kyc-review-note">Catatan keputusan <small>(wajib untuk penolakan)</small><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={3} disabled={busy} placeholder="Tuliskan alasan keputusan" /></label>}
    {error && <p role="alert" className="kyc-error">{error}</p>}
    {deciding && <div className="v-modal-actions"><button type="button" className="v-button v-button-danger" disabled={busy} onClick={() => decide('ditolak')}><X size={16} />Tolak</button><button type="button" className="v-button v-button-primary" disabled={busy} onClick={() => decide('disetujui')}><Check size={16} />Setujui</button></div>}
  </Modal>;
}

export default function AdminClaimsPage({ segments, onLoaded }) {
  const navigate = useNavigate();
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [dialog, setDialog] = useState(null); // { id, process }
  const [notice, setNotice] = useState('');
  const routeId = segments[1]?.replace(/^KLM-/i, '');

  useEffect(() => {
    const lifecycle = new AbortController();
    listClaims().then(value => { if (!lifecycle.signal.aborted) { setClaims(value); setError(''); onLoaded(value); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setError(reason.message); });
    return () => { lifecycle.abort(); };
  }, [refresh, onLoaded]);

  const keyword = search.trim().toLowerCase();
  const filtered = (claims || []).filter(claim => (!status || claim.status === status) && (!keyword || [claim.id, claim.order, claim.customer, claim.vendor, claim.reason].some(value => value.toLowerCase().includes(keyword))));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const shown = filtered.slice((current - 1) * size, current * size);
  const target = dialog ? { ...dialog } : routeId ? { id: `KLM-${routeId}`, process: false } : null;
  const targetClaim = target && claims?.find(claim => claim.id === target.id);

  if (segments[1] && (!/^[0-9]+$/.test(routeId) || segments[2])) return <Navigate to="/admin/klaim" replace />;
  if (!dialog && routeId && claims && !targetClaim) return <Navigate to="/admin/klaim" replace />;
  const close = () => { setDialog(null); if (routeId) navigate('/admin/klaim', { replace: true }); };

  return <div className="admin-kyc">
    <PageHeading eyebrow="SENGKETA PENYEWAAN" title="Kelola klaim" description="Tinjau klaim yang masuk, lalu putuskan untuk menyetujui atau menolaknya." />
    {notice && <p className="kyc-notice" role="status">{notice}</p>}
    <section className="v-card" aria-label="Daftar klaim">
      <div className="admin-kyc-toolbar"><label><Search size={17} /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={120} placeholder="Cari nomor klaim, pesanan, vendor, atau perihal" aria-label="Cari klaim" /></label><div className="v-table-filters"><select aria-label="Filter status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{Object.values(claimStatusLabels).map(label => <option key={label}>{label}</option>)}</select></div><button type="button" className="v-button v-button-secondary" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button></div>
      {error ? <p className="kyc-error admin-kyc-list-error" role="alert">{error}</p> : !claims ? <p role="status" className="admin-kyc-loading">Memuat klaim…</p> : !shown.length ? <EmptyState title={claims.length ? 'Tidak ada hasil yang cocok' : 'Belum ada klaim'} description={claims.length ? 'Coba kata kunci lain atau sesuaikan filter Anda.' : 'Klaim yang masuk akan muncul di sini dengan status Ditinjau.'} /> : <div className="v-table-scroll"><table className="v-table"><thead><tr><th>No. Klaim</th><th>Pesanan</th><th>Vendor</th><th>Perihal</th><th>Deposit</th><th>Status</th><th>Operasi</th></tr></thead><tbody>{shown.map(claim => <tr key={claim.id}><td>{claim.id}</td><td>{claim.order}</td><td>{claim.vendor}</td><td>{claim.reason}</td><td className="v-number">{money(claim.amount)}</td><td><Status>{claim.status}</Status></td><td><div className="v-row-actions"><button type="button" className="v-icon-button" aria-label={`Lihat klaim ${claim.id}`} title="Lihat detail" onClick={() => setDialog({ id: claim.id, process: false })}><Eye size={16} /></button>{claim.status === 'Ditinjau' && <button type="button" className="v-text-button" onClick={() => setDialog({ id: claim.id, process: true })}>Proses</button>}</div></td></tr>)}</tbody></table></div>}
      {claims && !error && <Pagination count={filtered.length} page={current} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} />}
    </section>
    {targetClaim && <ClaimModal key={`${targetClaim.id}:${target.process}`} claim={targetClaim} process={target.process} onClose={close} onDecided={decision => { close(); setNotice(decision === 'disetujui' ? `Klaim ${targetClaim.id} disetujui.` : `Klaim ${targetClaim.id} ditolak.`); setRefresh(value => value + 1); }} />}
  </div>;
}
