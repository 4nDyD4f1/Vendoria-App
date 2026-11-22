import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState('masuk');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState('');
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
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message); // 401 salah kredensial, 429 terlalu banyak percobaan, dll.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      badgeText="Vendoria Secure"
      heading="Platform sewa alat event paling aman untuk acaramu."
    >
      <div className="w-full max-w-md mx-auto">
        {/* Tab Switcher */}
        {/* <div className="flex rounded-xl overflow-hidden border border-[#E8DDD0] mb-8">
          <button
            onClick={() => setActiveTab('masuk')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'masuk'
                ? 'bg-[#3C2415] text-white'
                : 'bg-[#FAF6F1] text-[#3C2415] hover:bg-[#F0E8DE]'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => setActiveTab('daftar')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'daftar'
                ? 'bg-[#3C2415] text-white'
                : 'bg-[#FAF6F1] text-[#3C2415] hover:bg-[#F0E8DE]'
            }`}
          >
            Daftar Akun
          </button>
        </div> */}

        {/* Section Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-[#3C2415]/60 uppercase mb-1">
            SELAMAT DATANG KEMBALI
          </p>
          <h2 className="text-2xl font-bold text-[#3C2415] mb-1">Masuk ke Vendoria</h2>
          <p className="text-sm text-[#3C2415]/60">
            Akses dashboard dan kelola penyewaanmu dengan aman.
          </p>
        </div>

        {notice && (
          <p role="status" className="mb-5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
              Alamat Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="contoh: bagas.arya@ipb.ac.id"
              className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415]"
            />
            {touched.email && !email && (
              <p className="text-xs text-red-500 mt-1">Email wajib diisi</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[#3C2415]">Kata Sandi</label>
              <a
                href="/forgot-password"
                className="text-xs text-[#3C2415]/60 hover:text-[#3C2415] transition-colors"
              >
                Lupa password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="Masukkan kata sandi"
                className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415] pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3C2415]/40 hover:text-[#3C2415] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.password && !password && (
              <p className="text-xs text-red-500 mt-1">Kata sandi wajib diisi</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#E8DDD0] text-[#3C2415] focus:ring-[#3C2415]/20 accent-[#3C2415]"
              />
              <span className="text-sm text-[#3C2415]">Ingat saya di perangkat ini</span>
            </label>
            {/* <span className="text-xs text-[#3C2415]/50">Sesi 30 hari</span> */}
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
            {submitting ? 'Memproses...' : 'Masuk Sekarang'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#E8DDD0]" />
          <span className="text-xs text-[#3C2415]/50">atau masuk cepat dengan demo</span>
          <div className="flex-1 h-px bg-[#E8DDD0]" />
        </div>

        {/* Demo Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['Customer Demo', 'Vendor Demo', 'Admin Demo'].map((label) => (
            <button
              key={label}
              className="py-2.5 px-3 rounded-xl border border-[#E8DDD0] text-sm font-medium text-[#3C2415] hover:bg-[#F0E8DE] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bottom Link */}
        <p className="text-center text-sm text-[#3C2415]/60">
          Belum punya akun?{' '}
          <a href="/register" className="text-[#3C2415] font-semibold hover:underline">
            Daftar sebagai Customer
          </a>{' '}
          atau{' '}
          <a href="/register" className="text-[#3C2415] font-semibold hover:underline">
            Vendor
          </a>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
