import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';

const STATUS_TABS = [
  { key: 'unverified', label: 'Belum Terverifikasi' },
  { key: 'pending', label: 'Menunggu Verifikasi' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'rejected', label: 'Ditolak' },
];

export default function KycPendingPage() {
  const [activeStatus, setActiveStatus] = useState('pending');

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Centered Card */}
        <div className="max-w-xl mx-auto text-center">
          {/* Green check icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
          </div>

          {/* Badge */}
          <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wider mb-4">
            Dokumen Terkirim
          </span>

          {/* Heading */}
          <h1 className="text-2xl md:text-3xl font-bold text-brown-800 mb-3">
            Verifikasi KYC sedang ditinjau
          </h1>

          {/* Description */}
          <p className="text-sm text-brown-500 leading-relaxed mb-8 max-w-md mx-auto">
            Dokumenmu telah terenkripsi dan masuk ke antrean verifikasi. Proses
            ini memerlukan waktu maksimal 1 × 24 jam.
          </p>

          {/* Info Card */}
          <div className="bg-brown-50 border border-brown-200 rounded-xl p-5 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-left">
                <p className="text-xs text-brown-500 mb-1">Nama Pemohon</p>
                <p className="text-sm font-semibold text-brown-800">
                  shofia aziza imn
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-brown-500 mb-1">Status</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  Menunggu Verifikasi
                </span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-brown-300 text-brown-700 text-sm font-semibold rounded-lg hover:bg-brown-50 transition-colors"
          >
            Lanjut ke Beranda →
          </Link>
        </div>

        {/* Status Simulation Bar (bottom) */}
        <div className="max-w-xl mx-auto mt-16">
          <div className="bg-brown-50 border border-brown-200 rounded-xl p-4">
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
        </div>
      </div>
    </div>
  );
}
