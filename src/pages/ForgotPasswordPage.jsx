import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { api } from '../api';
import { EMAIL_RE } from '../validation';

const StepIndicator = ({ currentStep }) => {
  const steps = [1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step === currentStep
                ? 'bg-[#3C2415] text-white'
                : step < currentStep
                ? 'bg-[#3C2415] text-white'
                : 'bg-[#F0E8DE] text-[#3C2415]/50'
            }`}
          >
            {step}
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 ${
                step < currentStep ? 'bg-[#3C2415]' : 'bg-[#E8DDD0]'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const emailInvalid = !EMAIL_RE.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (emailInvalid) return;
    setError('');
    setSubmitting(true);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      navigate('/otp-verification', { state: { email: email.trim() } });
    } catch (err) {
      setError(err.message); // 404 email tidak terdaftar, 429 terlalu sering, 502/503 email gagal
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      badgeText="Pemulihan Akun Aman"
      heading="Kembalikan akses akunmu dengan proses verifikasi yang terlindungi."
    >
      <div className="w-full max-w-md mx-auto">
        <StepIndicator currentStep={1} />

        {/* Section Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-[#3C2415]/60 uppercase mb-1">
            PEMULIHAN AKUN
          </p>
          <h2 className="text-2xl font-bold text-[#3C2415] mb-1">Lupa kata sandi?</h2>
          <p className="text-sm text-[#3C2415]/60">
            Kami akan mengirim kode verifikasi ke email terdaftar.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415]"
            />
            {touched && emailInvalid && (
              <p className="text-xs text-red-500 mt-1">Format email harus seperti example@mail.com</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#3C2415] text-white rounded-xl font-semibold text-sm hover:bg-[#3C2415]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Mengirim...' : 'Kirim Kode'}
            <ArrowRight size={16} />
          </button>
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

export { StepIndicator };
export default ForgotPasswordPage;
