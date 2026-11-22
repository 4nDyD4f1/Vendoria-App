import {
  ShieldCheck,
  Wallet,
  Camera,
  Lock,
  Star,
  Triangle,
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const features = [
  {
    icon: ShieldCheck,
    title: 'Vendor Terverifikasi KYC',
    description: 'Setiap vendor melalui proses verifikasi identitas resmi.',
  },
  {
    icon: Wallet,
    title: 'Deposit Aman Terkelola',
    description: 'Dana deposit dikelola dengan sistem escrow terpercaya.',
  },
  {
    icon: Camera,
    title: 'Bukti Foto Kondisi Barang',
    description: 'Dokumentasi kondisi alat sebelum & sesudah penyewaan.',
  },
];

export default function AuthLayout({
  children,
  badgeText = 'Vendoria Secure',
  heading = 'Selamat Datang',
}) {
  return (
    <div className="min-h-screen flex flex-col bg-brown-50">
      {/* Top navbar – logged-out variant */}
      <Navbar isLoggedIn={false} />

      {/* ---- Main content area ---- */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 lg:py-16">
        <div className="w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
          {/* ======== LEFT – info panel ======== */}
          <div className="relative w-full lg:w-[420px] shrink-0 bg-gradient-to-br from-brown-800 to-brown-900 p-8 lg:p-10 flex flex-col justify-between rounded-2xl lg:rounded-r-none">
            {/* Logo */}
            <div>
              <a href="/" className="flex items-center gap-2 mb-8">
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Triangle
                    size={20}
                    className="text-white"
                    strokeWidth={2.2}
                  />
                </span>
                <span className="text-lg font-bold tracking-tight">
                  Vendoria
                </span>
              </a>

              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-5">
                <ShieldCheck size={13} className="text-green-400" />
                {badgeText}
              </span>

              {/* Heading */}
              <h1 className="text-2xl lg:text-3xl font-bold leading-snug mb-8">
                {heading}
              </h1>

              {/* Features */}
              <ul className="space-y-5">
                {features.map((f) => (
                  <li key={f.title} className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{f.title}</p>
                      <p className="text-xs text-white/70 leading-relaxed mt-0.5">
                        {f.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Testimonial card */}
            <div className="mt-10 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className="text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm font-medium italic leading-relaxed">
                "Tenang dari awal sampai acara selesai."
              </p>
              <p className="text-xs text-white/60 mt-3">
                98% Transaksi Tanpa Kendala
              </p>
            </div>
          </div>

          {/* ======== RIGHT – form area ======== */}
          <div className="flex-1 bg-white p-8 lg:p-10 overflow-y-auto">
            {children}
          </div>
        </div>
      </main>

      {/* ---- Security note ---- */}
      <div className="flex items-center justify-center gap-2 py-4 text-xs text-brown-500">
        <Lock size={13} />
        <span>
          Enkripsi SSL 256-bit standar perbankan · Privasi & Keamanan Data
        </span>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
