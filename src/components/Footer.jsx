import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#3B2A22] text-[#D4C4AE] pt-14 pb-8 border-t border-[#231813]">
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6">
        
        {/* Main 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-white/10">
          
          {/* Col 1: Brand Info (col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <img 
                src="/assets/logo_icon.png" 
                alt="Vendoria" 
                className="w-8 h-8 rounded-xl object-contain brightness-125"
              />
              <span className="text-2xl font-bold tracking-tight text-white">
                Vendoria
              </span>
            </div>

            <p className="text-xs text-[#D4C4AE] leading-relaxed max-w-sm">
              Marketplace rental perlengkapan event terpercaya dengan jaminan inspeksi kondisi terverifikasi.
            </p>

            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-[11px] text-[#E8DDD0]">
              <Check size={12} className="text-[#27AE60] stroke-[3]" />
              <span>Kondisi terverifikasi & tepat waktu</span>
            </div>
          </div>

          {/* Col 2: Sewa Alat (col-span-3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sewa Alat
            </h4>
            <ul className="space-y-2 text-xs">
              {['Audio & Sound System', 'Stage Lighting & LED', 'Tenda & Kanopi', 'Panggung & Genset', 'Furnitur & Dekorasi'].map((item) => (
                <li key={item}>
                  <Link inert to="/catalog" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Bantuan & Panduan (col-span-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Bantuan & Panduan
            </h4>
            <ul className="space-y-2 text-xs">
              {['Cara Pemesanan', 'Verifikasi KTP & KYC', 'Panduan Serah Terima', 'Kebijakan Pengembalian', 'Pusat Bantuan Pelanggan'].map((item) => (
                <li key={item}>
                  <Link inert to="/kyc" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Kontak Operasional (col-span-3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Kontak Operasional
            </h4>
            <ul className="space-y-2.5 text-xs text-[#D4C4AE]">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="shrink-0 text-[#C4A882] mt-0.5" />
                <span>Jl. Pajajaran No. 88 Baranangsiang, Kota Bogor</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="shrink-0 text-[#C4A882]" />
                <a inert href="mailto:halo@vendoria.id" className="hover:text-white transition-colors">halo@vendoria.id</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-[#C4A882]" />
                <span>+62 812-8800-4420</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#A39384]">
          <div>
            © 2026 Vendoria Indonesia. Hak Cipta Dilindungi.
          </div>
          <div className="flex items-center gap-5">
            <a inert href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
            <a inert href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
            <a inert href="#" className="hover:text-white transition-colors">Gabung Vendor Mitra</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
