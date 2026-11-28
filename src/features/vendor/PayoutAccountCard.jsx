import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { getPayoutAccount, payoutBanks, savePayoutAccount } from './vendorPayoutsApi';
import Skeleton from '../../components/Skeleton';

// Rekening tujuan pencairan dana vendor (satu rekening). Nomor lengkap tidak pernah dikembalikan server.
export default function PayoutAccountCard({ notify }) {
  const location = useLocation();
  const card = useRef(null);
  const pending = useRef(false);
  const [state, setState] = useState({ value: null, error: '' });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ bank: payoutBanks[0], number: '', owner: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const life = new AbortController();
    getPayoutAccount().then(value => { if (!life.signal.aborted) setState({ value, error: '' }); })
      .catch(error => { if (!life.signal.aborted) setState({ value: null, error: error.message }); });
    return () => life.abort();
  }, []);
  const ready = Boolean(state.value);
  useEffect(() => { if (ready && location.hash === '#rekening-pencairan') card.current?.scrollIntoView({ block: 'center' }); }, [ready, location.hash]);

  const { value } = state;
  const showForm = value?.business && (editing || !value.account);
  const setField = (key, next) => { setDraft(current => ({ ...current, [key]: next })); setErrors(current => ({ ...current, [key]: '' })); setFormError(''); };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setErrors({}); setFormError('');
    try {
      setState({ value: await savePayoutAccount(draft), error: '' });
      setEditing(false); setDraft({ bank: payoutBanks[0], number: '', owner: '' });
      notify('Rekening pencairan berhasil disimpan.');
    } catch (error) {
      setErrors(error.errors || {}); setFormError(error.message || 'Gagal menyimpan rekening.');
    } finally { pending.current = false; setBusy(false); }
  };

  return <section className="v-card v-settings-form" id="rekening-pencairan" ref={card} aria-busy={busy}>
    <div className="v-section-heading">
      <div className="v-heading-icon"><Landmark size={20} /></div>
      <div><h2>Rekening pencairan</h2><p>Dana hasil sewa dikirim ke rekening ini. Nama pemilik harus sama dengan nama akun atau nama bisnis Anda.</p></div>
    </div>
    {state.error && <p className="v-field-error" role="alert">{state.error}</p>}
    {!value && !state.error && <Skeleton variant="text" label="Memuat rekening…" />}
    {value && !value.business && <p className="v-modal-copy">Simpan profil bisnis di atas terlebih dahulu, lalu tautkan rekening pencairan.</p>}
    {value?.account && <dl className="vendor-orders-details" style={{ marginTop: 16 }}>
      <div><dt>Bank</dt><dd>{value.account.bank}</dd></div>
      <div><dt>Nomor rekening</dt><dd>{value.account.masked}</dd></div>
      <div><dt>Nama pemilik</dt><dd>{value.account.owner}</dd></div>
    </dl>}
    {value?.business && !value.account && <p className="v-modal-copy" role="status">Belum ada rekening tertaut. Isi rekening agar Anda bisa mencairkan dana di halaman Pencairan.</p>}
    {showForm && <form onSubmit={submit} noValidate>
      {formError && <p className="v-field-error" role="alert" style={{ marginBottom: 16 }}>{formError}</p>}
      <div className="v-form-grid">
        <div className="v-field"><label htmlFor="payout-bank">Bank</label>
          <select id="payout-bank" value={draft.bank} disabled={busy} onChange={event => setField('bank', event.target.value)}>{payoutBanks.map(bank => <option key={bank}>{bank}</option>)}</select>
          {errors.bank && <p className="v-field-error">{errors.bank}</p>}</div>
        <div className="v-field"><label htmlFor="payout-number">Nomor rekening</label>
          <input id="payout-number" inputMode="numeric" autoComplete="off" maxLength={24} disabled={busy} value={draft.number} aria-invalid={Boolean(errors.number)} placeholder="8–20 digit angka" onChange={event => setField('number', event.target.value)} />
          {errors.number && <p className="v-field-error">{errors.number}</p>}</div>
        <div className="v-field v-field-wide"><label htmlFor="payout-owner">Nama pemilik rekening</label>
          <input id="payout-owner" maxLength={120} autoComplete="off" disabled={busy} value={draft.owner} aria-invalid={Boolean(errors.owner)} placeholder="Sesuai buku tabungan" onChange={event => setField('owner', event.target.value)} />
          {errors.owner && <p className="v-field-error">{errors.owner}</p>}</div>
      </div>
      <div className="v-form-actions">
        {value.account && <button className="v-button v-button-secondary" type="button" disabled={busy} onClick={() => { setEditing(false); setErrors({}); setFormError(''); }}>Batal</button>}
        <button className="v-button v-button-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : value.account ? 'Simpan rekening baru' : 'Tautkan rekening'}</button>
      </div>
    </form>}
    {value?.account && !editing && <div className="v-form-actions" style={{ marginTop: 18, paddingTop: 16 }}><button className="v-button v-button-secondary" type="button" onClick={() => setEditing(true)}>Ganti rekening</button></div>}
  </section>;
}
