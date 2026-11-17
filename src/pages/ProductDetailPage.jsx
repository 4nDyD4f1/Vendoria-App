import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  Star,
  MapPin,
  ShieldCheck,
  Lock,
  Camera,
  Heart,
  Share2,
  Check,
  CheckCircle2,
  Zap,
  ArrowRight,
  Calendar,
  Minus,
  Plus,
  Maximize2,
  Search,
  MessageCircle,
  Clock,
  Phone,
  AlertCircle
} from 'lucide-react';
import { products } from '../data/mockData';
import ImagePlaceholder from '../components/ImagePlaceholder';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('deskripsi'); // 'deskripsi' | 'kondisi' | 'ulasan' | 'kebijakan'
  const [activeThumbnail, setActiveThumbnail] = useState(0);
  const [unitCount, setUnitCount] = useState(1);
  const [startDate, setStartDate] = useState('2026-11-10');
  const [endDate, setEndDate] = useState('2026-11-13');
  const [isFavorited, setIsFavorited] = useState(false);

  // Default product data matching screenshot
  const product = {
    id: id || 'crossback-100',
    title: 'Paket 100 Kursi Crossback Kayu Jati',
    category: 'KURSI & MEJA',
    badge: 'Paket Pro',
    rating: 4.6,
    reviewCount: 57,
    vendorName: 'Griya Kursi Nusantara',
    vendorLocation: 'Jl. BSD Raya Barat No. 7, Tangerang',
    vendorOrders: '64+ pesanan selesai',
    vendorSince: 'Mitra Resmi sejak 2025',
    vendorHours: 'Buka 09.00 - 19.00 WIB',
    pricePerDay: 35000,
    depositPerUnit: 20000,
    logisticsCost: 250000,
    durationDays: 3,
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1000&q=80',
    ],
    thumbnailLabels: ['Tampak Depan', 'Port & Kabel', 'Uji Fungsi Nyala', 'Hardcase / Tas']
  };

  const rentalTotal = product.pricePerDay * product.durationDays * unitCount;
  const depositTotal = product.depositPerUnit * unitCount;
  const totalPayNow = rentalTotal + depositTotal + product.logisticsCost;

  return (
    <div className="bg-[#FAF6F1] min-h-screen text-[#1A1A1A] pb-16">
      {/* 1. BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <nav className="flex items-center gap-1.5 text-xs text-[#8B6F47] flex-wrap">
          <Link to="/" className="hover:text-[#3C2415] transition-colors">Beranda</Link>
          <ChevronRight size={13} />
          <Link to="/catalog" className="hover:text-[#3C2415] transition-colors">Katalog</Link>
          <ChevronRight size={13} />
          <span className="hover:text-[#3C2415] cursor-pointer">Kursi & meja</span>
          <ChevronRight size={13} />
          <span className="font-semibold text-[#3C2415]">{product.title}</span>
        </nav>
      </div>

      {/* TOP STATUS BADGES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-[#27AE60]/10 text-[#27AE60] text-xs font-bold px-3 py-1 rounded-full border border-[#27AE60]/20">
            <Check size={13} className="stroke-[3]" />
            <span>Stok Tersedia (Sisa 3 Unit)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white text-[#8B6F47] text-xs font-semibold px-3 py-1 rounded-full border border-[#E8DDD0]">
            <MapPin size={13} />
            <span>Bogor & Jabodetabek</span>
          </span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= LEFT COLUMN (~60%) ================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Visual Gallery Card */}
            <div className="bg-white rounded-[28px] p-5 border border-[#E8DDD0] shadow-sm">
              {/* Main Image View */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#2A1A0E]">
                <ImagePlaceholder label="Foto Produk Utama" iconSize={36} />

                {/* Badge Top Left */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Check size={12} className="text-[#27AE60] stroke-[3]" />
                  <span className="text-[11px] font-bold text-[#3C2415]">Inspeksi Siap Pakai • Grade A</span>
                </div>

                {/* Action Icons Top Right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#3C2415] hover:bg-white shadow-sm transition-colors">
                    <Search size={14} />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#3C2415] hover:bg-white shadow-sm transition-colors">
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>

              {/* Caption */}
              <div className="mt-3 text-center">
                <span className="text-[11px] text-[#8B6F47]">
                  Foto Asli Vendor Terverifikasi • Unit #BOG-1008
                </span>
              </div>

              {/* Thumbnails Row */}
              <div className="grid grid-cols-4 gap-2.5 mt-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveThumbnail(idx)}
                    className={`rounded-xl overflow-hidden border-2 transition-all p-0.5 text-left ${
                      activeThumbnail === idx 
                        ? 'border-[#3C2415] ring-2 ring-[#3C2415]/20' 
                        : 'border-[#E8DDD0] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-1">
                      <ImagePlaceholder label="" iconSize={16} />
                    </div>
                    <span className="block text-[10px] font-semibold text-center truncate text-[#3C2415]">
                      {product.thumbnailLabels[idx]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Feature Tags Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-[#F0E8DE]">
                {['Bahan Kokoh', 'Kondisi Bersih', 'Stack Hemat Ruang', 'Antar & Tata'].map((tag) => (
                  <div key={tag} className="flex items-center gap-1.5 text-xs text-[#3C2415] font-semibold">
                    <Check size={14} className="text-[#27AE60] shrink-0" />
                    <span>{tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Setup Promo Banner */}
            <div className="bg-[#3C2415] text-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <Zap size={18} className="text-[#C4A882]" />
                <span className="text-xs sm:text-sm font-bold">Setup Cepat & Penataan Layout Meja</span>
              </div>
              <button className="text-xs font-semibold text-[#E8DDD0] hover:text-white flex items-center gap-1 transition-colors">
                <span>Detail teknis</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* TABS CONTAINER */}
            <div className="bg-white rounded-[28px] p-6 border border-[#E8DDD0] shadow-sm">
              {/* Tabs Navigation Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-[#F0E8DE] no-scrollbar">
                {[
                  { id: 'deskripsi', label: 'Deskripsi & Spesifikasi' },
                  { id: 'kondisi', label: 'Kondisi Barang & SOP Serah Terima' },
                  { id: 'ulasan', label: `Ulasan Penyewa (${product.reviewCount})` },
                  { id: 'kebijakan', label: 'Kebijakan Deposit & Klaim' },
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

              {/* TAB 1: DESKRIPSI & SPESIFIKASI */}
              {activeTab === 'deskripsi' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#3C2415] mb-2">
                      Tentang Perlengkapan Furnitur Ini
                    </h3>
                    <p className="text-xs sm:text-sm text-[#8B6F47] leading-relaxed">
                      Furnitur acara dalam kondisi bersih dan terawat. Dikirim dalam kemasan aman dan dapat ditata langsung oleh tim vendor.
                    </p>
                  </div>

                  {/* 2 Feature Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Card 1 */}
                    <div className="bg-[#FAF6F1] rounded-2xl p-4 sm:p-5 border border-[#E8DDD0]">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#3C2415] mb-3">
                        Spesifikasi Furnitur
                      </h4>
                      <ul className="space-y-2.5 text-xs text-[#3C2415]">
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Rangka kayu jati atau besi powder coat</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Beban aman hingga 120 kg per kursi</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Bantalan duduk bersih dan mudah dilepas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Dapat ditumpuk untuk transportasi</span>
                        </li>
                      </ul>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-[#FAF6F1] rounded-2xl p-4 sm:p-5 border border-[#E8DDD0]">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#3C2415] mb-3">
                        Layanan Pendukung
                      </h4>
                      <ul className="space-y-2.5 text-xs text-[#3C2415]">
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Taplak dan cover opsional</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Penataan sesuai denah acara</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Penghitungan unit sebelum dan sesudah</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Pengambilan setelah acara</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Footnotes */}
                  <div className="bg-[#FAF6F1] rounded-xl p-3.5 border border-[#E8DDD0] space-y-1 text-xs text-[#8B6F47]">
                    <div><span className="font-semibold text-[#3C2415]">Kebutuhan Daya Listrik:</span> Tidak memerlukan daya</div>
                    <div><span className="font-semibold text-[#3C2415]">ID Inventaris:</span> VDR-K-2026-BO109</div>
                  </div>
                </div>
              )}

              {/* TAB 2: KONDISI BARANG & SOP SERAH TERIMA */}
              {activeTab === 'kondisi' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#3C2415] mb-2">
                      Kondisi barang & SOP serah terima
                    </h3>
                    <p className="text-xs sm:text-sm text-[#8B6F47] leading-relaxed">
                      Setiap unit diperiksa vendor dan didokumentasikan sebelum keluar gudang. Grade A: seperti baru, tanpa cacat fungsi maupun kosmetik.
                    </p>
                  </div>

                  {/* Steps 01 to 04 */}
                  <div className="space-y-3">
                    {[
                      {
                        num: '01',
                        title: 'Foto kondisi awal oleh vendor',
                        desc: 'Empat sudut: Tampak Depan, Port & Kabel, Uji Fungsi Nyala, Hardcase / Tas.',
                      },
                      {
                        num: '02',
                        title: 'Verifikasi bersama saat serah terima',
                        desc: 'Penyewa mencocokkan unit dengan foto dan menyetujui catatan kondisi.',
                      },
                      {
                        num: '03',
                        title: 'Foto pengembalian',
                        desc: 'Penyewa mengunggah empat foto yang sama setelah acara selesai.',
                      },
                      {
                        num: '04',
                        title: 'Inspeksi dan rilis deposit',
                        desc: 'Vendor memeriksa maksimal 3 jam; tanpa kendala deposit dirilis otomatis.',
                      },
                    ].map((step) => (
                      <div 
                        key={step.num}
                        className="bg-[#FAF6F1] rounded-2xl p-4 flex items-start gap-4 border border-[#E8DDD0]"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#3C2415] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {step.num}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#3C2415]">{step.title}</h4>
                          <p className="text-xs text-[#8B6F47] mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ULASAN PENYEWA */}
              {activeTab === 'ulasan' && (
                <div className="space-y-6">
                  {/* Rating Overview */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 bg-[#FAF6F1] rounded-2xl border border-[#E8DDD0]">
                    <div className="text-center sm:text-left sm:pr-6 sm:border-r border-[#E8DDD0]">
                      <div className="text-4xl font-extrabold text-[#3C2415]">{product.rating}</div>
                      <div className="flex items-center justify-center sm:justify-start text-amber-500 my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <div className="text-xs text-[#8B6F47]">{product.reviewCount} ulasan penyewa</div>
                    </div>

                    {/* Breakdown Bars */}
                    <div className="flex-1 space-y-1.5 text-xs">
                      {[
                        { star: 5, pct: '78%' },
                        { star: 4, pct: '14%' },
                        { star: 3, pct: '5%' },
                        { star: 2, pct: '2%' },
                        { star: 1, pct: '1%' },
                      ].map((bar) => (
                        <div key={bar.star} className="flex items-center gap-2">
                          <span className="w-3 text-right font-medium text-[#8B6F47]">{bar.star}</span>
                          <div className="flex-1 h-2 bg-[#E8DDD0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#3C2415] rounded-full" style={{ width: bar.pct }} />
                          </div>
                          <span className="w-8 text-right text-[11px] text-[#8B6F47]">{bar.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4 Review Cards in 2x2 Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        initials: 'AP',
                        name: 'Anindya Putri',
                        location: 'Bogor Tengah',
                        date: '12 Sep 2026',
                        stars: 5,
                        text: 'Tenda dan soundnya datang tepat waktu, kondisi barang persis seperti foto. Deposit kembali kurang dari tiga jam setelah pengembalian. Sangat tenang!',
                      },
                      {
                        initials: 'RM',
                        name: 'Rizky Maulana',
                        location: 'Depok',
                        date: '28 Agu 2026',
                        stars: 5,
                        text: 'Foto kondisi dua arah benar-benar membantu. Tidak ada drama potongan deposit karena semua tercatat rapi.',
                      },
                      {
                        initials: 'SN',
                        name: 'Salsabila Nur',
                        location: 'Bogor Barat',
                        date: '14 Agu 2026',
                        stars: 5,
                        text: 'Pelaminan minimalis yang kami sewa tampil mewah di foto. Tim dekornya sopan dan rapi sampai pembongkaran.',
                      },
                      {
                        initials: 'DP',
                        name: 'Dimas Prakoso',
                        location: 'Jakarta Selatan',
                        date: '03 Agu 2026',
                        stars: 4,
                        text: 'Lighting beam terang dan programming scene dibantu teknisi. Hanya sedikit terlambat 20 menit saat loading.',
                      },
                    ].map((rev, i) => (
                      <div key={i} className="bg-[#FAF6F1] rounded-2xl p-4 border border-[#E8DDD0] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#E8DDD0] text-[#3C2415] font-bold text-xs flex items-center justify-center">
                                {rev.initials}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-[#3C2415]">{rev.name}</h5>
                                <div className="text-[10px] text-[#8B6F47]">{rev.location} • {rev.date}</div>
                              </div>
                            </div>
                            <div className="flex text-amber-500">
                              {[...Array(rev.stars)].map((_, s) => (
                                <Star key={s} size={11} className="fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-[#3C2415] leading-relaxed mt-2 italic">
                            "{rev.text}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: KEBIJAKAN DEPOSIT & KLAIM */}
              {activeTab === 'kebijakan' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#3C2415] mb-2">
                      Kebijakan deposit & klaim
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Deposit Escrow */}
                    <div className="bg-[#FAF6F1] rounded-2xl p-5 border border-[#E8DDD0]">
                      <h4 className="text-sm font-bold text-[#3C2415] mb-3">Deposit Escrow</h4>
                      <ul className="space-y-2.5 text-xs text-[#3C2415]">
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Deposit Rp20.000 per unit ditahan di rekening bersama</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Dikembalikan 100% maksimal 3 jam setelah foto pengembalian valid</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Dibekukan hanya bila ada klaim yang sedang ditinjau</span>
                        </li>
                      </ul>
                    </div>

                    {/* Klaim & Mediasi */}
                    <div className="bg-[#FAF6F1] rounded-2xl p-5 border border-[#E8DDD0]">
                      <h4 className="text-sm font-bold text-[#3C2415] mb-3">Klaim & Mediasi</h4>
                      <ul className="space-y-2.5 text-xs text-[#3C2415]">
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Diajukan maksimal 3 hari setelah masa sewa</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Wajib melampirkan minimal 2 foto bukti</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#27AE60] shrink-0 mt-0.5" />
                          <span>Admin memutuskan: setujui, sebagian, atau tolak</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* VENDOR PROFILE SUMMARY CARD */}
            <div className="bg-white rounded-[28px] p-6 border border-[#E8DDD0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EBE2D9] text-[#3C2415] overflow-hidden flex items-center justify-center font-bold text-lg shrink-0">
                  <ImagePlaceholder label="" iconSize={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#3C2415]">{product.vendorName}</h4>
                  <div className="inline-block bg-[#FAF6F1] text-[#8B6F47] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#E8DDD0] my-1">
                    {product.vendorSince}
                  </div>
                  <div className="text-xs text-[#8B6F47] flex items-center gap-3 flex-wrap">
                    <span>{product.vendorOrders}</span>
                    <span>•</span>
                    <span>{product.vendorLocation}</span>
                  </div>
                  <div className="text-[11px] text-[#8B6F47] mt-0.5">
                    {product.vendorHours}
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                <button className="flex-1 sm:flex-none bg-[#3C2415] hover:bg-[#2A1A0E] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors">
                  Hubungi Vendor
                </button>
                <Link 
                  to="/vendor/1"
                  className="flex-1 sm:flex-none bg-[#FAF6F1] hover:bg-[#F0E8DE] text-[#3C2415] px-4 py-2 rounded-xl text-xs font-semibold transition-colors border border-[#E8DDD0] text-center"
                >
                  Lihat Profil Vendor
                </Link>
              </div>
            </div>

            {/* "ALAT LAIN DARI VENDOR INI" */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8B6F47] tracking-wider block">
                    Dari Vendor yang Sama
                  </span>
                  <h3 className="text-lg font-bold text-[#3C2415]">Alat Lain dari Vendor Ini</h3>
                </div>
                <Link to="/vendor/1" className="text-xs font-bold text-[#3C2415] hover:text-[#8B6F47] flex items-center gap-1">
                  <span>Lihat Semua (3)</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    title: 'Meja Bundar 10',
                    price: 'Rp85.000',
                    rating: 4.5,
                    reviews: 31,
                    img: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80',
                  },
                  {
                    title: 'Kursi Futura',
                    price: 'Rp8.000',
                    rating: 4.5,
                    reviews: 44,
                    img: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-[#E8DDD0] overflow-hidden p-3 flex flex-col justify-between">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-[#FAF6F1]">
                      <ImagePlaceholder label="Foto Produk" iconSize={18} />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#8B6F47] uppercase">Kursi & Meja</span>
                      <h4 className="text-xs font-bold text-[#3C2415] truncate">{item.title}</h4>
                      <div className="text-[10px] text-[#8B6F47] flex items-center gap-1 my-1">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span>{item.rating} ({item.reviews})</span>
                      </div>
                      <div className="text-xs font-extrabold text-[#3C2415]">{item.price}<span className="text-[10px] font-normal text-[#8B6F47]">/hari</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~40%) - STICKY BOOKING CARD ================= */}
          <div className="lg:col-span-5 sticky top-20">
            <div className="bg-white rounded-[28px] p-6 border border-[#E8DDD0] shadow-lg space-y-5">
              {/* Category & Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8B6F47] uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="bg-[#FAF6F1] text-[#8B6F47] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#E8DDD0]">
                  {product.badge}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-[#3C2415] leading-snug">
                {product.title}
              </h2>

              {/* Rating & Vendor info */}
              <div className="flex items-center gap-2 text-xs text-[#8B6F47] flex-wrap">
                <div className="flex items-center text-amber-500 font-bold">
                  <Star size={13} className="fill-amber-400 text-amber-400 mr-0.5" />
                  <span>{product.rating}</span>
                </div>
                <span>({product.reviewCount} ulasan)</span>
                <span>•</span>
                <Link to="/vendor/1" className="text-[#3C2415] font-semibold hover:underline">
                  {product.vendorName}
                </Link>
              </div>

              {/* KYC Status Badge */}
              <div>
                <span className="inline-flex items-center gap-1.5 bg-[#FAF6F1] text-[#8B6F47] text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#E8DDD0]">
                  <ShieldCheck size={13} className="text-[#8B6F47]" />
                  <span>KYC Menunggu</span>
                </span>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#3C2415]">
                    Rp{product.pricePerDay.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-[#8B6F47] ml-1">/hari</span>
                </div>
                <span className="text-[11px] font-semibold text-[#27AE60] bg-[#27AE60]/10 px-2.5 py-1 rounded-full">
                  Tersedia untuk tanggal pilihanmu
                </span>
              </div>

              {/* Date Selectors */}
              <div className="space-y-1.5 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#8B6F47] uppercase block mb-1">Mulai</label>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs font-semibold text-[#3C2415] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8B6F47] uppercase block mb-1">Selesai</label>
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs font-semibold text-[#3C2415] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-[#8B6F47] flex items-center gap-1 pt-1">
                  <Calendar size={12} />
                  <span>Durasi: {product.durationDays} Hari</span>
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-bold text-[#3C2415]">Jumlah unit</div>
                  <div className="text-[10px] text-[#8B6F47]">(maks. 3 unit)</div>
                </div>
                <div className="flex items-center gap-3 bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-1.5">
                  <button 
                    onClick={() => setUnitCount(u => Math.max(1, u - 1))}
                    disabled={unitCount <= 1}
                    className="text-[#3C2415] disabled:opacity-30 hover:scale-110 transition-transform"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xs font-bold text-[#3C2415] w-4 text-center">{unitCount}</span>
                  <button 
                    onClick={() => setUnitCount(u => Math.min(3, u + 1))}
                    disabled={unitCount >= 3}
                    className="text-[#3C2415] disabled:opacity-30 hover:scale-110 transition-transform"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Price Breakdown Box */}
              <div className="bg-[#FAF6F1] rounded-2xl p-4 border border-[#E8DDD0] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#8B6F47]">
                  <span>Biaya Sewa ({product.durationDays} hari x {unitCount} unit)</span>
                  <span className="font-semibold text-[#3C2415]">Rp{rentalTotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between text-[#8B6F47]">
                  <span>Deposit Jaminan Escrow</span>
                  <span className="font-semibold text-[#3C2415]">Rp{depositTotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between text-[#8B6F47]">
                  <span>Jasa Teknis & Transport Logistik</span>
                  <span className="font-semibold text-[#3C2415]">Rp{product.logisticsCost.toLocaleString('id-ID')}</span>
                </div>
                <div className="pt-2 border-t border-[#E8DDD0] flex items-center justify-between text-sm font-extrabold text-[#3C2415]">
                  <span>Total Bayar Sekarang</span>
                  <span>Rp{totalPayNow.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Escrow note */}
              <div className="bg-[#FAF6F1] rounded-xl p-3 border border-[#E8DDD0] flex items-start gap-2.5">
                <Lock size={15} className="text-[#3C2415] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#8B6F47] leading-relaxed">
                  Deposit 100% dikembalikan otomatis ke rekening Anda setelah sewa selesai & foto serah terima tervalidasi maksimal 3 jam.
                </p>
              </div>

              {/* Main Booking Button */}
              <button 
                type="button"
                className="w-full bg-[#3C2415] hover:bg-[#2A1A0E] text-white py-3.5 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>Sewa Sekarang</span>
                <ArrowRight size={14} />
              </button>

              {/* Cart and Wishlist Row */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  className="flex-1 bg-[#FAF6F1] hover:bg-[#F0E8DE] text-[#3C2415] py-3 rounded-full text-xs font-bold border border-[#E8DDD0] transition-colors flex items-center justify-center gap-2"
                >
                  <span>Tambah ke Keranjang</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIsFavorited(!isFavorited)}
                  className="w-11 h-11 rounded-full bg-[#FAF6F1] hover:bg-[#F0E8DE] border border-[#E8DDD0] flex items-center justify-center text-[#3C2415] transition-colors shrink-0"
                >
                  <Heart size={16} className={isFavorited ? "fill-[#C0392B] text-[#C0392B]" : ""} />
                </button>
              </div>

              {/* Guarantees List */}
              <div className="pt-3 border-t border-[#F0E8DE] space-y-2 text-xs text-[#8B6F47]">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#27AE60]" />
                  <span>Vendor terverifikasi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-[#3C2415]" />
                  <span>Dana escrow aman</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera size={14} className="text-[#3C2415]" />
                  <span>Bukti foto 2 arah</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
