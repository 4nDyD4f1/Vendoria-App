import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Zap,
  ArrowRight,
  Search,
  CheckCircle2,
  Package,
  Sparkles,
  Store,
  UserPlus
} from 'lucide-react';
import { vendors } from '../data/mockData';

export default function VendorListPage() {
  const [selectedCity, setSelectedCity] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const cities = ['Semua', 'Bogor', 'Depok', 'Tangerang', 'Bekasi'];

  const filteredVendors = vendors.filter((v) => {
    if (selectedCity !== 'Semua' && v.city !== selectedCity) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.speciality.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-[#FDF8F2] min-h-screen text-[#35261F] pb-16">
      
      {/* 1. BREADCRUMB */}
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-3.5">
        <nav className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
          <Link to="/" className="hover:text-[#35261F] transition-colors">Beranda</Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-[#35261F]">Vendor Mitra</span>
        </nav>
      </div>

      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 space-y-6">
        
        {/* 2. HEADER CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#EBE2D9] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-block bg-[#F5EEE8] border border-[#EBE2D9] px-3 py-1 rounded-full text-[11px] font-bold text-[#8C7A6B] mb-2">
                Vendor Terverifikasi KYC & Legalitas
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#35261F]">
                Direktori Vendor Mitra Vendoria
              </h1>
              <p className="text-xs sm:text-sm text-[#8C7A6B] mt-1">
                Temukan penyedia rental terpercaya di Bogor dan Jabodetabek dengan jaminan inspeksi kondisi dan armada mandiri.
              </p>
            </div>

            {/* Total verified vendor pill */}
            <div className="flex items-center gap-2 bg-[#27AE60]/10 border border-[#27AE60]/20 rounded-2xl px-4 py-2.5 text-xs">
              <ShieldCheck size={18} className="text-[#27AE60]" />
              <div>
                <div className="text-[10px] text-[#27AE60] font-bold uppercase">Mitra Terkurasi</div>
                <div className="text-sm font-extrabold text-[#35261F]">100% Lolos Audit QC</div>
              </div>
            </div>
          </div>

          {/* Search bar & City filter tabs */}
          <div className="mt-6 pt-6 border-t border-[#F5EEE8] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* City Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCity === city
                      ? 'bg-[#35261F] text-white shadow-xs'
                      : 'bg-[#F5EEE8] text-[#6F5E52] hover:text-[#35261F]'
                  }`}
                >
                  {city === 'Semua' ? 'Semua Kota' : city}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B]" />
              <input 
                type="text"
                placeholder="Cari nama vendor atau spesialisasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F5EEE8] border border-[#EBE2D9] rounded-xl pl-9 pr-3 py-2 text-xs text-[#35261F] focus:outline-none placeholder-[#8C7A6B]"
              />
            </div>

          </div>
        </div>

        {/* 3. VENDOR CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-[24px] border border-[#EBE2D9] p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div>
                {/* Header: Avatar, Badges & Name */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {/* Initials Circle with Check */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#35261F] text-[#FAF6F1] flex items-center justify-center font-bold text-base shadow-xs">
                        {vendor.initials}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#27AE60] text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#35261F] group-hover:text-[#8C7A6B] transition-colors leading-tight">
                        {vendor.name}
                      </h3>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                        {vendor.since}
                      </div>
                    </div>
                  </div>

                  <span className="bg-[#F5EEE8] border border-[#EBE2D9] text-[#8C7A6B] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    {vendor.highlightBadge}
                  </span>
                </div>

                {/* Rating & Location */}
                <div className="flex items-center gap-3 text-xs text-[#8C7A6B] mb-3">
                  <div className="flex items-center text-amber-500 font-bold">
                    <Star size={12} className="fill-amber-400 text-amber-400 mr-0.5" />
                    <span>{vendor.rating}</span>
                    <span className="text-[#8C7A6B] font-normal ml-0.5">({vendor.reviews})</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin size={11} />
                    <span className="truncate">{vendor.city}</span>
                  </div>
                </div>

                {/* Speciality Tag */}
                <div className="bg-[#FDF8F2] border border-[#EBE2D9] rounded-xl p-2.5 mb-4 text-xs">
                  <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-0.5">
                    Spesialisasi
                  </span>
                  <p className="text-[#35261F] font-semibold text-xs truncate">
                    {vendor.speciality}
                  </p>
                </div>

                {/* Metrik Mini Grid */}
                <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-[#F5EEE8] mb-4 text-xs">
                  <div>
                    <div className="text-[10px] text-[#8C7A6B]">Katalog</div>
                    <div className="font-extrabold text-[#35261F]">{vendor.totalCatalog} Alat</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#8C7A6B]">Sukses</div>
                    <div className="font-extrabold text-[#35261F]">{vendor.successRate}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#8C7A6B]">Pencairan</div>
                    <div className="font-extrabold text-[#35261F]">{vendor.payoutSpeed}</div>
                  </div>
                </div>

                {/* Response Time */}
                <div className="flex items-center gap-1.5 text-xs text-[#35261F] font-medium mb-4">
                  <Zap size={13} className="text-[#C4A882]" />
                  <span>Respon Cepat ({vendor.responseTime})</span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={`/vendor/${vendor.id}`}
                className="w-full bg-[#35261F] hover:bg-[#231813] text-white py-2.5 rounded-full text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 group-hover:bg-[#231813]"
              >
                <span>Lihat Profil Toko & Katalog</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>

        {/* 4. JOIN VENDOR MITRA PROMO CARD */}
        <div className="bg-[#3B2A22] text-white rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2 max-w-xl">
            <span className="inline-block bg-white/10 text-[#E8DDD0] px-3 py-1 rounded-full text-[11px] font-bold">
              Kemitraan Vendor
            </span>
            <h3 className="text-xl sm:text-2xl font-bold leading-tight text-white">
              Punya Usaha Rental Alat Event? Gabung Vendor Mitra Vendoria
            </h3>
            <p className="text-xs text-[#D4C4AE] leading-relaxed">
              Dapatkan proteksi sengketa melalui deposit escrow, sistem penagihan otomatis, dan ribuan calon penyewa terverifikasi setiap bulan.
            </p>
          </div>

          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-[#35261F] hover:bg-[#FAF6F1] px-6 py-3 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap"
          >
            <UserPlus size={14} />
            <span>Daftar Sebagai Vendor</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
