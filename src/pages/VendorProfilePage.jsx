import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Star,
  MapPin,
  Clock,
  Zap,
  Share2,
  UserPlus,
  MessageSquare,
  Package,
  Truck,
  Search,
  Heart,
  ArrowRight,
  Check,
  Shield
} from 'lucide-react';
import { products } from '../data/mockData';
import ImagePlaceholder from '../components/ImagePlaceholder';

export default function VendorProfilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('katalog'); // 'katalog' | 'ulasan' | 'tentang' | 'kebijakan'
  const [selectedSubCategory, setSelectedSubCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [favorites, setFavorites] = useState({});

  const toggleFavorite = (productId) => {
    setFavorites(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const vendorProducts = [
    {
      id: 1,
      name: "Set Line Array 5000W + Digital Mixer 32-Channel",
      category: "SOUND SYSTEM",
      rating: 4.9,
      reviews: 88,
      location: "Bogor",
      price: "1.850.000",
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia"
    },
    {
      id: 2,
      name: "Wireless Microphone Shure BLX24",
      category: "SOUND SYSTEM",
      rating: 4.8,
      reviews: 61,
      location: "Bogor",
      price: "450.000",
      image: "https://images.unsplash.com/photo-1520523839898-507125cd53c1?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia"
    },
    {
      id: 3,
      name: "Paket Sound Seminar 2000W + Proyektor",
      category: "SOUND SYSTEM",
      rating: 4.8,
      reviews: 52,
      location: "Bogor",
      price: "1.200.000",
      image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia"
    },
    {
      id: 4,
      name: "Monitor Speaker Aktif 15 Inci Paket 4 Unit",
      category: "SOUND SYSTEM",
      rating: 4.8,
      reviews: 47,
      location: "Bogor",
      price: "650.000",
      image: "https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia"
    },
    {
      id: 5,
      name: "Kabel Snake Multicore 32-Ch 30m",
      category: "SOUND SYSTEM",
      rating: 4.7,
      reviews: 34,
      location: "Bogor",
      price: "250.000",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia"
    }
  ];

  return (
    <div className="bg-[#FAF6F1] min-h-screen text-[#1A1A1A] pb-16">
      {/* 1. BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <nav className="flex items-center gap-1.5 text-xs text-[#8B6F47]">
          <Link to="/" className="hover:text-[#3C2415] transition-colors">Beranda</Link>
          <ChevronRight size={13} />
          <Link to="/catalog" className="hover:text-[#3C2415] transition-colors">Vendor</Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-[#3C2415]">Karya Audio Pro Bogor</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 2. VENDOR PROFILE HEADER CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#E8DDD0] shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Avatar & Info */}
            <div className="flex items-center gap-5">
              {/* Big Initials Avatar with Verified Check */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#3C2415] text-[#FAF6F1] flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white">
                  KA
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#27AE60] text-white flex items-center justify-center border-2 border-white">
                  <Check size={12} className="stroke-[3]" />
                </div>
              </div>

              {/* Badges & Name */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="inline-flex items-center gap-1 bg-[#27AE60]/10 text-[#27AE60] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#27AE60]/20">
                    <ShieldCheck size={12} className="stroke-[2.5]" />
                    <span>KYC & NIB Terverifikasi</span>
                  </span>
                  <span className="bg-[#FAF6F1] text-[#8B6F47] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#E8DDD0]">
                    Mitra Resmi sejak 2023
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-[#3C2415] leading-snug">
                  Karya Audio Pro Bogor
                </h1>

                <div className="flex items-center gap-3 text-xs text-[#8B6F47] mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <MapPin size={13} />
                    <span>Baranangsiang, Kota Bogor</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-[#3C2415] font-medium">
                    <Zap size={13} className="text-[#C4A882]" />
                    <span>Respon Cepat (&lt; 10 Menit)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
              <button 
                type="button" 
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#FAF6F1] hover:bg-[#F0E8DE] text-[#3C2415] px-4 py-2.5 rounded-full text-xs font-bold border border-[#E8DDD0] transition-colors"
              >
                <Share2 size={13} />
                <span>Bagikan</span>
              </button>

              <button 
                type="button" 
                onClick={() => setIsFollowing(!isFollowing)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#FAF6F1] hover:bg-[#F0E8DE] text-[#3C2415] px-4 py-2.5 rounded-full text-xs font-bold border border-[#E8DDD0] transition-colors"
              >
                <span>{isFollowing ? 'Mengikuti' : '+ Ikuti'}</span>
              </button>

              <button 
                type="button" 
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#3C2415] hover:bg-[#2A1A0E] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-colors shadow-sm"
              >
                <MessageSquare size={13} />
                <span>Kontak Vendor</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. FOUR STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E8DDD0] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#8B6F47] block mb-1">Rating Pelanggan</span>
              <div className="text-xl sm:text-2xl font-extrabold text-[#3C2415]">4.9 / 5.0</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FAF6F1] border border-[#E8DDD0] flex items-center justify-center text-[#8B6F47]">
              <Star size={18} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E8DDD0] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#8B6F47] block mb-1">Tingkat Sukses Sewa</span>
              <div className="text-xl sm:text-2xl font-extrabold text-[#3C2415]">99.2%</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FAF6F1] border border-[#E8DDD0] flex items-center justify-center text-[#8B6F47]">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E8DDD0] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#8B6F47] block mb-1">Katalog Aktif</span>
              <div className="text-xl sm:text-2xl font-extrabold text-[#3C2415]">5 Peralatan</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FAF6F1] border border-[#E8DDD0] flex items-center justify-center text-[#8B6F47]">
              <Package size={18} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E8DDD0] shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#8B6F47] block mb-1">Pencairan Deposit</span>
              <div className="text-xl sm:text-2xl font-extrabold text-[#3C2415]">2.5 Jam</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FAF6F1] border border-[#E8DDD0] flex items-center justify-center text-[#8B6F47]">
              <Clock size={18} />
            </div>
          </div>
        </div>

        {/* 4. SERVICE AREA & OPERATING HOURS STRIP */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8DDD0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#8B6F47]">
          <div className="flex items-center gap-2">
            <Truck size={15} className="text-[#3C2415]" />
            <span className="font-semibold text-[#3C2415]">Area Layanan Kirim & Setup:</span>
            <span>Bogor dan sekitarnya</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[#3C2415]" />
            <span className="font-semibold text-[#3C2415]">Buka:</span>
            <span>08.00 - 22.00 WIB</span>
          </div>
        </div>

        {/* 5. TABS & CATALOG SECTION */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#E8DDD0] shadow-sm space-y-6">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#F0E8DE] no-scrollbar">
            {[
              { id: 'katalog', label: 'Katalog Alat Sewa (5)' },
              { id: 'ulasan', label: 'Ulasan Penyewa (12)' },
              { id: 'tentang', label: 'Tentang & SOP Serah Terima' },
              { id: 'kebijakan', label: 'Kebijakan & Wilayah Logistik' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#3C2415] text-white shadow-sm'
                      : 'bg-[#FAF6F1] text-[#8B6F47] hover:bg-[#F0E8DE]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar inside store */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B6F47]" />
              <input 
                type="text"
                placeholder="Cari alat di toko ini..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#3C2415] placeholder-[#8B6F47]/70 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select className="bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs font-semibold text-[#3C2415] focus:outline-none cursor-pointer">
                <option>Paling populer</option>
                <option>Harga terendah</option>
                <option>Harga tertinggi</option>
              </select>
            </div>
          </div>

          {/* Sub-category Filter Pills */}
          <div className="flex items-center gap-2">
            {['Semua', 'Sound system'].map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubCategory(sub)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  selectedSubCategory === sub
                    ? 'bg-[#3C2415] text-white'
                    : 'bg-[#FAF6F1] text-[#8B6F47] hover:bg-[#F0E8DE]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Products Grid (3 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendorProducts.map((item) => {
              const isFav = favorites[item.id] || false;
              return (
                <div 
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#E8DDD0] overflow-hidden hover:shadow-lg transition-all flex flex-col group"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-[#FAF6F1] overflow-hidden">
                    <ImagePlaceholder label="Foto Alat Sewa" iconSize={24} />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="bg-[#27AE60]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {item.status}
                      </span>
                    </div>
                    <button 
                      onClick={() => toggleFavorite(item.id)}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#3C2415] hover:bg-white transition-colors shadow-sm"
                    >
                      <Heart 
                        size={14} 
                        className={isFav ? "fill-[#C0392B] text-[#C0392B]" : "text-[#8B6F47]"} 
                      />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#8B6F47] uppercase tracking-wider block mb-1">
                        {item.category}
                      </span>
                      <Link to={`/product/${item.id}`}>
                        <h3 className="text-sm font-bold text-[#3C2415] hover:text-[#8B6F47] transition-colors line-clamp-2 leading-snug mb-2">
                          {item.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-1.5 text-xs text-[#8B6F47] mb-1">
                        <ShieldCheck size={13} className="text-[#27AE60]" />
                        <span>Karya Audio Pro Bogor</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#8B6F47] mb-3">
                        <div className="flex items-center text-amber-500 font-bold">
                          <Star size={12} className="fill-amber-400 text-amber-400 mr-0.5" />
                          <span>{item.rating}</span>
                        </div>
                        <span>({item.reviews})</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin size={11} />
                          {item.location}
                        </span>
                      </div>
                    </div>

                    {/* Price and CTA */}
                    <div className="pt-3 border-t border-[#F0E8DE] flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-[#3C2415]">
                          Rp{item.price}
                          <span className="text-[11px] font-normal text-[#8B6F47]">/hari</span>
                        </div>
                      </div>
                      <Link 
                        to={`/product/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#3C2415] hover:text-[#8B6F47] transition-colors"
                      >
                        <span>Lihat</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. TRUST & STANDARDS SECTION (TWO CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Standar Serah Terima & QC Barang */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8DDD0] shadow-sm">
            <h3 className="text-sm font-bold text-[#3C2415] mb-4">
              Standar Serah Terima & QC Barang
            </h3>
            <ul className="space-y-3 text-xs text-[#3C2415]">
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>Foto 4 sudut sebelum dan sesudah sewa</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>Uji fungsi dilakukan di depan penyewa</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>Checklist kelengkapan kabel dan aksesori</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>BAST digital ditandatangani kedua pihak</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Armada Logistik & Teknisi Mandiri */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8DDD0] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#3C2415]">
                Armada Logistik & Teknisi Mandiri
              </h3>
              <span className="bg-[#27AE60]/10 text-[#27AE60] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#27AE60]/20">
                Siap Beroperasi
              </span>
            </div>
            <ul className="space-y-3 text-xs text-[#3C2415]">
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>Armada box dan pickup milik sendiri</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>Teknisi bersertifikat pada setiap paket</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>Pelacakan jadwal tiba via WhatsApp</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={15} className="text-[#27AE60] shrink-0 mt-0.5" />
                <span>Tim cadangan untuk acara besar</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 7. VENDORIA GUARD GUARANTEE BAR */}
        <div className="bg-[#FAF6F1] rounded-2xl p-4 border border-[#E8DDD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[#3C2415] shrink-0" />
            <p className="text-xs text-[#3C2415]">
              <span className="font-bold">Jaminan Vendoria Guard</span> Setiap transaksi dengan vendor ini dilindungi escrow, bukti foto dua arah, dan mediasi Admin.
            </p>
          </div>
          <button className="text-xs font-bold text-[#3C2415] hover:text-[#8B6F47] flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors">
            <span>Pelajari Perlindungan Escrow</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
