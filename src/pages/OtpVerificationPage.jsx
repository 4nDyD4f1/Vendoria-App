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
    <AuthLayout
      badgeText="Pemulihan Akun Aman"
      heading="Kembalikan akses akunmu dengan proses verifikasi yang terlindungi."
    >
      <div className="w-full max-w-md mx-auto">
        <StepIndicator currentStep={2} />

        {/* Section Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-[#3C2415]/60 uppercase mb-1">
            PEMULIHAN AKUN
          </p>
          <h2 className="text-2xl font-bold text-[#3C2415] mb-1">Verifikasi kode OTP</h2>
          <p className="text-sm text-[#3C2415]/60">
            Masukkan kode 6 digit yang telah dikirim ke <span className="font-semibold text-[#3C2415]">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input Boxes */}
          <div className="bg-[#FAF6F1] rounded-2xl p-6">
            {/* Countdown kirim ulang */}
            <div className="flex items-center justify-center gap-2 mb-5 text-xs text-[#3C2415]/60">
              <Clock size={14} strokeWidth={1.8} />
              {secondsLeft > 0 ? (
                <>
                  <span>Kirim ulang kode dalam</span>
                  <span
                    role="timer"
                    aria-live="off"
                    className="min-w-14 text-center px-3 py-1 rounded-full bg-white border border-[#E8DDD0] text-sm font-bold tabular-nums text-[#3C2415]"
                  >
                    {formatTime(secondsLeft)}
                  </span>
                </>
              ) : (
                <span>Belum menerima kode? Anda bisa mengirim ulang sekarang.</span>
              )}
            </div>
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  placeholder="—"
                  className="w-12 h-14 text-center text-xl font-bold text-[#3C2415] bg-white border-2 border-[#E8DDD0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415] placeholder:text-[#E8DDD0]"
                />
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              {info}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#3C2415] text-white rounded-xl font-semibold text-sm hover:bg-[#3C2415]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Memverifikasi...' : 'Verifikasi OTP'}
            <ArrowRight size={16} />
          </button>

          <p className="text-center text-sm text-[#3C2415]/60">
            Belum menerima kode?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || secondsLeft > 0}
              className="text-[#3C2415] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
            >
              {resending ? 'Mengirim...' : 'Kirim ulang kode'}
            </button>
          </p>
        </form>

        {/* Back Link */}
        <a
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-[#3C2415]/60 hover:text-[#3C2415] transition-colors mt-6"
        >
          <ArrowLeft size={14} />
          Kembali ke Masuk
        </a>
      </div>
    </AuthLayout>
  );
};

export default OtpVerificationPage;
