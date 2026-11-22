import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { StepIndicator } from './ForgotPasswordPage';
import { api } from '../api';

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const resetToken = useLocation().state?.resetToken;

  // Dibuka tanpa lewat verifikasi OTP: tidak ada izin reset
  if (!resetToken) return <Navigate to="/forgot-password" replace />;

  const passwordError =
    newPassword.length < 8
      ? 'Kata sandi minimal 8 karakter'
      : newPassword.length > 72
      ? 'Kata sandi maksimal 72 karakter'
      : '';
  const confirmError = newPassword !== confirmPassword ? 'Konfirmasi kata sandi tidak sama' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (passwordError || confirmError) return;
    setError('');
    setSubmitting(true);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: { reset_token: resetToken, password: newPassword },
      });
      navigate('/login', { replace: true, state: { message: 'Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.' } });
    } catch (err) {
      setError(err.message); // mis. sesi reset kedaluwarsa
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
        <StepIndicator currentStep={3} />

        {/* Section Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-[#3C2415]/60 uppercase mb-1">
            PEMULIHAN AKUN
          </p>
          <h2 className="text-2xl font-bold text-[#3C2415] mb-1">Buat kata sandi baru</h2>
          <p className="text-sm text-[#3C2415]/60">
            Gunakan kombinasi kata sandi yang kuat.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415] pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3C2415]/40 hover:text-[#3C2415] transition-colors"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched && passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
              Konfirmasi Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415] pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3C2415]/40 hover:text-[#3C2415] transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched && confirmError && <p className="text-xs text-red-500 mt-1">{confirmError}</p>}
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
            className="w-full py-3.5 bg-[#3C2415] text-white rounded-xl font-semibold text-sm hover:bg-[#3C2415]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Menyimpan...' : 'Simpan & Kembali ke Masuk'}
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

export default ResetPasswordPage;
