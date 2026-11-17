import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ShieldCheck,
  Lock,
  Camera,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Truck,
  RotateCcw
} from 'lucide-react';

export default function HowToRentPage() {
  const steps = [
    {
      num: '01',
      title: 'Cari & Pilih Perlengkapan',
      desc: 'Gunakan filter kategori (Sound System, Tenda, Lighting, Panggung, Dekorasi) dan tentukan tanggal sewa untuk memastikan ketersediaan unit yang bebas bentrok jadwal.',
      points: [
        'Filter spesifikasi daya listrik & kapasitas',
        'Vendor terverifikasi KYC & legalitas NIB',
        'Bebas konsultasi teknis sebelum booking'
      ]
    },
    {
      num: '02',
      title: 'Booking & Pembayaran Escrow',
      desc: 'Bayar biaya sewa dan dana deposit jaminan secara aman. Dana deposit Anda tidak langsung diserahkan ke vendor, melainkan ditahan di rekening bersama resmi Vendoria.',
      points: [
        'Enkripsi SSL 256-bit standar perbankan',
        'Deposit aman 100% di rekening penampung',
        'Konfirmasi instan ke vendor mitra'
      ]
    },
    {
      num: '03',
      title: 'Serah Terima & Bukti Foto 4 Sudut',
      desc: 'Saat alat tiba di lokasi acara, lakukan verifikasi fisik bersama vendor dengan mendokumentasikan 4 sudut standar: Tampak Depan, Port & Kabel, Uji Fungsi Nyala, dan Tas/Hardcase.',
      points: [
        'BAST (Berita Acara) digital di aplikasi',
        'Foto 4 sudut transparan dua arah',
        'Uji fungsi alat sebelum dipakai'
      ]
    },
    {
      num: '04',
      title: 'Pelaksanaan Acara & Layanan Teknisi',
      desc: 'Gunakan perlengkapan event dengan tenang. Vendor menyediakan teknisi bersertifikat untuk instalasi, operator mixing, hingga pembongkaran rapi setelah acara.',
      points: [
        'Dukungan armada pickup & box mandiri',
        'Tim teknisi stand by selama acara',
        'Bantuan darurat tim pengganti jika diperlukan'
      ]
    },
    {
      num: '05',
      title: 'Pengembalian & Pencairan Deposit Otomatis',
      desc: 'Setelah acara selesai, unggah foto pengembalian. Vendor mengonfirmasi kondisi unit, dan dana deposit escrow akan otomatis dicairkan kembali ke rekening Anda dalam maksimal 3 jam.',
      points: [
        'Rilis otomatis maks. 3 jam pasca-pengembalian',
        'Tanpa potongan liar atau drama sengketa',
        'Mediasi admin adil berdasar bukti foto awal'
      ]
    }
  ];

  return (
    <div className="bg-[#FDF8F2] min-h-screen text-[#35261F] pb-16">
      
      {/* 1. BREADCRUMB */}
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-3.5">
        <nav className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
          <Link to="/" className="hover:text-[#35261F] transition-colors">Beranda</Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-[#35261F]">Cara Sewa</span>
        </nav>
      </div>

      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 space-y-6">
        
        {/* 2. HEADER HERO CARD */}
        <div className="bg-[#3B2A22] rounded-[32px] p-6 sm:p-10 text-white relative overflow-hidden shadow-xs">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#E8DDD0] mb-4">
              <Sparkles size={13} className="text-[#C4A882]" />
              <span>Panduan Lengkap & Transparan</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Cara Sewa Alat Event di Vendoria
            </h1>
            <p className="text-xs sm:text-sm text-[#D4C4AE] leading-relaxed">
              Solusi rental perlengkapan pesta, pernikahan, dan konser paling aman di Indonesia dengan perlindungan rekening bersama (escrow) dan jaminan inspeksi kondisi 4 sudut.
            </p>
          </div>
        </div>

        {/* 3. TRUST PILLARS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#EBE2D9] shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#F5EEE8] flex items-center justify-center text-[#35261F] shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#35261F]">100% Deposit Aman</div>
              <div className="text-[11px] text-[#8C7A6B]">Tersimpan di escrow rekening bersama</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#EBE2D9] shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#F5EEE8] flex items-center justify-center text-[#35261F] shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#35261F]">Rilis Cepat Maks. 3 Jam</div>
              <div className="text-[11px] text-[#8C7A6B]">Pencairan otomatis pasca-verifikasi</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#EBE2D9] shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#F5EEE8] flex items-center justify-center text-[#35261F] shrink-0">
              <Camera size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#35261F]">Inspeksi Digital 4 Sudut</div>
              <div className="text-[11px] text-[#8C7A6B]">Bukti kondisi awal & akhir seragam</div>
            </div>
          </div>
        </div>

        {/* 4. STEP-BY-STEP DETAILED CARDS */}
        <div className="space-y-4">
          {steps.map((s) => (
            <div 
              key={s.num}
              className="bg-white rounded-[24px] border border-[#EBE2D9] p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row items-start gap-6"
            >
              {/* Step Number Circle */}
              <div className="w-12 h-12 rounded-2xl bg-[#35261F] text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                {s.num}
              </div>

              {/* Step Info */}
              <div className="flex-1 space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-[#35261F]">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#8C7A6B] leading-relaxed">
                  {s.desc}
                </p>

                {/* Checklist points */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {s.points.map((pt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-[#35261F] font-medium bg-[#FDF8F2] px-3 py-1.5 rounded-xl border border-[#EBE2D9]">
                      <CheckCircle2 size={13} className="text-[#27AE60] shrink-0" />
                      <span className="truncate">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 5. VENDORIA GUARD POLICY NOTE */}
        <div className="bg-[#F5EEE8] rounded-[24px] p-6 sm:p-8 border border-[#EBE2D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#EBE2D9] flex items-center justify-center text-[#35261F] shrink-0">
              <ShieldCheck size={24} className="text-[#27AE60]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#35261F]">Jaminan Perlindungan Vendoria Guard</h4>
              <p className="text-xs text-[#8C7A6B] mt-0.5 max-w-xl">
                Bila terjadi selisih kondisi barang atau kendala teknis, tim admin Vendoria melakukan mediasi objektif berdasarkan perbandingan foto awal serah terima.
              </p>
            </div>
          </div>

          <Link 
            to="/catalog"
            className="inline-flex items-center gap-2 bg-[#35261F] hover:bg-[#231813] text-white px-6 py-3 rounded-full text-xs font-bold transition-colors shadow-xs shrink-0 whitespace-nowrap"
          >
            <span>Mulai Cari Alat Sekarang</span>
            <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}
