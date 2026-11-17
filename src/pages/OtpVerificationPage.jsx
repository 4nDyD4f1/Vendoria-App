import React, { useState, useRef } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { StepIndicator } from './ForgotPasswordPage';

const OtpVerificationPage = () => {
  const [otp, setOtp] = useState(Array(6).fill(''));
  const inputRefs = useRef([]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    // handle verify OTP
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
            Masukkan kode 6 digit yang telah dikirim.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Input Boxes */}
          <div className="bg-[#FAF6F1] rounded-2xl p-6">
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

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#3C2415] text-white rounded-xl font-semibold text-sm hover:bg-[#3C2415]/90 transition-colors flex items-center justify-center gap-2"
          >
            Verifikasi OTP
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

export default OtpVerificationPage;
