import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Building2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { kycStatus } from '../kyc/kycApi';
import UserKycPage from '../kyc/UserKycPage';
import { BackLink, PageHeading, Status } from './VendorUi';
import PayoutAccountCard from './PayoutAccountCard';
import {
  configureVendorTwoFactor,
  getVendorSecurity,
  getVendorSettings,
  updateVendorBusiness,
  updateVendorOwner,
  updateVendorPassword,
} from './vendorSettingsApi';

function OwnerSettingsForm({ data, onSaved, notify }) {
  const { refreshUser } = useAuth();
  const { owner, business } = data;
  const initial = {
    nama: owner.nama || '',
    email: owner.email || '',
    no_telp: owner.no_telp || '',
    nama_vendor: business?.nama_vendor || '',
  };
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const setField = (key, value) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
    setFormError('');
  };

  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    const nextErrors = {};
    if (!draft.nama.trim()) nextErrors.nama = 'Nama lengkap wajib diisi.';
    if (!draft.email.trim()) nextErrors.email = 'Email wajib diisi.';
    if (!draft.no_telp.trim()) nextErrors.no_telp = 'Nomor WhatsApp wajib diisi.';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }

    pending.current = true;
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const updated = await updateVendorOwner({
        nama: draft.nama.trim(),
        email: draft.email.trim(),
        no_telp: draft.no_telp.trim(),
        nama_vendor: draft.nama_vendor.trim() || null,
      });
      await refreshUser().catch(() => {});
      onSaved(updated);
      notify('Profil pemilik berhasil disimpan.');
    } catch (error) {
      setErrors(error.errors || {});
      setFormError(error.message || 'Gagal menyimpan profil pemilik.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return <>
    <PageHeading
      eyebrow="PORTAL VENDOR"
      title="Profil pemilik"
      description="Kelola informasi pemilik dan kontak akun vendor Anda."
    />
    <div className="v-settings-grid">
      <form className="v-card v-settings-form" onSubmit={submit} noValidate aria-busy={busy}>
        <div className="v-section-heading">
          <div className="v-heading-icon"><BadgeCheck size={20} /></div>
          <div>
            <h2>Data pribadi &amp; kontak</h2>
            <p>Informasi akun pemilik yang mengelola workspace vendor.</p>
          </div>
        </div>
        {formError && <p className="v-field-error" role="alert" style={{ marginBottom: 16 }}>{formError}</p>}
        <div className="v-form-grid">
          <div className="v-field">
            <label htmlFor="owner-nama">Nama lengkap <span className="v-required" aria-hidden="true">*</span></label>
            <input id="owner-nama" type="text" required maxLength={120} disabled={busy} value={draft.nama} aria-invalid={Boolean(errors.nama)} onChange={event => setField('nama', event.target.value)} />
            {errors.nama && <p className="v-field-error">{errors.nama}</p>}
          </div>
          <div className="v-field">
            <label htmlFor="owner-email">Email <span className="v-required" aria-hidden="true">*</span></label>
            <input id="owner-email" type="email" required maxLength={255} readOnly={owner.email_locked} disabled={busy} value={draft.email} aria-invalid={Boolean(errors.email)} onChange={event => setField('email', event.target.value)} />
            {owner.email_locked && <p className="v-field-hint">Email tidak dapat diubah karena tertaut akun Google atau 2FA aktif.</p>}
            {errors.email && <p className="v-field-error">{errors.email}</p>}
          </div>
          <div className="v-field">
            <label htmlFor="owner-phone">Nomor WhatsApp <span className="v-required" aria-hidden="true">*</span></label>
            <input id="owner-phone" type="tel" required maxLength={30} disabled={busy} value={draft.no_telp} aria-invalid={Boolean(errors.no_telp)} placeholder="081234567890" onChange={event => setField('no_telp', event.target.value)} />
            {errors.no_telp && <p className="v-field-error">{errors.no_telp}</p>}
          </div>
          <div className="v-field">
            <label htmlFor="owner-org">Nama usaha / organisasi (opsional)</label>
            <input id="owner-org" type="text" maxLength={150} disabled={busy} value={draft.nama_vendor} aria-invalid={Boolean(errors.nama_vendor)} placeholder="Contoh: Roder Bogor Tenda Megah" onChange={event => setField('nama_vendor', event.target.value)} />
            {errors.nama_vendor && <p className="v-field-error">{errors.nama_vendor}</p>}
          </div>
        </div>
        <div className="v-form-actions">
          <button className="v-button v-button-secondary" type="button" disabled={busy} onClick={() => { setDraft(initial); setErrors({}); setFormError(''); }}>Batalkan perubahan</button>
          <button className="v-button v-button-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
        </div>
      </form>

      <div className="v-form-stack">
        <section className="v-card v-detail-card">
          <div className="v-section-heading">
            <div>
              <h2>Usaha saya</h2>
              <p>Ringkasan profil bisnis yang terhubung dengan akun Anda.</p>
            </div>
            <Status>{business?.status_aktif ? 'Aktif' : 'Belum aktif'}</Status>
          </div>
          <dl>
            <div><dt>Nama usaha</dt><dd>{business?.nama_vendor || 'Belum diatur'}</dd></div>
            <div><dt>Kota operasional</dt><dd>{business?.kota || 'Belum diisi'}</dd></div>
          </dl>
          <div className="v-form-actions" style={{ marginTop: 18, paddingTop: 16 }}>
            <Link className="v-button v-button-secondary" to="/vendor/profil-bisnis">Kelola profil bisnis</Link>
          </div>
        </section>

        <section className="v-card v-detail-card">
          <div className="v-section-heading">
            <div>
              <h2>Verifikasi &amp; keamanan</h2>
              <p>Status verifikasi identitas dan perlindungan akun Anda.</p>
            </div>
            <Status>{kycStatus[owner.status_verifikasi] || 'Belum diverifikasi'}</Status>
          </div>
          <dl>
            <div><dt>Status KYC</dt><dd>{kycStatus[owner.status_verifikasi] || owner.status_verifikasi}</dd></div>
            <div><dt>Autentikasi 2 langkah</dt><dd>{owner.two_factor_email ? 'Aktif (OTP email)' : 'Nonaktif'}</dd></div>
          </dl>
          <div className="v-form-actions" style={{ marginTop: 18, paddingTop: 16 }}>
            <Link className="v-button v-button-secondary" to="/vendor/kyc">Detail KYC</Link>
            <Link className="v-button v-button-secondary" to="/vendor/keamanan">Keamanan</Link>
          </div>
        </section>
      </div>
    </div>
  </>;
}

function BusinessSettingsForm({ data, onSaved, notify }) {
  const { owner, business } = data;
  const initial = {
    nama_vendor: business?.nama_vendor || '',
    kota: business?.kota || '',
    alamat: business?.alamat || '',
    deskripsi: business?.deskripsi || '',
  };
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const setField = (key, value) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
    setFormError('');
  };

  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    if (!draft.nama_vendor.trim()) {
      setErrors({ nama_vendor: 'Nama bisnis wajib diisi.' });
      return;
    }
    pending.current = true;
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const updated = await updateVendorBusiness({
        nama_vendor: draft.nama_vendor.trim(),
        kota: draft.kota.trim() || null,
        alamat: draft.alamat.trim() || null,
        deskripsi: draft.deskripsi.trim() || null,
      });
      onSaved(updated);
      notify('Profil bisnis berhasil disimpan.');
    } catch (error) {
      setErrors(error.errors || {});
      setFormError(error.message || 'Gagal menyimpan profil bisnis.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return <>
    <BackLink to="/vendor/pengaturan">Kembali ke profil pemilik</BackLink>
    <PageHeading
      eyebrow="PORTAL VENDOR"
      title="Profil bisnis"
      description="Lengkapi identitas, lokasi, dan deskripsi usaha penyewaan Anda."
    />
    <div className="v-settings-grid">
      <form className="v-card v-settings-form" onSubmit={submit} noValidate aria-busy={busy}>
        <div className="v-section-heading">
          <div className="v-heading-icon"><Building2 size={20} /></div>
          <div>
            <h2>Informasi bisnis</h2>
            <p>Isi nama, kota, alamat, dan tentang bisnis agar profil lengkap. Bisnis aktif otomatis setelah KYC terverifikasi.</p>
          </div>
        </div>
        {formError && <p className="v-field-error" role="alert" style={{ marginBottom: 16 }}>{formError}</p>}
        <div className="v-form-grid">
          <div className="v-field">
            <label htmlFor="biz-name">Nama bisnis <span className="v-required" aria-hidden="true">*</span></label>
            <input id="biz-name" type="text" required maxLength={150} disabled={busy} value={draft.nama_vendor} aria-invalid={Boolean(errors.nama_vendor)} onChange={event => setField('nama_vendor', event.target.value)} />
            {errors.nama_vendor && <p className="v-field-error">{errors.nama_vendor}</p>}
          </div>
          <div className="v-field">
            <label htmlFor="biz-city">Kota operasional</label>
            <input id="biz-city" type="text" maxLength={100} disabled={busy} value={draft.kota} aria-invalid={Boolean(errors.kota)} placeholder="Contoh: Bogor" onChange={event => setField('kota', event.target.value)} />
            {errors.kota && <p className="v-field-error">{errors.kota}</p>}
          </div>
          <div className="v-field v-field-wide">
            <label htmlFor="biz-address">Alamat bisnis</label>
            <input id="biz-address" type="text" maxLength={2000} disabled={busy} value={draft.alamat} aria-invalid={Boolean(errors.alamat)} placeholder="Alamat gudang / operasional" onChange={event => setField('alamat', event.target.value)} />
            {errors.alamat && <p className="v-field-error">{errors.alamat}</p>}
          </div>
          <div className="v-field v-field-wide">
            <label htmlFor="biz-description">Tentang bisnis</label>
            <textarea id="biz-description" rows={4} maxLength={10000} disabled={busy} value={draft.deskripsi} aria-invalid={Boolean(errors.deskripsi)} placeholder="Ceritakan layanan penyewaan perlengkapan event Anda…" onChange={event => setField('deskripsi', event.target.value)} />
            {errors.deskripsi && <p className="v-field-error">{errors.deskripsi}</p>}
          </div>
        </div>
        <div className="v-form-actions">
          <button className="v-button v-button-secondary" type="button" disabled={busy} onClick={() => { setDraft(initial); setErrors({}); setFormError(''); }}>Batalkan perubahan</button>
          <button className="v-button v-button-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
        </div>
      </form>

      <section className="v-card v-detail-card">
        <div className="v-section-heading">
          <div>
            <h2>Status &amp; kontak usaha</h2>
            <p>Kontak akun berasal dari profil pemilik.</p>
          </div>
          <Status>{business?.status_aktif ? 'Aktif' : 'Belum aktif'}</Status>
        </div>
        <dl>
          <div><dt>Status bisnis</dt><dd>{business?.status_aktif ? 'Aktif di marketplace' : 'Menunggu KYC terverifikasi dan profil bisnis lengkap'}</dd></div>
          <div><dt>Rating</dt><dd>{business?.rating != null ? `${business.rating} / 5.0` : 'Belum ada rating'}</dd></div>
          <div><dt>Email akun</dt><dd>{owner.email}</dd></div>
          <div><dt>Nomor WhatsApp</dt><dd>{owner.no_telp || 'Belum diisi'}</dd></div>
        </dl>
        <div className="v-form-actions" style={{ marginTop: 18, paddingTop: 16 }}>
          <Link className="v-button v-button-secondary" to="/vendor/pengaturan">Ubah kontak pemilik</Link>
        </div>
      </section>
    </div>
    <PayoutAccountCard notify={notify} />
  </>;
}

function SecuritySettings({ notify }) {
  const navigate = useNavigate();
  const flash = useLocation().state?.message;
  const [security, setSecurity] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ current_password: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    const lifecycle = new AbortController();
    getVendorSecurity()
      .then(value => { if (!lifecycle.signal.aborted) { setSecurity(value); setLoadError(''); } })
      .catch(reason => { if (!lifecycle.signal.aborted) setLoadError(reason.message); });
    return () => lifecycle.abort();
  }, []);

  if (loadError) {
    return <>
      <BackLink to="/vendor/pengaturan">Kembali ke profil pemilik</BackLink>
      <PageHeading eyebrow="PORTAL VENDOR" title="Keamanan akun" />
      <section className="v-card v-settings-form" role="alert"><p>{loadError}</p></section>
    </>;
  }
  if (!security) return <p role="status">Memuat pengaturan keamanan…</p>;

  const create = security.password_dibuat !== true;

  const submitPassword = async event => {
    event.preventDefault();
    if (pending.current) return;
    if (form.password.length < 8 || form.password.length > 72) {
      setError('Kata sandi baru minimal 8 karakter dan maksimal 72 karakter.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Konfirmasi kata sandi belum sama.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const payload = create
        ? { password: form.password, confirm_password: form.confirm_password }
        : form;
      const result = await updateVendorPassword(payload);
      setForm({ current_password: '', password: '', confirm_password: '' });
      if (result.two_factor_required) {
        navigate('/two-factor-verification');
        return;
      }
      setSecurity(result);
      notify('Kata sandi berhasil diperbarui.');
    } catch (reason) {
      setError(reason.message || 'Gagal memperbarui kata sandi.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const toggleTwoFactor = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await configureVendorTwoFactor(!security.two_factor_email);
      navigate('/two-factor-verification');
    } catch (reason) {
      setError(reason.message || 'Gagal mengubah pengaturan autentikasi dua langkah.');
      setBusy(false);
    } finally {
      pending.current = false;
    }
  };

  return <>
    <BackLink to="/vendor/pengaturan">Kembali ke profil pemilik</BackLink>
    <PageHeading
      eyebrow="PORTAL VENDOR"
      title="Keamanan akun"
      description="Kelola kata sandi dan autentikasi dua langkah melalui OTP email."
    />
    {flash && <p className="v-card v-settings-form" role="status" style={{ marginBottom: 20, padding: '14px 18px', color: '#2f6a3b', background: '#e8f2e8' }}>{flash}</p>}
    <div className="v-settings-grid">
      <form className="v-card v-settings-form" onSubmit={submitPassword} noValidate aria-busy={busy}>
        <div className="v-section-heading">
          <h2>{create ? 'Buat kata sandi' : 'Ubah kata sandi'}</h2>
          <button
            className="v-icon-button"
            type="button"
            aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            onClick={() => setVisible(value => !value)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="v-form-stack">
          {!create && <div className="v-field">
            <label htmlFor="sec-current">Kata sandi saat ini</label>
            <input id="sec-current" type={visible ? 'text' : 'password'} required disabled={busy} autoComplete="current-password" value={form.current_password} onChange={event => { setForm(c => ({ ...c, current_password: event.target.value })); setError(''); }} />
          </div>}
          <div className="v-field">
            <label htmlFor="sec-new">Kata sandi baru</label>
            <input id="sec-new" type={visible ? 'text' : 'password'} required minLength={8} maxLength={72} disabled={busy} autoComplete="new-password" aria-describedby="v-password-hint" value={form.password} onChange={event => { setForm(c => ({ ...c, password: event.target.value })); setError(''); }} />
          </div>
          <div className="v-field">
            <label htmlFor="sec-confirm">Konfirmasi kata sandi baru</label>
            <input id="sec-confirm" type={visible ? 'text' : 'password'} required minLength={8} maxLength={72} disabled={busy} autoComplete="new-password" value={form.confirm_password} onChange={event => { setForm(c => ({ ...c, confirm_password: event.target.value })); setError(''); }} />
          </div>
          <p className="v-field-hint" id="v-password-hint">
            {create ? 'Verifikasi OTP email diperlukan untuk membuat kata sandi akun Google.' : 'Gunakan minimal 8 karakter.'}
          </p>
          {error && <p className="v-field-error" role="alert">{error}</p>}
        </div>
        <div className="v-form-actions">
          <button type="submit" className="v-button v-button-primary" disabled={busy}>
            {busy ? 'Memproses…' : create ? 'Buat kata sandi' : 'Perbarui kata sandi'}
          </button>
        </div>
      </form>

      <div className="v-form-stack">
        <section className="v-card v-security-card">
          <div className="v-heading-icon"><ShieldCheck size={22} /></div>
          <h2>Autentikasi dua langkah (OTP Email)</h2>
          <p>Kode OTP dikirim ke email <strong>{security.email}</strong> setiap kali login.</p>
          <div className="v-toggle-row">
            <div>
              <strong>Verifikasi OTP saat login</strong>
              <small>{security.two_factor_email ? 'Aktif' : 'Belum diaktifkan'}</small>
            </div>
            <button
              type="button"
              className="v-switch"
              role="switch"
              disabled={busy}
              aria-checked={security.two_factor_email}
              aria-label="Autentikasi dua langkah via email"
              onClick={toggleTwoFactor}
            >
              <span />
            </button>
          </div>
        </section>

        <section className="v-card v-security-card">
          <div className="v-section-heading"><h2>Perlindungan akun</h2><LockKeyhole size={18} /></div>
          <div className="v-device">
            <span className="v-device-icon"><LockKeyhole size={19} /></span>
            <div>
              <strong>{security.akun_google ? 'Tertaut dengan akun Google' : 'Login email & kata sandi'}</strong>
              <small>{security.two_factor_email ? 'Perubahan email dikunci selama 2FA aktif' : 'Perubahan pengaturan keamanan diverifikasi via OTP email'}</small>
            </div>
          </div>
        </section>
      </div>
    </div>
  </>;
}

export default function VendorSettings({ page, onLoaded, notify }) {
  const { user } = useAuth();
  const [result, setResult] = useState({ data: null, error: '' });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!['pengaturan', 'profil-bisnis'].includes(page)) return;
    const lifecycle = new AbortController();
    getVendorSettings()
      .then(value => {
        if (lifecycle.signal.aborted) return;
        setResult({ data: value, error: '' });
        onLoaded?.(value);
      })
      .catch(reason => {
        if (!lifecycle.signal.aborted) setResult({ data: null, error: reason.message });
      });
    return () => lifecycle.abort();
  }, [page, user?.user_id, refresh, onLoaded]);

  if (page === 'keamanan') return <SecuritySettings notify={notify} />;
  if (page === 'kyc') return <UserKycPage backTo="/vendor/pengaturan" backLabel="Pengaturan Akun" />;

  if (result.error) {
    return <>
      <PageHeading eyebrow="PORTAL VENDOR" title={page === 'profil-bisnis' ? 'Profil bisnis' : 'Profil pemilik'} />
      <section className="v-card v-settings-form" role="alert">
        <p>{result.error}</p>
        <button type="button" className="v-button v-button-secondary" onClick={() => setRefresh(v => v + 1)}>Coba lagi</button>
      </section>
    </>;
  }

  if (!result.data) return <p role="status">Memuat pengaturan akun…</p>;

  const handleSaved = updated => {
    setResult({ data: updated, error: '' });
    onLoaded?.(updated);
  };

  return page === 'profil-bisnis'
    ? <BusinessSettingsForm key={`biz-${result.data.business?.vendor_id ?? 'new'}-${result.data.business?.nama_vendor ?? ''}`} data={result.data} onSaved={handleSaved} notify={notify} />
    : <OwnerSettingsForm key={`owner-${result.data.owner.user_id}-${result.data.owner.email}`} data={result.data} onSaved={handleSaved} notify={notify} />;
}
