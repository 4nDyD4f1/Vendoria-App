import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { decideKyc, getKyc, kycStatus } from './kycApi';
import PrivateKycImage from './PrivateKycImage';
import Skeleton from '../../components/Skeleton';

export default function KycReviewModal({ id, onClose, onDecided }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const dialog = useRef(null);
  const host = document.querySelector('.admin-workspace');

  useEffect(() => {
    const lifecycle = new AbortController();
    getKyc(id).then(value => { if (!lifecycle.signal.aborted) { setDetail(value); setNote(value.catatan_admin || ''); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setError(reason.message); });
    return () => { lifecycle.abort(); };
  }, [id]);

  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...host.children].filter(element => !element.contains(dialog.current)).map(element => [element, element.inert]);
    background.forEach(([element]) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    dialog.current.querySelector('button')?.focus();
    return () => {
      background.forEach(([element, previous]) => { element.inert = previous; });
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [host]);

  const decide = async status => {
    if (pending.current || !detail) return;
    if (status === 'ditolak' && !note.trim()) { setError('Alasan penolakan wajib diisi.'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      await decideKyc(id, status, note.trim());
      onDecided(status);
    } catch (reason) { setError(reason.message); }
    finally { pending.current = false; setBusy(false); }
  };
  const record = detail?.submission;
  const identity = detail?.identity;
  const waiting = record?.status === 'menunggu';

  return createPortal(<div className="v-modal-backdrop kyc-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="v-modal kyc-review-modal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="kyc-review-title" aria-busy={busy} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),textarea:not(:disabled),a[href]')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="v-modal-heading"><div><p className="v-eyebrow">PEMERIKSAAN IDENTITAS</p><h2 id="kyc-review-title">Pengajuan KYC-{id}</h2></div><button type="button" className="v-icon-button" aria-label="Tutup pemeriksaan KYC" onClick={onClose}><X size={20} /></button></div>
      {error && <p role="alert" className="kyc-error">{error}</p>}
      <div className="kyc-review-body">
      {!detail ? !error && <Skeleton variant="detail" label="Memuat data pengajuan…" /> : <>
        <div className="kyc-review-summary"><span className={`kyc-status kyc-status-${record.status}`}>{kycStatus[record.status]}</span><p>Diajukan {new Date(record.diajukan_pada).toLocaleString('id-ID')}</p></div>
        <dl className="kyc-details"><div><dt>Nama akun</dt><dd>{record.nama}</dd></div><div><dt>Jenis akun</dt><dd>{record.role === 'vendor' ? 'Vendor' : 'Customer'}</dd></div><div><dt>Email</dt><dd>{record.email}</dd></div><div><dt>Nomor WhatsApp</dt><dd>{record.no_telp || 'Belum diisi'}</dd></div>
          {identity && <><div><dt>Nama pada KTP</dt><dd>{identity.nama}</dd></div><div><dt>NIK</dt><dd>{identity.nik}</dd></div><div><dt>Tempat lahir</dt><dd>{identity.tempat_lahir}</dd></div><div><dt>Tanggal lahir</dt><dd>{identity.tanggal_lahir}</dd></div><div className="kyc-full-field"><dt>Alamat KTP</dt><dd>{identity.alamat}</dd></div></>}
          {detail.nama_pemeriksa && <div><dt>Diperiksa oleh</dt><dd>{detail.nama_pemeriksa}</dd></div>}
          {record.diputuskan_pada && <div><dt>Diputuskan pada</dt><dd>{new Date(record.diputuskan_pada).toLocaleString('id-ID')}</dd></div>}
        </dl>
        {detail.documents_available ? <div className="kyc-review-documents"><div><h3>Foto KTP</h3><PrivateKycImage key={detail.ktp_url} src={detail.ktp_url} alt="Foto KTP pemohon" /></div><div><h3>Swafoto dengan KTP</h3><PrivateKycImage key={detail.selfie_url} src={detail.selfie_url} alt="Swafoto pemohon dengan KTP" /></div></div> : <p className="kyc-error">Dokumen pengajuan tidak tersedia untuk diperiksa. Pengajuan ini belum dapat disetujui.</p>}
        <label className="v-field kyc-review-note">Catatan pemeriksaan {waiting && <small>(wajib untuk penolakan)</small>}<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={3} disabled={busy || !waiting} placeholder="Tuliskan hasil pemeriksaan atau alasan penolakan" /></label>
      </>}
      </div>
      {detail && <div className="kyc-review-actions"><button type="button" className="v-button v-button-danger" disabled={busy || !waiting} onClick={() => decide('ditolak')}><X size={16} />Tolak</button><button type="button" className="v-button v-button-primary" disabled={busy || !waiting || !detail.documents_available} onClick={() => decide('terverifikasi')}><Check size={16} />Setujui</button></div>}
    </section>
  </div>, host);
}
