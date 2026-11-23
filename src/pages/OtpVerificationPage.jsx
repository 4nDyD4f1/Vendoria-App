import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { StepIndicator } from './ForgotPasswordPage';
import { api } from '../api';

const RESEND_SECONDS = 60;
const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const OtpVerificationPage = () => {
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const email = useLocation().state?.email;

  // Hitung mundur sebelum kode boleh dikirim ulang (sama dengan jeda 60 dtk di backend).
  // Berbasis tenggat waktu, bukan dikurangi 1 per tick, agar tetap akurat saat tab tidak aktif.
  const [deadline, setDeadline] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) clearInterval(id);
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [deadline]);

  // Dibuka langsung tanpa melalui /forgot-password: tidak tahu email mana yang diverifikasi
  if (!email) return <Navigate to="/forgot-password" replace />;

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const { reset_token } = await api('/api/auth/verify-otp', { method: 'POST', body: { email, otp: code } });
      navigate('/reset-password', { state: { resetToken: reset_token }, replace: true });
    } catch (err) {
      setError(err.message);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setOtp(Array(6).fill(''));
      setDeadline(Date.now() + RESEND_SECONDS * 1000);
      setInfo('Kode baru telah dikirim ke email Anda.');
    } catch (err) {
      setError(err.message); // mis. 429 "Coba lagi dalam N detik"
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout badgeText="Pemulihan Akun Aman" heading="Kembalikan akses akunmu dengan proses verifikasi yang terlindungi.">
      <div className="auth-content">
        <StepIndicator currentStep={2} />
        <div className="auth-heading"><p className="auth-eyebrow">PEMULIHAN AKUN</p><h2>Verifikasi kode OTP</h2><p>Masukkan kode 6 digit yang telah dikirim ke <strong>{email}</strong>.</p></div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-otp-boxes" onPaste={handlePaste} role="group" aria-label="Kode OTP 6 digit">
            {otp.map((digit, index) => <input key={index} ref={(el) => (inputRefs.current[index] = el)} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} value={digit} onChange={(e) => handleChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)} aria-label={`Digit OTP ${index + 1}`} className="auth-input" />)}
          </div>
          <div className="auth-otp-timer"><Clock size={14} strokeWidth={1.6} />{secondsLeft > 0 ? <><span>Kirim ulang kode dalam</span><span role="timer" aria-live="off">{formatTime(secondsLeft)}</span></> : <span>Anda bisa mengirim ulang kode sekarang.</span>}</div>
          {error && <p role="alert" className="auth-alert">{error}</p>}
          {info && <p role="status" className="auth-notice">{info}</p>}
          <button type="submit" disabled={submitting} className="auth-submit">{submitting ? 'Memverifikasi...' : 'Verifikasi OTP'}<ArrowRight size={18} /></button>
          <p className="auth-resend">Belum menerima kode? <button type="button" onClick={handleResend} disabled={resending || secondsLeft > 0}>{resending ? 'Mengirim...' : 'Kirim ulang kode'}</button></p>
        </form>
        <a href="/login" className="auth-back"><ArrowLeft size={12} />Kembali ke Masuk</a>
      </div>
    </AuthLayout>
  );
};

export default OtpVerificationPage;
