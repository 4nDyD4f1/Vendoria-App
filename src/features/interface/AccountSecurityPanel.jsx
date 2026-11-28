import { useContext, useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import DesignNode from './DesignNode';
import { InterfaceContext } from './InterfaceContext';
import { accountFields } from './accountDesign';
import Skeleton from '../../components/Skeleton';

const passwordIds = { current_password: '109:14725', password: '109:14731', confirm_password: '109:14737' };

export default function AccountSecurityPanel({ content, page }) {
  const context = useContext(InterfaceContext);
  const navigate = useNavigate();
  const notice = useLocation().state?.message;
  const [security, setSecurity] = useState(null);
  const [loadingError, setLoadingError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(notice ? { text: notice } : null);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    api('/api/account/security').then(value => { if (active) setSecurity(value); })
      .catch(error => { if (active) setLoadingError(error.message); });
    return () => { active = false; };
  }, []);

  const savePassword = async event => {
    event.preventDefault();
    if (pending.current || !security) return;
    const body = Object.fromEntries(Object.entries(passwordIds).map(([field, id]) => [field, fields[`account-security:${id}`] || '']));
    if (security.password_dibuat !== true) delete body.current_password;
    if (body.password !== body.confirm_password) { setMessage({ error: true, text: 'Konfirmasi password tidak sama.' }); return; }
    pending.current = true; setBusy(true); setMessage(null);
    try {
      const result = await api('/api/account/security/password', { method: 'PUT', body });
      setFields({});
      if (result.two_factor_required) navigate('/two-factor-verification');
      else { setSecurity(result); setMessage({ text: 'Password berhasil diperbarui.' }); }
    } catch (error) { setMessage({ error: true, text: error.message }); }
    finally { pending.current = false; setBusy(false); }
  };

  const configureTwoFactor = async () => {
    if (pending.current || !security) return;
    pending.current = true; setBusy(true); setMessage(null);
    try {
      await api('/api/account/security/two-factor', { method: 'POST', body: { enabled: !security.two_factor_email } });
      navigate('/two-factor-verification');
    } catch (error) { setMessage({ error: true, text: error.message }); }
    finally { pending.current = false; setBusy(false); }
  };

  if (!security) return loadingError ? <p role="alert">{loadingError}</p> : <Skeleton variant="detail" label="Memuat pengaturan keamanan…" />;
  const create = security.password_dibuat !== true;
  const [passwordSection] = content.children;
  const securityContext = {
    ...context, fields, setFields, submitNodeId: '109:14739',
    controlLabels: { '109:14739': create ? 'Buat Password' : 'Perbarui Password' },
    hidden: { ...context.hidden, '109:14741': create },
    profileFields: {
      [passwordIds.current_password]: { required: !create, maxLength: 72, autoComplete: 'current-password' },
      [passwordIds.password]: { required: true, minLength: 8, maxLength: 72 },
      [passwordIds.confirm_password]: { required: true, minLength: 8, maxLength: 72 },
    },
    formatText: (text, ancestors) => {
      if (text === 'Ubah Password' && create) return 'Buat Password';
      if (text === 'Perbarui Password') return busy ? 'Memproses…' : create ? 'Buat Password' : text;
      return context.formatText(text, ancestors);
    },
  };

  return <InterfaceContext.Provider value={securityContext}>
    <div className="account-security-grid" aria-busy={busy}>
      <form onSubmit={savePassword} aria-label={create ? 'Buat Password' : 'Ubah Password'} onChange={() => setMessage(null)}>
        <fieldset disabled={busy} className="account-profile-fields"><DesignNode node={accountFields(passwordSection)} ancestors={[page, content]} /></fieldset>
        {create && <p className="account-security-help">Verifikasi email diperlukan untuk membuat password.</p>}
      </form>
      <section className="account-security-card">
        <div className="account-security-icon" aria-hidden="true"><ShieldCheck size={22} /></div>
        <h2>Autentikasi dua langkah (OTP Email)</h2>
        <p>Kode OTP dikirim ke email <strong>{security.email}</strong> setiap kali login.</p>
        <div className="account-toggle-row">
          <div>
            <strong>Verifikasi OTP saat login</strong>
            <small>{security.two_factor_email ? 'Aktif' : 'Belum diaktifkan'}</small>
          </div>
          <button
            type="button"
            className="account-switch"
            role="switch"
            disabled={busy}
            aria-checked={security.two_factor_email}
            aria-label="Autentikasi dua langkah via email"
            onClick={configureTwoFactor}
          >
            <span />
          </button>
        </div>
      </section>
    </div>
    {message && <p className={`account-profile-message${message.error ? ' account-profile-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
  </InterfaceContext.Provider>;
}
