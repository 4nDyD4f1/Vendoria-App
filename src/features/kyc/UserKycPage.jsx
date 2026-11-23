import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, Clock, FileCheck2, RefreshCw, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { getMyKyc, kycStatus, submitKyc } from './kycApi';
import './kyc.css';

function UploadField({ kind, label, file, onFile, disabled }) {
  const [preview, setPreview] = useState(null);
  const previewUrl = useRef(null);
  useEffect(() => {
    return () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); };
  }, []);
  return <div className="kyc-upload-field"><label htmlFor={`kyc-${kind}`}>{label}</label>
    <div className="kyc-upload-box">{preview ? <img src={preview} alt={`Pratinjau ${label}`} /> : kind === 'ktp' ? <Upload size={26} strokeWidth={1.5} /> : <Camera size={26} strokeWidth={1.5} />}
      <p>{file ? file.name : 'Pilih foto JPG atau PNG'}</p><small>Maksimal 5 MB · 12 megapiksel</small>
      <input id={`kyc-${kind}`} name={kind} type="file" accept="image/jpeg,image/png" required disabled={disabled} onChange={event => {
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        const selected = event.target.files?.[0] || null;
        previewUrl.current = onFile(selected) && selected ? URL.createObjectURL(selected) : null;
        setPreview(previewUrl.current);
      }} />
    </div>
  </div>;
}

