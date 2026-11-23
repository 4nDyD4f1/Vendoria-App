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
    <AuthLayout badgeText="Pemulihan Akun Aman" heading="Kembalikan akses akunmu dengan proses verifikasi yang terlindungi.">
      <div className="auth-content">
        <StepIndicator currentStep={3} />
        <div className="auth-heading"><p className="auth-eyebrow">PEMULIHAN AKUN</p><h2>Buat kata sandi baru</h2><p>Gunakan kombinasi kata sandi yang kuat.</p></div>
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-field">
            <label htmlFor="reset-password">Kata Sandi Baru</label>
            <div className="auth-input-wrap">
              <input id="reset-password" name="password" autoComplete="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter" className="auth-input" aria-invalid={Boolean(touched && passwordError)} aria-describedby={touched && passwordError ? 'reset-password-error' : undefined} />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="auth-eye" aria-label={showNewPassword ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'} aria-pressed={showNewPassword}>{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {touched && passwordError && <p id="reset-password-error" className="auth-error">{passwordError}</p>}
          </div>
          <div className="auth-field">
            <label htmlFor="reset-confirm">Konfirmasi Kata Sandi</label>
            <div className="auth-input-wrap">
              <input id="reset-confirm" name="confirmPassword" autoComplete="new-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi kata sandi" className="auth-input" aria-invalid={Boolean(touched && confirmError)} aria-describedby={touched && confirmError ? 'reset-confirm-error' : undefined} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-eye" aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {touched && confirmError && <p id="reset-confirm-error" className="auth-error">{confirmError}</p>}
          </div>
          {error && <p role="alert" className="auth-alert">{error}</p>}
          <button type="submit" disabled={submitting} className="auth-submit">{submitting ? 'Menyimpan...' : 'Simpan & Kembali ke Masuk'}</button>
        </form>
        <a href="/login" className="auth-back"><ArrowLeft size={12} />Kembali ke Masuk</a>
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
