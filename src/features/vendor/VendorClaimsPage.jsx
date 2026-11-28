import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, RefreshCw, Search } from 'lucide-react';
import SlidingTabs from '../interface/SlidingTabs';
import { EmptyState, Modal, PageHeading, Pagination, Status } from './VendorUi';
import { money } from './vendorData';
import { formatOrderDate, formatOrderDateTime } from './vendorOrdersApi';
import { claimFilters, claimLabels, confirmVendorReturn, listVendorClaims, processVendorClaim, respondVendorClaim } from './vendorClaimsApi';
import ClaimEvidence from '../shared/ClaimEvidence';
import { isCustomerReport, reportTypes } from '../shared/reportTypes';
import './vendor-orders.css';

function ClaimModal({ claim, process, onClose, onProcessed, onChanged }) {
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const run = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await processVendorClaim(claim.id, claim.status); onProcessed(claimLabels[claim.next]); }
    catch (reason) { setError(reason.message); pending.current = false; setBusy(false); }
  };
  const act = async (send, message) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await send(); onChanged(message); }
    catch (reason) { setError(reason.message); pending.current = false; setBusy(false); }
  };
  const canReply = !process && isCustomerReport(claim) && !claim.response && ['diajukan', 'ditinjau'].includes(claim.status);
  return <Modal title={`${process ? 'Proses' : 'Detail'} klaim ${claim.id}`} onClose={onClose} narrow={process}>
    {process
      ? <p className="v-modal-copy">Status klaim berubah dari <strong>{claimLabels[claim.status]}</strong> menjadi <strong>{claimLabels[claim.next]}</strong>. Status hanya bisa maju dan tidak dapat dikembalikan.</p>
      : <dl className="vendor-orders-details">
        <div><dt>Status</dt><dd><Status>{claimLabels[claim.status]}</Status></dd></div>
        <div><dt>Tanggal pengajuan</dt><dd>{formatOrderDate(claim.date)}</dd></div>
        <div><dt>No. pesanan</dt><dd>{claim.order}</dd></div>
        <div><dt>Pelanggan</dt><dd>{claim.customer}</dd></div>
        <div><dt>Deposit jaminan</dt><dd>{money(claim.amount)}</dd></div>
        {claim.decidedAt && <div><dt>Diputuskan admin</dt><dd>{formatOrderDateTime(claim.decidedAt)}</dd></div>}
        {claim.type && <div><dt>Jenis</dt><dd>{reportTypes[claim.type]}{claim.item ? ` · ${claim.item} × ${claim.units}` : ''}</dd></div>}
        <div className="vendor-orders-detail-wide"><dt>Perihal klaim</dt><dd>{claim.reason}</dd></div>
        <ClaimEvidence claim={claim} className="vendor-orders-detail-wide" />
        {claim.compensation != null && <div className="vendor-orders-detail-wide"><dt>{isCustomerReport(claim) ? 'Dikembalikan ke pelanggan' : 'Deposit untuk Anda (masuk pencairan)'}</dt><dd>{money(claim.compensation)}</dd></div>}
        {claim.note && <div className="vendor-orders-detail-wide"><dt>Catatan admin</dt><dd>{claim.note}</dd></div>}
      </dl>}
    {canReply && <form onSubmit={event => { event.preventDefault(); if (reply.trim()) act(() => respondVendorClaim(claim.id, reply.trim(), photo), `Tanggapan ${claim.id} terkirim.`); }}>
      <label className="v-field"><span>Tanggapan Anda (sekali kirim)</span><textarea value={reply} onChange={event => setReply(event.target.value)} maxLength={1000} rows={3} required disabled={busy} /></label>
      <label className="v-field"><span>Foto pendukung (opsional)</span><input type="file" accept="image/jpeg,image/png" disabled={busy} onChange={event => setPhoto(event.target.files?.[0] || null)} /></label>
      <button type="submit" className="v-button v-button-primary" disabled={busy || !reply.trim()}>Kirim tanggapan</button>
    </form>}
    {!process && claim.awaitingReturn && <><p className="v-modal-copy">Konfirmasi setelah barang benar-benar Anda terima kembali. Pesanan akan dibatalkan dan dana pelanggan dikembalikan.</p>
      <button type="button" className="v-button v-button-primary" disabled={busy} onClick={() => act(() => confirmVendorReturn(claim.id), `Barang untuk ${claim.id} dikonfirmasi diterima.`)}>Barang sudah saya terima kembali</button></>}
    {error && <p role="alert" className="v-field-error">{error}</p>}
    {process && <div className="v-modal-actions"><button type="button" className="v-button v-button-secondary" disabled={busy} onClick={onClose}>Batal</button><button type="button" className="v-button v-button-primary" disabled={busy} onClick={run}>{busy ? 'Memproses…' : `Proses ke ${claimLabels[claim.next]}`}</button></div>}
  </Modal>;
}

