import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Search, 
  ShieldCheck, 
  Lock, 
  Camera, 
  Heart, 
  Star, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Info,
  ChevronDown
} from 'lucide-react';
import { products, blogPosts } from '../data/mockData';
import ImagePlaceholder from '../components/ImagePlaceholder';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedEventType, setSelectedEventType] = useState('Pernikahan');
  const [selectedLocation, setSelectedLocation] = useState('Bogor & Sekitarnya');
  const [favorites, setFavorites] = useState({});

  const toggleFavorite = (productId) => {
    setFavorites(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  // 4 products shown on homepage matching design
  const homeProducts = products.slice(0, 4);

  return (
    <div className="bg-[#FDF8F2] min-h-screen text-[#35261F] pb-16">
      
      {/* ================= 1. HERO SECTION ================= */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 pt-2 pb-6">
        <div className="bg-[#3B2A22] rounded-[32px] p-6 sm:p-10 text-white relative overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-medium w-fit mb-6 text-[#E8DDD0]">
                <Sparkles size={13} className="text-[#C4A882]" />
                <span>Selamat datang di Vendoria</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-[50px] font-bold leading-[1.12] tracking-tight mb-4 text-white">
                Sewa alat event, <br className="hidden sm:inline" />
                lebih mudah dan aman.
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-[#D4C4AE] max-w-lg mb-7 leading-relaxed">
                Temukan tenda, sound system, dan dekorasi dari vendor terverifikasi dengan deposit yang kami jaga.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-5 mb-8">
                <Link 
                  to="/catalog" 
                  className="inline-flex items-center gap-2 bg-white hover:bg-white/95 text-[#35261F] px-6 py-3 rounded-full font-bold text-xs sm:text-sm transition-all shadow-sm group"
                >
                  <span>Cari Alat</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <a 
                  href="#panduan" 
                  className="inline-flex items-center gap-1.5 text-xs text-[#E8DDD0] hover:text-white transition-colors"
                >
                  <span className="underline decoration-[#C4A882] underline-offset-4">Pelajari Cara Sewa</span>
                  <Info size={13} className="text-[#C4A882]" />
                </a>
              </div>

              {/* Search Widget Container (Floating inside hero) */}
              <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-[#35261F] max-w-[500px]">
                {/* Event Type */}
                <div className="flex-1 px-3 py-1 border-b sm:border-b-0 sm:border-r border-[#EBE2D9]">
                  <label className="block text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Jenis Acara
                  </label>
                  <div className="flex items-center justify-between">
                    <select 
                      value={selectedEventType}
                      onChange={(e) => setSelectedEventType(e.target.value)}
                      className="w-full text-xs font-bold bg-transparent focus:outline-none cursor-pointer text-[#35261F] pr-2 appearance-none"
                    >
                      <option value="Pernikahan">Pernikahan</option>
                      <option value="Seminar">Seminar</option>
                      <option value="Pesta">Pesta</option>
                      <option value="Konser">Konser</option>
                    </select>
                    <ChevronDown size={14} className="text-[#8C7A6B] pointer-events-none" />
                  </div>
                </div>

                {/* Location */}
                <div className="flex-1 px-3 py-1">
                  <label className="block text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Lokasi Layanan
                  </label>
                  <div className="flex items-center justify-between">
                    <select 
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full text-xs font-bold bg-transparent focus:outline-none cursor-pointer text-[#35261F] pr-2 appearance-none"
                    >
                      <option value="Bogor & Sekitarnya">Bogor & Sekitarnya</option>
                      <option value="Kota Bogor">Kota Bogor</option>
                      <option value="Depok">Depok</option>
                      <option value="Jakarta">Jakarta</option>
                    </select>
                    <ChevronDown size={14} className="text-[#8C7A6B] pointer-events-none" />
                  </div>
                </div>

                {/* Search Button */}
                <Link
                  to="/catalog"
                  className="bg-[#35261F] hover:bg-[#231813] text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors shrink-0"
                >
                  <Search size={14} />
                  <span>Cari</span>
                </Link>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-[24px] overflow-hidden relative shadow-md aspect-[4/3] sm:aspect-[1.1]">
                <ImagePlaceholder dark={true} label="Foto Venue Event" iconSize={32} />

                {/* Badge Top Left */}
                <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Check size={12} className="text-[#27AE60] stroke-[3]" />
                  <span className="text-[11px] font-bold text-[#35261F]">Inspeksi Siap Pakai</span>
                </div>

                {/* Stats Card Bottom Right */}
                <div className="absolute bottom-3.5 right-3.5 flex items-center gap-2">
                  <div className="bg-white/95 backdrop-blur-xs rounded-2xl px-3.5 py-2 shadow-md text-center">
                    <div className="text-sm sm:text-base font-extrabold text-[#35261F]">3.400+</div>
                    <div className="text-[9px] text-[#8C7A6B] font-medium">Unit Tersedia</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xs rounded-2xl px-3.5 py-2 shadow-md text-center">
                    <div className="text-sm sm:text-base font-extrabold text-[#35261F]">4.9 / 5.0</div>
                    <div className="text-[9px] text-[#8C7A6B] font-medium">Rating Penyewa</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 2. TRUST VALUES BAR ================= */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-2">
        <div className="bg-[#F5EEE8] border border-[#EBE2D9] rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3.5 sm:border-r border-[#EBE2D9] sm:pr-4">
            <div className="w-10 h-10 rounded-full bg-[#EBE2D9] flex items-center justify-center text-[#35261F] shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#35261F]">Vendor terverifikasi</h4>
              <p className="text-[11px] text-[#8C7A6B] mt-0.5">Identitas KYC & kualitas terkurasi</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:border-r border-[#EBE2D9] sm:pr-4">
            <div className="w-10 h-10 rounded-full bg-[#EBE2D9] flex items-center justify-center text-[#35261F] shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#35261F]">Deposit aman</h4>
              <p className="text-[11px] text-[#8C7A6B] mt-0.5">Ditahan di rekening escrow</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#EBE2D9] flex items-center justify-center text-[#35261F] shrink-0">
              <Camera size={18} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#35261F]">Bukti foto kondisi</h4>
              <p className="text-[11px] text-[#8C7A6B] mt-0.5">Inspeksi digital dua arah</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. KATALOG PILIHAN SECTION ================= */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5">
        <div className="bg-[#F5EEE8] border border-[#EBE2D9] rounded-[32px] p-6 sm:p-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-0.5">
                PILIHAN TERBAIK DI BOGOR
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#35261F]">Katalog pilihan</h2>
            </div>
            
            {/* Nav Arrows */}
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-white border border-[#EBE2D9] flex items-center justify-center text-[#35261F] hover:bg-[#FDF8F2] shadow-xs transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 rounded-full bg-white border border-[#EBE2D9] flex items-center justify-center text-[#35261F] hover:bg-[#FDF8F2] shadow-xs transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Category Filter Pills Capsule */}
          <div className="bg-[#EBE2D9] rounded-full p-1 inline-flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar max-w-full">
            {['Semua', 'Tenda & Kanopi', 'Sound System', 'Lighting', 'Dekorasi', 'Kursi & Meja'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#35261F] text-white shadow-xs'
                    : 'text-[#6F5E52] hover:text-[#35261F]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 4 Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {homeProducts.map((product) => {
              const isFav = favorites[product.id] || false;
              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-2xl p-3 border border-[#EBE2D9] hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Image Area - Clean Placeholder */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F5EEE8] mb-3">
                      <ImagePlaceholder label="Foto Produk" iconSize={22} />
                      
                      {/* Available Badge */}
                      <div className="absolute top-2 left-2">
                        <span className="bg-[#27AE60]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Tersedia
                        </span>
                      </div>

                      {/* Heart Button */}
                      <button 
                        onClick={() => toggleFavorite(product.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-[#35261F] hover:bg-white shadow-xs transition-colors"
                      >
                        <Heart 
                          size={13} 
                          className={isFav ? "fill-[#B33927] text-[#B33927]" : "text-[#8C7A6B]"} 
                        />
                      </button>
                    </div>

                    {/* Metadata */}
                    <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-1">
                      {product.category}
                    </span>
                    <Link to={`/product/${product.id}`}>
                      <h3 className="text-xs sm:text-sm font-bold text-[#35261F] hover:text-[#8C7A6B] transition-colors line-clamp-2 leading-snug mb-1.5">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Vendor */}
                    <div className="flex items-center gap-1 text-[11px] text-[#8C7A6B] mb-1">
                      <ShieldCheck size={12} className="text-[#27AE60]" />
                      <span className="truncate">{product.vendor}</span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A6B] mb-3">
                      <div className="flex items-center text-amber-500 font-bold">
                        <Star size={11} className="fill-amber-400 text-amber-400 mr-0.5" />
                        <span>{product.rating}</span>
                      </div>
                      <span>({product.reviewCount})</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} />
                        {product.location}
                      </span>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-2.5 border-t border-[#F5EEE8] flex items-center justify-between">
                    <div className="text-xs sm:text-sm font-extrabold text-[#35261F]">
                      Rp{product.price.toLocaleString('id-ID')}
                      <span className="text-[10px] font-normal text-[#8C7A6B]">/hari</span>
                    </div>
                    <Link 
                      to={`/product/${product.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#35261F] hover:text-[#8C7A6B] transition-colors"
                    >
                      <span>Lihat</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom link */}
          <div className="mt-6 text-right">
            <Link 
              to="/catalog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#35261F] hover:text-[#8C7A6B] transition-colors"
            >
              <span>Lihat Semua Katalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 4. PANDUAN SEWA SECTION ================= */}
      <section id="panduan" className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5">
        <div className="bg-[#F5EEE8] border border-[#EBE2D9] rounded-[32px] p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Description */}
            <div className="lg:col-span-5">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-1">
                MUDAH, AMAN, TERLINDUNGI
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#35261F] mb-3 leading-tight">
                Panduan untuk pertama kali sewa
              </h2>
              <p className="text-xs sm:text-sm text-[#8C7A6B] leading-relaxed mb-6">
                Dari pencarian sampai deposit kembali, setiap langkah tercatat dan terlindungi oleh Vendoria.
              </p>

              {/* Notice Box */}
              <div className="bg-white rounded-2xl p-4 border border-[#EBE2D9] flex items-start gap-3 mb-6 shadow-xs">
                <Lock size={16} className="text-[#35261F] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#35261F]">Deposit 100% dikembalikan</div>
                  <div className="text-[11px] text-[#8C7A6B] mt-0.5 leading-snug">
                    Otomatis maksimal 3 jam setelah foto pengembalian tervalidasi dan tanpa klaim.
                  </div>
                </div>
              </div>

              <Link 
                to="/catalog"
                className="inline-flex items-center gap-2 bg-[#35261F] hover:bg-[#231813] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-colors shadow-xs"
              >
                <span>Baca Panduan Lengkap</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Right 4 Steps Cards */}
            <div className="lg:col-span-7 space-y-3">
              {[
                {
                  step: '01',
                  title: 'Cari dan pilih alat',
                  desc: 'Filter berdasarkan tanggal, lokasi, dan harga.',
                },
                {
                  step: '02',
                  title: 'Pesan dan bayar deposit',
                  desc: 'Deposit ditahan aman di rekening escrow.',
                },
                {
                  step: '03',
                  title: 'Terima barang dan foto kondisinya',
                  desc: 'Empat sudut foto sebagai bukti kondisi awal.',
                },
                {
                  step: '04',
                  title: 'Kembalikan dan beri ulasan',
                  desc: 'Deposit kembali otomatis, ulasanmu bantu yang lain.',
                },
              ].map((item) => (
                <div 
                  key={item.step}
                  className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-[#EBE2D9] shadow-xs"
                >
                  <div className="w-8 h-8 rounded-full bg-[#35261F] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#35261F]">{item.title}</h4>
                    <p className="text-[11px] text-[#8C7A6B] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ================= 5. TESTIMONIAL SECTION ================= */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5">
        <div className="bg-[#F5EEE8] border border-[#EBE2D9] rounded-[32px] p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual Placeholder */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[340px] aspect-[4/3] rounded-2xl overflow-hidden shadow-xs">
                <ImagePlaceholder label="Foto Dokumentasi Acara" iconSize={32} />
              </div>
            </div>

            {/* Content Card */}
            <div className="lg:col-span-7">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-1">
                TESTIMONI
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#35261F] mb-5">
                Kata mereka tentang Vendoria
              </h2>

              <div className="bg-white rounded-2xl p-6 border border-[#EBE2D9] shadow-xs mb-5">
                <div className="flex items-center gap-1 text-amber-500 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <blockquote className="text-xs sm:text-sm text-[#35261F] leading-relaxed mb-5 font-medium italic">
                  "Tenda dan soundnya datang tepat waktu, kondisi barang persis seperti foto. Deposit kembali kurang dari tiga jam setelah pengembalian. Sangat tenang!"
                </blockquote>

                <div className="flex items-center justify-between flex-wrap gap-4 pt-3.5 border-t border-[#F5EEE8]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#EBE2D9] text-[#35261F] font-bold text-xs flex items-center justify-center">
                      AP
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#35261F]">Anindya Putri</div>
                      <div className="text-[10px] text-[#8C7A6B]">Bogor Tengah</div>
                    </div>
                  </div>

                  <div className="bg-[#FDF8F2] px-3 py-1 rounded-full text-[10px] font-semibold text-[#8C7A6B] border border-[#EBE2D9]">
                    Item Disewa: Tenda Roder & Sound 3000W
                  </div>
                </div>
              </div>

              <button className="inline-flex items-center gap-2 bg-[#35261F] hover:bg-[#231813] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-colors shadow-xs">
                <span>Lihat Selengkapnya Testimoni</span>
                <ArrowRight size={13} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 6. STATS & OPERATIONAL AREA ================= */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Left Stats Cards */}
          <div className="lg:col-span-3 flex flex-col gap-3 justify-between">
            <div className="bg-white rounded-2xl p-5 border border-[#EBE2D9] shadow-xs">
              <div className="text-3xl font-extrabold text-[#35261F]">10K+</div>
              <div className="text-xs text-[#8C7A6B] mt-0.5 font-medium">penyewa puas</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#EBE2D9] shadow-xs">
              <div className="text-3xl font-extrabold text-[#35261F]">500+</div>
              <div className="text-xs text-[#8C7A6B] mt-0.5 font-medium">vendor terverifikasi KYC</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#EBE2D9] shadow-xs">
              <div className="text-3xl font-extrabold text-[#35261F]">98%</div>
              <div className="text-xs text-[#8C7A6B] mt-0.5 font-medium">pesanan tanpa sengketa</div>
            </div>
          </div>

          {/* Middle Placeholder */}
          <div className="lg:col-span-5 rounded-[24px] overflow-hidden border border-[#EBE2D9] shadow-xs">
            <ImagePlaceholder label="Dokumentasi Event Lapangan" iconSize={32} />
          </div>

          {/* Right Area Card */}
          <div className="lg:col-span-4 bg-[#3B2A22] text-white rounded-[24px] p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[11px] font-medium text-[#E8DDD0] mb-5">
                <MapPin size={12} className="text-[#C4A882]" />
                <span>Area Operasional</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold leading-snug text-white mb-2">
                Bogor dan sekitarnya: cara baru menyewa alat event
              </h3>
            </div>

            <div className="pt-6">
              <Link 
                to="/catalog"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#E8DDD0] hover:text-white transition-colors"
              >
                <span>Daftar Area Operasional</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ================= 7. TIPS & INSPIRATION ================= */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5">
        <div className="bg-[#F5EEE8] border border-[#EBE2D9] rounded-[32px] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-0.5">
                INSPIRASI
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#35261F]">Tips dan inspirasi acara</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-white border border-[#EBE2D9] flex items-center justify-center text-[#35261F] hover:bg-[#FDF8F2] shadow-xs transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 rounded-full bg-white border border-[#EBE2D9] flex items-center justify-center text-[#35261F] hover:bg-[#FDF8F2] shadow-xs transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {blogPosts.map((blog) => (
              <div 
                key={blog.id}
                className="bg-white rounded-2xl border border-[#EBE2D9] overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between group"
              >
                <div>
                  <div className="aspect-[16/10] overflow-hidden">
                    <ImagePlaceholder label="Ilustrasi Artikel" iconSize={24} />
                  </div>
                  <div className="p-4">
                    <span className="text-[9px] font-bold text-[#8C7A6B] tracking-wider block mb-1.5 uppercase">
                      {blog.tag}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-[#35261F] mb-1.5 leading-snug group-hover:text-[#8C7A6B] transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-[11px] text-[#8C7A6B] leading-relaxed line-clamp-3">
                      {blog.excerpt}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-[#F5EEE8]">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#35261F] group-hover:text-[#8C7A6B] transition-colors cursor-pointer">
                    <span>Baca artikel</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 8. LAYANAN VENDORIA ================= */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5">
        <div className="mb-4">
          <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-0.5">
            KENAPA VENDORIA
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#35261F]">Layanan Vendoria</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 01 - Brown card */}
          <div className="bg-[#3B2A22] text-white rounded-[24px] p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-3xl font-extrabold text-[#D4C4AE] mb-3">01</div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Verifikasi KYC & Reputasi</h3>
              <p className="text-xs text-[#D4C4AE] leading-relaxed">
                Setiap vendor melewati verifikasi identitas, NIB, dan penilaian kualitas berkala.
              </p>
            </div>
          </div>

          {/* Card 02 - White card */}
          <div className="bg-white text-[#35261F] rounded-[24px] p-6 sm:p-8 border border-[#EBE2D9] flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-3xl font-extrabold text-[#8C7A6B] mb-3">02</div>
              <h3 className="text-base sm:text-lg font-bold text-[#35261F] mb-2">Deposit Aman Terkelola</h3>
              <p className="text-xs text-[#8C7A6B] leading-relaxed">
                Dana jaminan dipegang escrow dan dirilis otomatis setelah serah terima valid.
              </p>
            </div>
          </div>

          {/* Card 03 - White card */}
          <div className="bg-white text-[#35261F] rounded-[24px] p-6 sm:p-8 border border-[#EBE2D9] flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-3xl font-extrabold text-[#8C7A6B] mb-3">03</div>
              <h3 className="text-base sm:text-lg font-bold text-[#35261F] mb-2">Bukti Foto & Solusi Klaim</h3>
              <p className="text-xs text-[#8C7A6B] leading-relaxed">
                Foto dua arah dan mediasi Admin menyelesaikan sengketa dengan adil.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
