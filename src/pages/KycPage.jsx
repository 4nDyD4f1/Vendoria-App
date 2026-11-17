import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ShieldCheck,
  Camera,
  User,
  Lock,
  CheckCircle2,
  XCircle,
  Check,
  AlertTriangle,
  Handshake,
  DollarSign,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'unverified', label: 'Belum Terverifikasi' },
  { key: 'pending', label: 'Menunggu Verifikasi' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'rejected', label: 'Ditolak' },
];

export default function KycPage() {
  const [activeStatus, setActiveStatus] = useState('unverified');
  const [form, setForm] = useState({
    namaLengkap: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [ktpFile, setKtpFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-brown-50 border-b border-brown-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-brown-500">
            <Link to="/" className="hover:text-brown-800 transition-colors">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <span className="hover:text-brown-800 transition-colors cursor-pointer">
              Akun Saya
            </span>
            <ChevronRight size={14} />
            <span className="text-brown-800 font-medium">Verifikasi KYC</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <span className="inline-block text-xs font-semibold tracking-widest text-brown-500 uppercase mb-2">
              Keamanan Identitas
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-brown-800 mb-1">
              Verifikasi KYC Identitas
            </h1>
            <p className="text-brown-500 text-sm">
              Selesaikan verifikasi untuk mulai booking alat dengan aman.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brown-100 text-sm font-medium text-brown-700 whitespace-nowrap">
            <User size={16} />
            Peran: Customer / Penyewa
          </span>
        </div>

        {/* Status Simulation Bar */}
        <div className="bg-brown-50 border border-brown-200 rounded-xl p-4 mb-8">
          <p className="text-xs font-medium text-brown-500 mb-3">
            Mode Simulasi Pratinjau Status
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeStatus === tab.key
                    ? 'bg-brown-800 text-white'
                    : 'bg-white text-brown-600 border border-brown-200 hover:bg-brown-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT COLUMN - Main Form */}
          <div className="flex-1 lg:max-w-[63%]">
            {/* Section 1: Data Pribadi */}
            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brown-800 text-white text-sm font-bold shrink-0">
                  1
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-brown-800">
                    Data Pribadi Sesuai KTP
                  </h2>
                  <p className="text-sm text-brown-500">
                    Pastikan seluruh data sama dengan dokumen resmi.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Row 1: Nama & NIK */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      name="namaLengkap"
                      value={form.namaLengkap}
                      onChange={handleChange}
                      placeholder="Sesuai KTP"
                      className="w-full px-4 py-2.5 rounded-lg bg-brown-50 border border-brown-200 text-brown-800 placeholder:text-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">
                      NIK (16 digit)
                    </label>
                    <input
                      type="text"
                      name="nik"
                      value={form.nik}
                      onChange={handleChange}
                      maxLength={16}
                      placeholder="Nomor Induk Kependudukan"
                      className="w-full px-4 py-2.5 rounded-lg bg-brown-50 border border-brown-200 text-brown-800 placeholder:text-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-300 text-sm"
                    />
                  </div>
                </div>

                {/* Row 2: Tempat & Tanggal Lahir */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      name="tempatLahir"
                      value={form.tempatLahir}
                      onChange={handleChange}
                      placeholder="Kota / Kabupaten"
                      className="w-full px-4 py-2.5 rounded-lg bg-brown-50 border border-brown-200 text-brown-800 placeholder:text-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      name="tanggalLahir"
                      value={form.tanggalLahir}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-brown-50 border border-brown-200 text-brown-800 placeholder:text-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-300 text-sm"
                    />
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">
                    Alamat Lengkap
                  </label>
                  <textarea
                    name="alamat"
                    value={form.alamat}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Alamat lengkap sesuai KTP"
                    className="w-full px-4 py-2.5 rounded-lg bg-brown-50 border border-brown-200 text-brown-800 placeholder:text-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-300 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Upload Dokumen */}
            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brown-800 text-white text-sm font-bold shrink-0">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-brown-800">
                    Unggah Dokumen Verifikasi
                  </h2>
                  <p className="text-sm text-brown-500">
                    Format JPG/PNG, maksimal 5MB per file.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KTP Upload */}
                <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-brown-300 rounded-xl cursor-pointer hover:border-brown-500 hover:bg-brown-50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-brown-100 flex items-center justify-center">
                    <Camera size={24} className="text-brown-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-brown-800">
                      Foto e-KTP Fisik Asli
                    </p>
                    <p className="text-xs text-brown-500 mt-1">
                      {ktpFile ? ktpFile.name : 'Klik untuk mengunggah'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => setKtpFile(e.target.files?.[0] || null)}
                  />
                </label>

                {/* Selfie Upload */}
                <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-brown-300 rounded-xl cursor-pointer hover:border-brown-500 hover:bg-brown-50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-brown-100 flex items-center justify-center">
                    <User size={24} className="text-brown-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-brown-800">
                      Swafoto Memegang KTP
                    </p>
                    <p className="text-xs text-brown-500 mt-1">
                      {selfieFile ? selfieFile.name : 'Klik untuk mengunggah'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            {/* Checkbox Agreement */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-brown-300 text-brown-800 focus:ring-brown-300 accent-brown-800"
              />
              <span className="text-sm text-brown-600 leading-relaxed">
                Saya menyatakan data yang diberikan benar dan menyetujui
                pemrosesan sesuai UU PDP.
              </span>
            </label>

            {/* Encryption Notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-brown-50 border border-brown-200 mb-6">
              <Lock size={18} className="text-brown-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-brown-700">
                  Dokumen dienkripsi AES-256
                </p>
                <p className="text-xs text-brown-500 mt-0.5">
                  Hanya tim verifikasi resmi Vendoria yang dapat mengakses data
                  ini.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="px-6 py-3 bg-brown-800 text-white text-sm font-semibold rounded-lg hover:bg-brown-700 transition-colors">
                Kirim Dokumen untuk Verifikasi →
              </button>
              <button className="px-6 py-3 border border-brown-300 text-brown-700 text-sm font-semibold rounded-lg hover:bg-brown-50 transition-colors">
                Simpan Draf
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN - Sidebar */}
          <div className="lg:w-[35%] space-y-6">
            {/* Guide Card */}
            <div className="border border-brown-200 rounded-xl p-5">
              <h3 className="text-base font-semibold text-brown-800 mb-4">
                Panduan Foto KTP & Swafoto
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {/* Good photo */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-xs font-semibold text-green-700">
                      Foto yang benar
                    </span>
                  </div>
                  <p className="text-xs text-green-600 leading-relaxed">
                    Terang, fokus, semua sudut terlihat
                  </p>
                </div>

                {/* Bad photo */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-2">
                    <XCircle size={16} className="text-red-500" />
                    <span className="text-xs font-semibold text-red-600">
                      Hindari
                    </span>
                  </div>
                  <p className="text-xs text-red-500 leading-relaxed">
                    Buram, silau, atau terpotong
                  </p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-brown-800 mb-3">
                Checklist lolos cepat
              </h4>
              <ul className="space-y-2.5">
                {[
                  'Data terbaca dengan jelas',
                  'Wajah tidak tertutup',
                  'KTP asli bukan fotokopi',
                  'Latar belakang netral',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-brown-600"
                  >
                    <Check
                      size={16}
                      className="text-brown-700 shrink-0"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Why KYC Card */}
            <div className="border border-brown-200 rounded-xl p-5">
              <h3 className="text-base font-semibold text-brown-800 mb-4">
                Mengapa KYC diwajibkan?
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brown-100 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-brown-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brown-800">
                      Mencegah penipuan
                    </p>
                    <p className="text-xs text-brown-500 mt-0.5">
                      Verifikasi memastikan setiap pengguna adalah orang nyata.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brown-100 flex items-center justify-center shrink-0">
                    <DollarSign size={18} className="text-brown-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brown-800">
                      Menjaga dana escrow
                    </p>
                    <p className="text-xs text-brown-500 mt-0.5">
                      Dana transaksi dilindungi hingga serah terima selesai.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brown-100 flex items-center justify-center shrink-0">
                    <Handshake size={18} className="text-brown-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brown-800">
                      Membangun kepercayaan
                    </p>
                    <p className="text-xs text-brown-500 mt-0.5">
                      Vendor dan penyewa saling merasa aman bertransaksi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
