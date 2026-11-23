import React, { useState } from 'react';
import { Eye, EyeOff, User, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../AuthContext';
import { EMAIL_RE } from '../validation';

// WhatsApp wajib 08xxxxxxxxxx, bukan +62/62.
const PHONE_RE = /^08\d{8,11}$/;
const cleanPhone = (v) => v.replace(/[\s-]/g, ''); // izinkan "0812-3456-7890" / "0812 3456 7890"

const validate = ({ fullName, email, whatsapp, password, agreedToTerms }) => {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Nama wajib diisi';
  else if (fullName.trim().length > 120) errors.fullName = 'Nama maksimal 120 karakter';

  if (!EMAIL_RE.test(email.trim())) errors.email = 'Format email harus seperti example@mail.com';

  const wa = cleanPhone(whatsapp);
  if (/^(\+|62)/.test(wa)) errors.whatsapp = 'Gunakan format 08xxxx, bukan +62 atau 62';
  else if (!PHONE_RE.test(wa)) errors.whatsapp = 'Nomor WhatsApp harus diawali 08 dan 10–13 digit';

  if (password.length < 8) errors.password = 'Kata sandi minimal 8 karakter';
  else if (password.length > 72) errors.password = 'Kata sandi maksimal 72 karakter';

  if (!agreedToTerms) errors.terms = 'Setujui Syarat & Ketentuan untuk melanjutkan';
  return errors;
};

const RegisterPage = () => {
  const [accountType, setAccountType] = useState('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const errors = validate({ fullName, email, whatsapp, password, agreedToTerms });
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const fieldError = (field) =>
    touched[field] && errors[field] ? (
      <p id={`register-${field}-error`} className="auth-error">{errors[field]}</p>
    ) : null;

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, whatsapp: true, password: true, terms: true });
    if (Object.keys(errors).length > 0) return;
    setServerError('');
    setSubmitting(true);
    try {
      // daftar lalu otomatis login, kemudian ke beranda
      await register({
        role: accountType,
        nama: fullName.trim(),
        email: email.trim(),
        no_telp: cleanPhone(whatsapp),
        password,
      });
      navigate('/');
    } catch (err) {
      const detail = Object.values(err.errors ?? {}).join(', ');
      setServerError(detail ? `${err.message}: ${detail}` : err.message); // mis. 409 "Email sudah terdaftar"
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="register" badgeText="Bergabung dengan Ekosistem Vendoria" heading="Mulai sewa atau sewakan alat event dengan standar keamanan baru.">
      <div className="auth-content">
        <div className="auth-heading"><p className="auth-eyebrow">LANGKAH PENDAFTARAN</p><h2>Buat Akun Vendoria</h2><p>Mulai perjalanan event yang lebih aman dan terorganisir.</p></div>
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div>
            <p className="auth-role-label" id="register-role-label">1. Pilih Jenis Akun</p>
            <div className="auth-role-options" role="group" aria-labelledby="register-role-label">
              <button type="button" onClick={() => setAccountType('customer')} aria-pressed={accountType === 'customer'} className="auth-role"><User size={18} strokeWidth={1.6} /><span><strong>Customer / Penyewa</strong><small>Saya ingin menyewa alat event</small></span></button>
              <button type="button" onClick={() => setAccountType('vendor')} aria-pressed={accountType === 'vendor'} className="auth-role"><Sparkles size={18} strokeWidth={1.6} /><span><strong>Vendor Penyedia</strong><small>Saya ingin menyewakan alat</small></span></button>
            </div>
          </div>
          <div className="auth-identity">
            <p className="auth-identity-title">2. Lengkapi Identitas Diri</p>
            <div className="auth-field">
              <label htmlFor="register-name">{accountType === 'customer' ? 'Nama Lengkap Sesuai KTP' : 'Nama Usaha / Pemilik'}</label>
              <input id="register-name" name="nama" autoComplete="name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={() => touch('fullName')} placeholder={accountType === 'customer' ? 'Masukkan nama lengkap' : 'Masukkan nama usaha atau pemilik'} className="auth-input" aria-invalid={Boolean(touched.fullName && errors.fullName)} aria-describedby={touched.fullName && errors.fullName ? 'register-fullName-error' : undefined} />
              {fieldError('fullName')}
            </div>
            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="register-email">Email Aktif</label>
                <input id="register-email" name="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch('email')} placeholder="nama@email.com" className="auth-input" aria-invalid={Boolean(touched.email && errors.email)} aria-describedby={touched.email && errors.email ? 'register-email-error' : undefined} />
                {fieldError('email')}
              </div>
              <div className="auth-field">
                <label htmlFor="register-phone">Nomor WhatsApp</label>
                <input id="register-phone" name="no_telp" autoComplete="tel" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} onBlur={() => touch('whatsapp')} placeholder="08xx-xxxx-xxxx" className="auth-input" aria-invalid={Boolean(touched.whatsapp && errors.whatsapp)} aria-describedby={touched.whatsapp && errors.whatsapp ? 'register-whatsapp-error' : undefined} />
                {fieldError('whatsapp')}
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="register-password">Kata Sandi</label>
              <div className="auth-input-wrap">
                <input id="register-password" name="password" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => touch('password')} placeholder="Minimal 8 karakter" className="auth-input" aria-invalid={Boolean(touched.password && errors.password)} aria-describedby={touched.password && errors.password ? 'register-password-hint register-password-error' : 'register-password-hint'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-eye" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <div className="auth-strength">
                <div className="auth-strength-bars" aria-label={`Kekuatan kata sandi: ${strength} dari 4`}>
                  {[1, 2, 3, 4].map((level) => <div key={level} className={password.length > 0 && strength >= level ? strength <= 1 ? 'bg-red-400' : strength <= 2 ? 'bg-orange-400' : strength <= 3 ? 'bg-yellow-400' : 'bg-green-500' : 'bg-[#E8DDD0]'} />)}
                </div>
                <p id="register-password-hint">Gunakan 8+ karakter, huruf besar, angka, simbol</p>
              </div>
              {fieldError('password')}
            </div>
          </div>
          <div>
            <label className="auth-check auth-terms"><input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} aria-invalid={Boolean(touched.terms && errors.terms)} aria-describedby={touched.terms && errors.terms ? 'register-terms-error' : undefined} /><span>Saya menyetujui Syarat &amp; Ketentuan serta Kebijakan Privasi &amp; Deposit Vendoria.</span></label>
            {fieldError('terms')}
          </div>
          {serverError && <p role="alert" className="auth-alert">{serverError}</p>}
          <button type="submit" disabled={submitting} className="auth-submit">{submitting ? 'Memproses...' : 'Buat Akun Sekarang'}<ArrowRight size={18} /></button>
        </form>
        <p className="auth-bottom">Sudah punya akun? <a href="/login">Masuk di sini</a></p>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
