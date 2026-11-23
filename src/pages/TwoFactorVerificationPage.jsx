import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const purposeCopy = {
  login: 'menyelesaikan login', enable: 'mengaktifkan autentikasi 2 langkah',
  disable: 'menonaktifkan autentikasi 2 langkah', password: 'membuat password akun',
};
const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

// Tampilan dan interaksi OTP mengikuti halaman pemulihan; endpoint dan bukti verifikasi terpisah.
export default function TwoFactorVerificationPage() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const inputRefs = useRef([]);
  const pending = useRef(false);
  const navigate = useNavigate();
  const { verifyTwoFactor, user } = useAuth();

  useEffect(() => {
    let active = true;
    api('/api/auth/two-factor').then(value => { if (active) setChallenge(value); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(challenge?.resend_after || 0).getTime() - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [challenge]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    setOtp(current => current.map((digit, i) => i === index ? value : digit));
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };
  const handlePaste = event => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(Array.from({ length: 6 }, (_, i) => pasted[i] || ''));
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (pending.current) return;
    const code = otp.join('');
    if (code.length !== 6) { setError('Masukkan 6 digit kode OTP'); return; }
    pending.current = true;
    setSubmitting(true); setError(''); setInfo('');
    try {
      const result = await verifyTwoFactor(code);
      navigate(result.redirect, { replace: true, state: { message: challenge.purpose === 'password' ? 'Password berhasil dibuat.' : 'Pengaturan keamanan berhasil diperbarui.' } });
    } catch (err) {
      setError(err.message);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
      if (err.status === 401) setChallenge(null);
    } finally { pending.current = false; setSubmitting(false); }
  };
  const handleResend = async () => {
    if (pending.current) return;
    pending.current = true;
    setResending(true); setError(''); setInfo('');
    try {
      setChallenge(await api('/api/auth/two-factor/resend', { method: 'POST' }));
      setOtp(Array(6).fill(''));
      setInfo('Kode baru telah dikirim ke email Anda.');
    } catch (err) {
      setError(err.message);
      if (err.status === 401) setChallenge(null);
    } finally { pending.current = false; setResending(false); }
  };

  return <AuthLayout badgeText="Verifikasi Keamanan Akun" heading="Lindungi akses akunmu dengan verifikasi email.">
    <div className="auth-content">
      <div className="auth-heading"><p className="auth-eyebrow">VERIFIKASI KEAMANAN</p><h2>Verifikasi kode OTP</h2>
        {challenge && <p>Masukkan kode 6 digit yang dikirim ke <strong>{challenge.email}</strong> untuk {purposeCopy[challenge.purpose]}.</p>}
      </div>
      {loading && <p role="status">Memuat verifikasi…</p>}
      {challenge && <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-otp-boxes" onPaste={handlePaste} role="group" aria-label="Kode OTP 6 digit">
          {otp.map((digit, index) => <input key={index} ref={element => { inputRefs.current[index] = element; }} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} value={digit} disabled={submitting || resending} onChange={event => handleChange(index, event.target.value)} onKeyDown={event => { if (event.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus(); }} aria-label={`Digit OTP ${index + 1}`} className="auth-input" />)}
        </div>
        <div className="auth-otp-timer"><Clock size={14} strokeWidth={1.6} />{secondsLeft > 0 ? <><span>Kirim ulang kode dalam</span><span role="timer" aria-live="off">{formatTime(secondsLeft)}</span></> : <span>Anda bisa mengirim ulang kode sekarang.</span>}</div>
        {error && <p role="alert" className="auth-alert">{error}</p>}
        {info && <p role="status" className="auth-notice">{info}</p>}
        <button type="submit" disabled={submitting || resending} className="auth-submit">{submitting ? 'Memverifikasi...' : 'Verifikasi OTP'}<ArrowRight size={18} /></button>
        <p className="auth-resend">Belum menerima kode? <button type="button" onClick={handleResend} disabled={submitting || resending || secondsLeft > 0}>{resending ? 'Mengirim...' : 'Kirim ulang kode'}</button></p>
      </form>}
      {!challenge && error && <p role="alert" className="auth-alert">{error}</p>}
      <Link to={user ? '/akun/keamanan' : '/login'} className="auth-back"><ArrowLeft size={12} />{user ? 'Kembali ke Keamanan' : 'Kembali ke Masuk'}</Link>
    </div>
  </AuthLayout>;
}
