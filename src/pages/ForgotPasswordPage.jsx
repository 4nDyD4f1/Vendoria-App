import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

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
  const [contact, setContact] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contact) return;
    // handle send code
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
            Kami akan mengirim kode verifikasi ke kontak terdaftar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contact Input */}
          <div>
            <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
              Email atau Nomor WhatsApp
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415]"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#3C2415] text-white rounded-xl font-semibold text-sm hover:bg-[#3C2415]/90 transition-colors flex items-center justify-center gap-2"
          >
            Kirim Kode
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