export default function VendorClaimsPage({ segments, onLoaded, notify }) {
  const navigate = useNavigate();
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState('semua');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [dialog, setDialog] = useState(null); // { id, process }
  const routeId = segments[1]?.replace(/^KLM-/i, '');

  useEffect(() => {
    const lifecycle = new AbortController();
    listVendorClaims().then(value => { if (!lifecycle.signal.aborted) { setClaims(value); setError(''); onLoaded(value); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setError(reason.message); });
    return () => lifecycle.abort();
  }, [refresh, onLoaded]);

  const keyword = search.trim().toLowerCase();
  const counts = Object.fromEntries(claimFilters.map(([key]) => [key, (claims || []).filter(claim => key === 'semua' || claim.status === key).length]));
  const filtered = (claims || []).filter(claim => (status === 'semua' || claim.status === status) && (!keyword || [claim.id, claim.order, claim.customer, claim.reason].some(value => value.toLowerCase().includes(keyword))));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const shown = filtered.slice((current - 1) * size, current * size);
  const target = dialog || (routeId ? { id: `KLM-${routeId}`, process: false } : null);
  const targetClaim = target && claims?.find(claim => claim.id === target.id);

  if (segments[1] && (!/^[0-9]+$/.test(routeId) || segments[2])) return <Navigate to="/vendor/klaim" replace />;
  if (!dialog && routeId && claims && !targetClaim) return <Navigate to="/vendor/klaim" replace />;
  const close = () => { setDialog(null); if (routeId) navigate('/vendor/klaim', { replace: true }); };

  return <div className="vendor-orders">
    <PageHeading eyebrow="PORTAL VENDOR" title="Klaim" description="Pantau klaim atas pesanan Anda dan majukan statusnya. Keputusan setuju atau tolak dibuat oleh admin." />
    <SlidingTabs
      tabs={claimFilters.map(([key, label]) => ({ key: `vendor-claims-${key}`, label: `${label} (${counts[key]})` }))}
      active={claimFilters.findIndex(([key]) => key === status)}
      onSelect={index => { setStatus(claimFilters[index][0]); setPage(1); }}
      label="Filter status klaim"
      className="vendor-orders-status-tabs"
    />
    <section className="v-card v-records-card" id={`vendor-claims-${status}-panel`} role="tabpanel" aria-labelledby={`vendor-claims-${status}-tab`} tabIndex={0}>
      <div className="vendor-orders-toolbar">
        <label><Search size={17} /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={120} placeholder="Cari nomor klaim, pesanan, pelanggan, atau perihal…" aria-label="Cari klaim" /></label>
        <button type="button" className="v-button v-button-secondary" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Muat ulang</button>
      </div>
      {error ? <p className="vendor-orders-error vendor-orders-list-error" role="alert">{error}</p>
        : !claims ? <p role="status" className="vendor-orders-loading">Memuat klaim…</p>
          : !shown.length ? <EmptyState title={claims.length ? 'Tidak ada hasil yang cocok' : 'Belum ada klaim'} description={claims.length ? 'Coba kata kunci lain atau pilih status lain.' : 'Klaim customer atas pesanan Anda akan muncul di sini.'} />
            : <div className="v-table-scroll" tabIndex={0} role="region" aria-label="Tabel Klaim"><table className="v-table"><caption className="v-sr-only">Daftar klaim vendor</caption>
              <thead><tr><th scope="col">No. klaim</th><th scope="col">Pesanan</th><th scope="col">Pelanggan</th><th scope="col">Perihal</th><th scope="col">Deposit</th><th scope="col">Status</th><th scope="col" className="v-actions-cell">Operasi</th></tr></thead>
              <tbody>{shown.map(claim => <tr key={claim.id}>
                <td><span className="v-record-id">{claim.id}</span><small className="vendor-orders-subtext">{formatOrderDate(claim.date)}</small></td>
                <td>{claim.order}</td><td>{claim.customer}</td><td>{claim.type && <small className="vendor-orders-subtext">{reportTypes[claim.type]}</small>}{claim.reason}</td>
                <td className="v-number">{money(claim.amount)}</td>
                <td><Status>{claimLabels[claim.status]}</Status></td>
                <td><div className="v-row-actions vendor-orders-row-actions">
                  <button type="button" className="v-icon-button" aria-label={`Lihat klaim ${claim.id}`} title="Lihat detail" onClick={() => setDialog({ id: claim.id, process: false })}><Eye size={16} /></button>
                  {claim.next && <button type="button" className="v-button v-button-secondary vendor-orders-process-btn" onClick={() => setDialog({ id: claim.id, process: true })}>Proses</button>}
                </div></td>
              </tr>)}</tbody></table></div>}
      {claims && !error && <Pagination count={filtered.length} page={current} onPage={setPage} size={size} onSize={value => { setSize(value); setPage(1); }} />}
    </section>
    {targetClaim && (!target.process || targetClaim.next) && <ClaimModal key={`${targetClaim.id}:${target.process}`} claim={targetClaim} process={target.process} onClose={close}
      onChanged={message => { close(); notify(message); setRefresh(value => value + 1); }}
      onProcessed={label => { close(); notify(`Klaim ${targetClaim.id} diproses menjadi ${label}.`); setRefresh(value => value + 1); }} />}
  </div>;
}
