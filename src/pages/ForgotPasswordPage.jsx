import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { api } from '../api';
import { EMAIL_RE } from '../validation';

const StepIndicator = ({ currentStep }) => {
  const steps = [1, 2, 3];
  return (
    <div className="auth-steps" role="group" aria-label={`Pemulihan akun: langkah ${currentStep} dari 3`}>
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <div
            className={`auth-step ${step <= currentStep ? 'is-complete' : ''}`}
            aria-current={step === currentStep ? 'step' : undefined}
          >
            {step}
          </div>
          {idx < steps.length - 1 && (
            <div
              className="auth-step-line"
              aria-hidden="true"
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
      setError(err.message); // 429 terlalu sering, 502/503 email gagal
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout badgeText="Pemulihan Akun Aman" heading="Kembalikan akses akunmu dengan proses verifikasi yang terlindungi.">
      <div className="auth-content">
        <StepIndicator currentStep={1} />
        <div className="auth-heading"><p className="auth-eyebrow">PEMULIHAN AKUN</p><h2>Lupa kata sandi?</h2><p>Kami akan mengirim kode verifikasi ke email terdaftar.</p></div>
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-field">
            <label htmlFor="recovery-email">Email</label>
            <input id="recovery-email" name="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} placeholder="nama@email.com" className="auth-input" aria-invalid={touched && emailInvalid} aria-describedby={touched && emailInvalid ? 'recovery-email-error' : undefined} />
            {touched && emailInvalid && <p id="recovery-email-error" className="auth-error">Format email harus seperti example@mail.com</p>}
          </div>
          {error && <p role="alert" className="auth-alert">{error}</p>}
          <button type="submit" disabled={submitting} className="auth-submit">{submitting ? 'Mengirim...' : 'Kirim Kode'}<ArrowRight size={18} /></button>
        </form>
        <a href="/login" className="auth-back"><ArrowLeft size={12} />Kembali ke Masuk</a>
      </div>
    </AuthLayout>
  );
};

export { StepIndicator };
export default ForgotPasswordPage;
