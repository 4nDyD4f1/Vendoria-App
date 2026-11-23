import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import DesignNode from './DesignNode';
import { InterfaceContext } from './InterfaceContext';
import { accountFields } from './accountDesign';

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

  if (!security) return <p role={loadingError ? 'alert' : 'status'}>{loadingError || 'Memuat pengaturan keamanan…'}</p>;
  const create = security.password_dibuat !== true;
  const [passwordSection, twoFactorSection] = content.children;
  const securityContext = {
    ...context, fields, setFields, submitNodeId: '109:14739',
    controlLabels: { '109:14739': create ? 'Buat Password' : 'Perbarui Password', '109:14752': security.two_factor_email ? 'Nonaktifkan' : 'Aktifkan' },
    hidden: { ...context.hidden, '109:14741': create },
    profileFields: {
      [passwordIds.current_password]: { required: !create, maxLength: 72, autoComplete: 'current-password' },
      [passwordIds.password]: { required: true, minLength: 8, maxLength: 72 },
      [passwordIds.confirm_password]: { required: true, minLength: 8, maxLength: 72 },
    },
    formatText: (text, ancestors) => {
      if (text === 'Ubah Password' && create) return 'Buat Password';
      if (text === 'Perbarui Password') return busy ? 'Memproses…' : create ? 'Buat Password' : text;
      if (text === 'Kode OTP dikirim ke WhatsApp setiap login dari perangkat baru.') return `Kode OTP dikirim ke email ${security.email} setiap kali login.`;
      if (text === '2FA Aktif') return security.two_factor_email ? '2FA Email Aktif' : '2FA Email Nonaktif';
      if (text === 'Nonaktifkan') return security.two_factor_email ? 'Nonaktifkan' : 'Aktifkan';
      return context.formatText(text, ancestors);
    },
    action: args => {
      if (args.node.id === '109:14752') configureTwoFactor();
      else context.action(args);
    },
  };

  return <InterfaceContext.Provider value={securityContext}>
    <div className="account-security-grid" aria-busy={busy} data-two-factor={security.two_factor_email}>
      <form onSubmit={savePassword} aria-label={create ? 'Buat Password' : 'Ubah Password'} onChange={() => setMessage(null)}>
        <fieldset disabled={busy} className="account-profile-fields"><DesignNode node={accountFields(passwordSection)} ancestors={[page, content]} /></fieldset>
        {create && <p className="account-security-help">Verifikasi email diperlukan untuk membuat password.</p>}
      </form>
      <div><fieldset disabled={busy} className="account-profile-fields"><DesignNode node={twoFactorSection} ancestors={[page, content]} /></fieldset>
        <p className="account-security-help">Perubahan pengaturan dikonfirmasi melalui OTP email.</p>
      </div>
    </div>
    {message && <p className={`account-profile-message${message.error ? ' account-profile-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
  </InterfaceContext.Provider>;
}