export default function UserKycPage({ backTo = '/akun', backLabel = 'Akun Saya' }) {
  const { user, refreshUser } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [ktp, setKtp] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [form, setForm] = useState({ nama: user.nama, nik: '', tempat_lahir: '', tanggal_lahir: '', alamat: '', consent: false });
  const pending = useRef(false);
  const generation = useRef(0);
  const prefilled = useRef(null);
  const lastKnownStatus = useRef(user.status_verifikasi);

  useEffect(() => {
    const lifecycle = new AbortController();
    const load = () => {
      const request = ++generation.current;
      getMyKyc().then(value => {
        if (lifecycle.signal.aborted || request !== generation.current) return;
        setResult(value); setError('');
        if (value.status_verifikasi !== lastKnownStatus.current) {
          lastKnownStatus.current = value.status_verifikasi;
          refreshUser().catch(() => {});
        }
        if (value.latest?.identity && prefilled.current !== value.latest.submission.kyc_id) {
          prefilled.current = value.latest.submission.kyc_id;
          setForm(current => ({ ...value.latest.identity, consent: current.consent }));
        }
      }).catch(reason => { if (!lifecycle.signal.aborted && request === generation.current) setError(reason.message); });
    };
    load();
    window.addEventListener('focus', load);
    return () => { lifecycle.abort(); window.removeEventListener('focus', load); };
  }, [user.user_id, refreshUser]);

  useEffect(() => {
    if (result?.status_verifikasi !== 'menunggu') return;
    const timer = setInterval(() => {
      if (document.hidden || pending.current) return;
      getMyKyc().then(value => {
        setResult(value);
        if (value.status_verifikasi !== 'menunggu') { lastKnownStatus.current = value.status_verifikasi; refreshUser().catch(() => {}); }
      }).catch(() => {});
    }, 20_000);
    return () => clearInterval(timer);
  }, [result?.status_verifikasi, refreshUser]);

  const choose = (file, setter) => {
    setError('');
    if (file && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(file.type))) {
      setter(null); setError('Gunakan foto JPG atau PNG maksimal 5 MB.'); return false;
    }
    setter(file); return Boolean(file);
  };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    if (!ktp || !selfie) { setError('Unggah foto KTP dan swafoto terlebih dahulu.'); return; }
    pending.current = true; setBusy(true); setError(''); setNotice('');
    ++generation.current;
    try {
      const saved = await submitKyc(form, ktp, selfie);
      lastKnownStatus.current = saved.status_verifikasi;
      setResult(saved); setKtp(null); setSelfie(null);
      setNotice('Pengajuan berhasil dikirim. Admin akan meninjau dokumen Anda.');
      await refreshUser().catch(() => {});
    } catch (reason) {
      setError([reason.message, ...Object.values(reason.errors || {})].filter(Boolean).join('. '));
    } finally { pending.current = false; setBusy(false); }
  };
  const status = result?.status_verifikasi || 'belum_diverifikasi';
  const locked = status === 'menunggu' || status === 'terverifikasi';
  const StatusIcon = status === 'terverifikasi' ? CheckCircle2 : status === 'ditolak' ? XCircle : Clock;

  return <div className="kyc-user-page">
    <nav className="kyc-breadcrumb" aria-label="Breadcrumb"><Link to="/">Beranda</Link><span>/</span><Link to={backTo}>{backLabel}</Link><span>/</span><span>Verifikasi KYC</span></nav>
    <header className="kyc-page-heading"><div><p className="kyc-eyebrow">KEAMANAN IDENTITAS</p><h1>Verifikasi KYC Identitas</h1><p>Lengkapi identitas dan dokumen untuk verifikasi akun Anda.</p></div><span className={`kyc-status kyc-status-${status}`}><StatusIcon size={16} />{kycStatus[status]}</span></header>
    {error && <p role="alert" className="kyc-error">{error}</p>}
    {notice && <p role="status" className="kyc-notice">{notice}</p>}
    {!result ? <section className="kyc-card"><p role="status">{error ? 'Pengaturan KYC belum dapat dimuat.' : 'Memuat status KYC…'}</p>{error && <button type="button" className="kyc-button" onClick={() => window.location.reload()}>Coba lagi</button>}</section> : <div className="kyc-user-layout">
      {locked ? <section className="kyc-card kyc-current-status"><StatusIcon size={42} strokeWidth={1.4} /><h2>{status === 'menunggu' ? 'Verifikasi KYC sedang ditinjau' : 'Identitas Anda terverifikasi'}</h2><p>{status === 'menunggu' ? 'Dokumen sudah diterima. Status akan diperbarui setelah admin menyelesaikan pemeriksaan.' : 'Verifikasi identitas Anda telah disetujui.'}</p>
        {result.latest && <dl className="kyc-details"><div><dt>No. pengajuan</dt><dd>KYC-{result.latest.submission.kyc_id}</dd></div><div><dt>Diajukan pada</dt><dd>{new Date(result.latest.submission.diajukan_pada).toLocaleString('id-ID')}</dd></div>{result.latest.catatan_admin && <div><dt>Catatan admin</dt><dd>{result.latest.catatan_admin}</dd></div>}</dl>}
        <Link to={backTo} className="kyc-button">{backTo === '/akun' ? 'Kembali ke Akun' : `Kembali ke ${backLabel}`}</Link>
      </section> : <form className="kyc-card kyc-submission-form" onSubmit={submit} aria-label="Pengajuan KYC" aria-busy={busy}>
        {status === 'ditolak' && <div className="kyc-rejected-note"><h2>Perbaiki pengajuan Anda</h2><p>{result.latest?.catatan_admin || 'Periksa kembali identitas dan kejelasan dokumen Anda.'}</p></div>}
        <h2>Data Identitas</h2><fieldset disabled={busy}><div className="kyc-form-grid">
          <label>Nama Lengkap<input name="nama" value={form.nama} required maxLength={120} autoComplete="name" onChange={event => setForm(current => ({ ...current, nama: event.target.value }))} /></label>
          <label>NIK (16 digit)<input name="nik" value={form.nik} required pattern="[0-9]{16}" maxLength={16} inputMode="numeric" autoComplete="off" onChange={event => setForm(current => ({ ...current, nik: event.target.value }))} /></label>
          <label>Tempat Lahir<input name="tempat_lahir" value={form.tempat_lahir} required maxLength={120} onChange={event => setForm(current => ({ ...current, tempat_lahir: event.target.value }))} /></label>
          <label>Tanggal Lahir<input name="tanggal_lahir" type="date" value={form.tanggal_lahir} required min="1900-01-01" max={today} onChange={event => setForm(current => ({ ...current, tanggal_lahir: event.target.value }))} /></label>
          <label className="kyc-full-field">Alamat Lengkap<textarea name="alamat" value={form.alamat} required maxLength={2000} rows={3} autoComplete="street-address" onChange={event => setForm(current => ({ ...current, alamat: event.target.value }))} /></label>
        </div><h2>Dokumen Verifikasi</h2><div className="kyc-upload-grid"><UploadField kind="ktp" label="Foto KTP" file={ktp} disabled={busy} onFile={file => choose(file, setKtp)} /><UploadField kind="selfie" label="Swafoto dengan KTP" file={selfie} disabled={busy} onFile={file => choose(file, setSelfie)} /></div>
        <label className="kyc-consent"><input type="checkbox" checked={form.consent} required onChange={event => setForm(current => ({ ...current, consent: event.target.checked }))} /><span>Saya menyatakan data yang diberikan benar dan menyetujui pemrosesan data untuk verifikasi identitas.</span></label>
        <button type="submit" className="kyc-button kyc-submit" disabled={busy}>{busy ? 'Mengirim pengajuan…' : status === 'ditolak' ? 'Kirim Ulang untuk Verifikasi' : 'Kirim Dokumen untuk Verifikasi'}<FileCheck2 size={18} /></button>
        </fieldset>
      </form>}
      <aside className="kyc-card kyc-guidance"><ShieldCheck size={26} strokeWidth={1.5} /><h2>Verifikasi identitas yang aman</h2><p>Dokumen hanya dapat diakses oleh Anda dan admin pemeriksa.</p><ul><li>Pastikan seluruh bagian KTP terlihat dan tulisan terbaca.</li><li>Ambil swafoto sambil memegang KTP dengan wajah terlihat jelas.</li><li>Gunakan data yang sama dengan dokumen identitas.</li></ul>{status === 'menunggu' && <p className="kyc-refresh-note"><RefreshCw size={14} />Status diperiksa secara berkala.</p>}</aside>
    </div>}
  </div>;
}
