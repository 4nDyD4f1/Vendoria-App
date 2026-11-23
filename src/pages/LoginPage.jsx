import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../AuthContext';
import { authDestination } from '../authDestination';

// Logo "G" Google (warna resmi)
const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
);

// Kode ?error=... dari backend setelah login Google gagal
const GOOGLE_ERRORS = {
  google: 'Login dengan Google gagal atau dibatalkan. Silakan coba lagi.',
  email_belum_terverifikasi: 'Email akun Google Anda belum terverifikasi.',
  akun_google_berbeda: 'Email ini sudah tertaut ke akun Google yang lain.',
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState('masuk');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(() => GOOGLE_ERRORS[searchParams.get('error')] ?? '');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const notice = useLocation().state?.message; // mis. dari halaman reset password

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!email || !password) return;
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.two_factor_required ? '/two-factor-verification' : authDestination(user.role), { replace: true });
    } catch (err) {
      setError(err.message); // 401 salah kredensial, 429 terlalu banyak percobaan, dll.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="login" badgeText="Vendoria Secure" heading="Platform sewa alat event paling aman untuk acaramu.">
      <div className="auth-content">
        {/* <nav className="auth-tabs" aria-label="Akses akun"><a href="/login" aria-current="page">Masuk</a><a href="/register">Daftar Akun</a></nav> */}
        <div className="auth-heading"><p className="auth-eyebrow">SELAMAT DATANG KEMBALI</p><h2>Masuk ke Vendoria</h2><p>Masukkan email dan kata sandi akunmu yang sudah terdaftar.</p></div>
        {notice && <p role="status" className="auth-notice">{notice}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" autoComplete="username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} placeholder="contoh: examplea@mail.com" className="auth-input" aria-invalid={touched.email && !email} aria-describedby={touched.email && !email ? 'login-email-error' : undefined} />
            {touched.email && !email && <p id="login-email-error" className="auth-error">Email wajib diisi</p>}
          </div>
          <div className="auth-field">
            <div className="auth-field-heading"><label htmlFor="login-password">Kata Sandi</label><a href="/forgot-password">Lupa password?</a></div>
            <div className="auth-input-wrap">
              <input id="login-password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} placeholder="Masukkan kata sandi" className="auth-input" aria-invalid={touched.password && !password} aria-describedby={touched.password && !password ? 'login-password-error' : undefined} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-eye" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {touched.password && !password && <p id="login-password-error" className="auth-error">Kata sandi wajib diisi</p>}
          </div>
          <label className="auth-check"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><span>Ingat saya di perangkat ini</span></label>
          {error && <p role="alert" className="auth-alert">{error}</p>}
          <button type="submit" disabled={submitting} className="auth-submit">{submitting ? 'Memproses...' : 'Masuk Sekarang'}<ArrowRight size={18} /></button>
        </form>
        <div className="auth-divider">atau masuk cepat dengan</div>
        {/* Full navigation is required for the backend Google OAuth handshake. */}
        <a href="/oauth2/authorization/google" aria-label="Masuk dengan Google" title="Masuk dengan Google" className="auth-google"><GoogleIcon /><span>Masuk dengan Google</span></a>
        <p className="auth-bottom">Belum punya akun? <a href="/register">Daftar sebagai Customer atau Vendor</a></p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
