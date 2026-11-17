import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Package,
  Calendar,
  Clock,
  ShieldCheck,
  Lock,
  Camera,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Star,
  MapPin,
  MessageSquare
} from 'lucide-react';
import ImagePlaceholder from '../components/ImagePlaceholder';

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');

  const orders = [
    {
      id: 'VDR-2026-8812',
      dateRange: '10 Nov - 13 Nov 2026 (3 Hari)',
      status: 'active',
      statusLabel: 'Sedang Disewa',
      statusColor: 'bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/20',
      vendor: 'Griya Kursi Nusantara',
      location: 'Tangerang',
      productName: 'Paket 100 Kursi Crossback Kayu Jati',
      category: 'KURSI & MEJA',
      qty: 1,
      rentalPrice: 105000,
      depositAmount: 20000,
      logisticsCost: 250000,
      totalPaid: 375000,
      escrowNotice: 'Deposit Rp20.000 tersimpan aman di rekening escrow Vendoria.',
      actionPrimary: 'Unggah Foto Serah Terima',
      actionSecondary: 'Hubungi Vendor',
      dueDate: 'Pengembalian: 13 Nov 2026, 17:00 WIB'
    },
    {
      id: 'VDR-2026-7490',
      dateRange: '02 Nov - 05 Nov 2026 (3 Hari)',
      status: 'inspecting',
      statusLabel: 'Menunggu Inspeksi & Rilis Deposit',
      statusColor: 'bg-[#E67E22]/10 text-[#E67E22] border-[#E67E22]/20',
      vendor: 'Karya Audio Pro Bogor',
      location: 'Bogor',
      productName: 'Set Line Array 5000W + Digital Mixer 32-Channel',
      category: 'SOUND SYSTEM',
      qty: 1,
      rentalPrice: 1850000,
      depositAmount: 200000,
      logisticsCost: 300000,
      totalPaid: 235000,
      escrowNotice: 'Foto 4 sudut selesai diunggah. Vendor sedang memeriksa kondisi barang (maks. 3 jam).',
      actionPrimary: 'Lihat Bukti Foto 4 Sudut',
      actionSecondary: 'Bantuan Mediasi',
      dueDate: 'Selesai: 05 Nov 2026'
    },
    {
      id: 'VDR-2026-6102',
      dateRange: '12 Okt - 14 Okt 2026 (2 Hari)',
      status: 'completed',
      statusLabel: 'Selesai (Deposit Dikembalikan)',
      statusColor: 'bg-[#35261F]/10 text-[#35261F] border-[#35261F]/20',
      vendor: 'Luminary Stage Lighting Bogor',
      location: 'Bogor',
      productName: 'Moving Head Beam 230W 7R + Par LED RGBW (8 Unit)',
      category: 'LIGHTING & FX',
      qty: 1,
      rentalPrice: 1450000,
      depositAmount: 150000,
      logisticsCost: 200000,
      totalPaid: 1800000,
      escrowNotice: 'Deposit Rp150.000 telah dikembalikan 100% ke rekening Anda tanpa potongan.',
      actionPrimary: 'Beri Ulasan',
      actionSecondary: 'Sewa Lagi',
      dueDate: 'Selesai: 14 Okt 2026'
    }
  ];

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'active' && order.status !== 'active') return false;
    if (activeTab === 'inspecting' && order.status !== 'inspecting') return false;
    if (activeTab === 'completed' && order.status !== 'completed') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        order.productName.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        order.vendor.toLowerCase().includes(q)
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
          <span className="font-semibold text-[#35261F]">Pesanan Saya</span>
        </nav>
      </div>

      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 space-y-6">
        
        {/* 2. HEADER CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#EBE2D9] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-block bg-[#F5EEE8] border border-[#EBE2D9] px-3 py-1 rounded-full text-[11px] font-bold text-[#8C7A6B] mb-2">
                Riwayat & Status Sewa
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#35261F]">Pesanan Saya</h1>
              <p className="text-xs sm:text-sm text-[#8C7A6B] mt-1">
                Pantau status serah terima alat, jadwal pengembalian, dan pencairan deposit escrow Anda.
              </p>
            </div>

            {/* Quick summary pill */}
            <div className="flex items-center gap-3 bg-[#F5EEE8] border border-[#EBE2D9] rounded-2xl p-3 text-xs">
              <div className="w-9 h-9 rounded-xl bg-[#35261F] text-white flex items-center justify-center font-bold">
                <Lock size={16} />
              </div>
              <div>
                <div className="text-[10px] text-[#8C7A6B] uppercase font-bold">Dana Terlindungi</div>
                <div className="text-sm font-extrabold text-[#35261F]">Rp220.000 di Escrow</div>
              </div>
            </div>
          </div>

          {/* Search bar & Tabs */}
          <div className="mt-6 pt-6 border-t border-[#F5EEE8] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'semua', label: 'Semua (3)' },
                { id: 'active', label: 'Sedang Disewa (1)' },
                { id: 'inspecting', label: 'Menunggu Inspeksi (1)' },
                { id: 'completed', label: 'Selesai (1)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#35261F] text-white shadow-xs'
                      : 'bg-[#F5EEE8] text-[#6F5E52] hover:text-[#35261F]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B]" />
              <input 
                type="text"
                placeholder="Cari no. pesanan atau alat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F5EEE8] border border-[#EBE2D9] rounded-xl pl-9 pr-3 py-2 text-xs text-[#35261F] focus:outline-none placeholder-[#8C7A6B]"
              />
            </div>

          </div>
        </div>

        {/* 3. ORDER CARDS LIST */}
        <div className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div 
                key={order.id}
                className="bg-white rounded-[24px] border border-[#EBE2D9] p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow space-y-4"
              >
                {/* Top Strip: Order ID, Date & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#F5EEE8]">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-extrabold text-[#35261F]">
                      #{order.id}
                    </span>
                    <span className="text-xs text-[#8C7A6B] flex items-center gap-1">
                      <Calendar size={13} />
                      {order.dateRange}
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${order.statusColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{order.statusLabel}</span>
                  </span>
                </div>

                {/* Main Order Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  
                  {/* Left: Thumbnail Placeholder */}
                  <div className="md:col-span-3 sm:col-span-4 aspect-[4/3] rounded-2xl overflow-hidden bg-[#F5EEE8] max-w-[200px]">
                    <ImagePlaceholder label="Foto Alat" iconSize={24} />
                  </div>

                  {/* Middle: Details */}
                  <div className="md:col-span-5 sm:col-span-8 space-y-2">
                    <span className="text-[9px] font-bold text-[#8C7A6B] uppercase tracking-wider block">
                      {order.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#35261F] leading-snug">
                      {order.productName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#8C7A6B]">
                      <ShieldCheck size={13} className="text-[#27AE60]" />
                      <span className="font-semibold text-[#35261F]">{order.vendor}</span>
                      <span>•</span>
                      <span>{order.location}</span>
                    </div>
                    <div className="text-xs text-[#8C7A6B]">
                      Jumlah: <span className="font-bold text-[#35261F]">{order.qty} Unit</span>
                    </div>
                  </div>

                  {/* Right: Pricing Breakdown & Payment Summary */}
                  <div className="md:col-span-4 bg-[#FDF8F2] border border-[#EBE2D9] rounded-2xl p-4 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Biaya Sewa</span>
                      <span className="font-semibold text-[#35261F]">Rp{order.rentalPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Deposit Escrow</span>
                      <span className="font-semibold text-[#35261F]">Rp{order.depositAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Logistik & Teknisi</span>
                      <span className="font-semibold text-[#35261F]">Rp{order.logisticsCost.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="pt-2 border-t border-[#EBE2D9] flex justify-between text-sm font-extrabold text-[#35261F]">
                      <span>Total Pembayaran</span>
                      <span>Rp{order.totalPaid.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                </div>

                {/* Escrow Guarantee Strip */}
                <div className="bg-[#F5EEE8] rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[#35261F]">
                    <Lock size={14} className="text-[#35261F] shrink-0" />
                    <span>{order.escrowNotice}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#8C7A6B]">
                    {order.dueDate}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                  <button 
                    type="button"
                    className="bg-[#F5EEE8] hover:bg-[#EBE2D9] text-[#35261F] border border-[#EBE2D9] px-4 py-2.5 rounded-full text-xs font-bold transition-colors text-center"
                  >
                    {order.actionSecondary}
                  </button>
                  <button 
                    type="button"
                    className="bg-[#35261F] hover:bg-[#231813] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-colors shadow-xs text-center flex items-center justify-center gap-1.5"
                  >
                    <Camera size={13} />
                    <span>{order.actionPrimary}</span>
                  </button>
                </div>

              </div>
            ))
          ) : (
            <div className="bg-white rounded-[24px] p-12 text-center border border-[#EBE2D9]">
              <Package size={36} className="mx-auto text-[#8C7A6B] mb-3 opacity-60" />
              <h3 className="text-base font-bold text-[#35261F] mb-1">Belum ada pesanan pada kategori ini</h3>
              <p className="text-xs text-[#8C7A6B] mb-5">Jelajahi ribuan pilihan perlengkapan event terkurasi untuk acaramu.</p>
              <Link 
                to="/catalog"
                className="inline-flex items-center gap-2 bg-[#35261F] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xs"
              >
                <span>Cari Alat di Katalog</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
