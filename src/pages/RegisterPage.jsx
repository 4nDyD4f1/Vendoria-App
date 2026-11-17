import React, { useState } from 'react';
import { Eye, EyeOff, User, Sparkles, ArrowRight } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const RegisterPage = () => {
  const [accountType, setAccountType] = useState('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = (e) => {
    e.preventDefault();
    // handle registration
  };

  return (
    <AuthLayout
      badgeText="Bergabung dengan Ekosistem Vendoria"
      heading="Mulai sewa atau sewakan alat event dengan standar keamanan baru."
    >
      <div className="w-full max-w-md mx-auto">
        {/* Section Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-[#3C2415]/60 uppercase mb-1">
            LANGKAH PENDAFTARAN
          </p>
          <h2 className="text-2xl font-bold text-[#3C2415] mb-1">Buat Akun Vendoria</h2>
          <p className="text-sm text-[#3C2415]/60">
            Isi data berikut untuk memulai pengalaman penyewaan yang aman.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1 - Account Type */}
          <div>
            <p className="text-sm font-semibold text-[#3C2415] mb-3">1. Pilih Jenis Akun</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType('customer')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  accountType === 'customer'
                    ? 'border-[#3C2415] bg-[#FAF6F1]'
                    : 'border-[#E8DDD0] bg-white hover:border-[#3C2415]/30'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    accountType === 'customer'
                      ? 'bg-[#3C2415] text-white'
                      : 'bg-[#F0E8DE] text-[#3C2415]'
                  }`}
                >
                  <User size={18} />
                </div>
                <span className="text-sm font-semibold text-[#3C2415]">Customer / Penyewa</span>
                <span className="text-xs text-[#3C2415]/50 text-center">
                  Saya ingin menyewa alat event
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('vendor')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  accountType === 'vendor'
                    ? 'border-[#3C2415] bg-[#FAF6F1]'
                    : 'border-[#E8DDD0] bg-white hover:border-[#3C2415]/30'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    accountType === 'vendor'
                      ? 'bg-[#3C2415] text-white'
                      : 'bg-[#F0E8DE] text-[#3C2415]'
                  }`}
                >
                  <Sparkles size={18} />
                </div>
                <span className="text-sm font-semibold text-[#3C2415]">Vendor Penyedia</span>
                <span className="text-xs text-[#3C2415]/50 text-center">
                  Saya ingin menyewakan alat
                </span>
              </button>
            </div>
          </div>

          {/* Step 2 - Identity */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[#3C2415]">2. Lengkapi Identitas Diri</p>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
                {accountType === 'customer'
                  ? 'Nama Lengkap Sesuai KTP'
                  : 'Nama Usaha / Pemilik'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={
                  accountType === 'customer'
                    ? 'Masukkan nama lengkap'
                    : 'Masukkan nama usaha atau pemilik'
                }
                className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415]"
              />
            </div>

            {/* Email + WhatsApp */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
                  Email Aktif
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3C2415] mb-1.5">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="08xx-xxxx-xxxx"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#3C2415] placeholder:text-[#3C2415]/40 focus:outline-none focus:ring-2 focus:ring-[#3C2415]/20 focus:border-[#3C2415]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#3C2415] mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat kata sandi"
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
              {/* Strength Indicator */}
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length > 0 && strength >= level
                        ? strength <= 1
                          ? 'bg-red-400'
                          : strength <= 2
                          ? 'bg-orange-400'
                          : strength <= 3
                          ? 'bg-yellow-400'
                          : 'bg-green-500'
                        : 'bg-[#E8DDD0]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#3C2415]/50 mt-1.5">
                Gunakan 8+ karakter, huruf besar, angka, simbol
              </p>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-[#E8DDD0] text-[#3C2415] focus:ring-[#3C2415]/20 accent-[#3C2415]"
            />
            <span className="text-sm text-[#3C2415]/70 leading-snug">
              Saya menyetujui{' '}
              <a href="#" className="text-[#3C2415] font-semibold hover:underline">
                Syarat &amp; Ketentuan
              </a>{' '}
              serta{' '}
              <a href="#" className="text-[#3C2415] font-semibold hover:underline">
                Kebijakan Privasi &amp; Deposit
              </a>{' '}
              Vendoria.
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#3C2415] text-white rounded-xl font-semibold text-sm hover:bg-[#3C2415]/90 transition-colors flex items-center justify-center gap-2"
          >
            Buat Akun Sekarang
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Bottom Link */}
        <p className="text-center text-sm text-[#3C2415]/60 mt-6">
          Sudah punya akun?{' '}
          <a href="/login" className="text-[#3C2415] font-semibold hover:underline">
            Masuk di sini
          </a>
        </p>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
