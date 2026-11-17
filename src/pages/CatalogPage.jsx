import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  Star, 
  ShieldCheck, 
  Check, 
  Lock, 
  ArrowRight,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { products, categories } from '../data/mockData';
import ImagePlaceholder from '../components/ImagePlaceholder';

export default function CatalogPage() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'Semua (24)';

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Semua Lokasi');
  const [sortBy, setSortBy] = useState('popular');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('5000000');
  const [onlyKyc, setOnlyKyc] = useState(false);
  const [selectedRating, setSelectedRating] = useState('');
  const [conditionGradeA, setConditionGradeA] = useState(false);
  const [conditionVeryGood, setConditionVeryGood] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const toggleFavorite = (productId) => {
    setFavorites(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleResetFilters = () => {
    setSelectedCategory('Semua (24)');
    setSearchQuery('');
    setSelectedLocation('Semua Lokasi');
    setMinPrice('0');
    setMaxPrice('5000000');
    setOnlyKyc(false);
    setSelectedRating('');
    setConditionGradeA(false);
    setConditionVeryGood(false);
    setCurrentPage(1);
  };

  // Filter products logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Category filter
      if (selectedCategory !== 'Semua (24)') {
        const catName = selectedCategory.split(' (')[0].toLowerCase();
        if (!product.category.toLowerCase().includes(catName)) return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        const matchesVendor = product.vendor.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesVendor) return false;
      }

      // Location
      if (selectedLocation !== 'Semua Lokasi') {
        if (!product.location.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
      }

      // Price range
      const min = parseInt(minPrice) || 0;
      const max = parseInt(maxPrice) || 999999999;
      if (product.price < min || product.price > max) return false;

      // Rating
      if (selectedRating === '4.8' && product.rating < 4.8) return false;
      if (selectedRating === '4.5' && product.rating < 4.5) return false;
      if (selectedRating === '4.0' && product.rating < 4.0) return false;

      return true;
    });
  }, [selectedCategory, searchQuery, selectedLocation, minPrice, maxPrice, selectedRating]);

  // Pagination (6 items per page to match the screenshots like vendoria-16)
  const itemsPerPage = 6;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-[#FAF6F1] min-h-screen text-[#1A1A1A] pb-16">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <nav className="flex items-center gap-1.5 text-xs text-[#8B6F47]">
          <Link to="/" className="hover:text-[#3C2415] transition-colors">Beranda</Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-[#3C2415]">Katalog</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* TOP HEADER & SEARCH CARD */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#E8DDD0] shadow-sm">
          {/* Badge & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="inline-block bg-[#FAF6F1] border border-[#E8DDD0] px-3 py-1 rounded-full text-[11px] font-bold text-[#8B6F47] mb-2">
                24 Alat Siap Sewa
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#3C2415]">Katalog alat event</h1>
              <p className="text-xs sm:text-sm text-[#8B6F47] mt-1">
                Perlengkapan terkurasi dari vendor terverifikasi di Bogor dan Jabodetabek.
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-xs text-[#8B6F47]">Urutkan:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs font-semibold text-[#3C2415] focus:outline-none cursor-pointer"
              >
                <option value="popular">Paling populer</option>
                <option value="price-low">Harga terendah</option>
                <option value="price-high">Harga tertinggi</option>
                <option value="rating">Rating tertinggi</option>
              </select>
            </div>
          </div>

          {/* Big Search Bar Input */}
          <div className="bg-[#FAF6F1] border border-[#E8DDD0] rounded-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 mb-5">
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5">
              <Search size={18} className="text-[#8B6F47] shrink-0" />
              <input 
                type="text"
                placeholder="Cari sound system, tenda, lighting..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-[#3C2415] placeholder-[#8B6F47]/70 focus:outline-none"
              />
            </div>

            {/* Category Dropdown */}
            <div className="border-t md:border-t-0 md:border-l border-[#E8DDD0] px-3 py-1.5 flex items-center">
              <select 
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full md:w-auto bg-transparent text-xs font-semibold text-[#3C2415] focus:outline-none cursor-pointer"
              >
                <option value="Semua (24)">Semua kategori</option>
                <option value="Tenda & kanopi (6)">Tenda & kanopi</option>
                <option value="Sound system (5)">Sound system</option>
                <option value="Lighting & FX (4)">Lighting & FX</option>
                <option value="Dekorasi & pelaminan (3)">Dekorasi & pelaminan</option>
                <option value="Kursi & meja (3)">Kursi & meja</option>
                <option value="Panggung (3)">Panggung</option>
              </select>
            </div>

            {/* Location Tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8B6F47] border-l border-[#E8DDD0]">
              <MapPin size={14} />
              <span>Jabodetabek</span>
            </div>

            {/* Search Action Button */}
            <button 
              type="button"
              className="bg-[#3C2415] hover:bg-[#2A1A0E] text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-colors shrink-0"
            >
              <span>Cari alat</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Category Filter Pills Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              'Semua (24)',
              'Tenda & kanopi (6)',
              'Sound system (5)',
              'Lighting & FX (4)',
              'Dekorasi & pelaminan (3)',
              'Kursi & meja (3)',
              'Panggung (3)',
            ].map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'bg-[#3C2415] text-white shadow-sm'
                      : 'bg-[#FAF6F1] text-[#8B6F47] hover:bg-[#F0E8DE] border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden flex items-center justify-between">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="inline-flex items-center gap-2 bg-white border border-[#E8DDD0] px-4 py-2.5 rounded-xl text-xs font-bold text-[#3C2415]"
          >
            <SlidersHorizontal size={15} />
            <span>Filter Pencarian</span>
          </button>
          <span className="text-xs text-[#8B6F47]">
            {filteredProducts.length} alat ditemukan
          </span>
        </div>

        {/* MAIN LAYOUT: SIDEBAR + PRODUCT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT SIDEBAR FILTERS */}
          <aside className={`lg:col-span-3 ${mobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-[#E8DDD0] shadow-sm space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#F0E8DE] pb-4">
                <h3 className="text-base font-bold text-[#3C2415]">Filter pencarian</h3>
                <button 
                  onClick={handleResetFilters}
                  className="text-xs text-[#C0392B] hover:underline font-medium"
                >
                  Reset semua
                </button>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-xs font-bold text-[#3C2415] mb-2">
                  Tanggal acara sewa
                </label>
                <div className="space-y-2">
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs text-[#3C2415] focus:outline-none"
                  />
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs text-[#3C2415] focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex items-center gap-1.5 bg-[#27AE60]/10 text-[#27AE60] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold">
                  <Check size={13} className="stroke-[3]" />
                  <span>Bebas bentrok jadwal • stok aman</span>
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-xs font-bold text-[#3C2415] mb-2">
                  Harga sewa per hari
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <span className="text-[10px] text-[#8B6F47] block mb-1">Min</span>
                    <input 
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs text-[#3C2415] focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B6F47] block mb-1">Maks</span>
                    <input 
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs text-[#3C2415] focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-xs font-bold text-[#3C2415] mb-2">
                  Lokasi vendor
                </label>
                <select 
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-[#FAF6F1] border border-[#E8DDD0] rounded-xl px-3 py-2.5 text-xs text-[#3C2415] focus:outline-none font-semibold cursor-pointer"
                >
                  <option value="Semua Lokasi">Semua Lokasi</option>
                  <option value="Bogor">Kota & Kab. Bogor</option>
                  <option value="Depok">Depok</option>
                  <option value="Jakarta">Jakarta</option>
                  <option value="Tangerang">Tangerang</option>
                  <option value="Bekasi">Bekasi</option>
                </select>
              </div>

              {/* KYC Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={onlyKyc}
                    onChange={(e) => setOnlyKyc(e.target.checked)}
                    className="mt-0.5 rounded border-[#E8DDD0] text-[#3C2415] focus:ring-[#3C2415]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#3C2415] block">Hanya vendor terverifikasi KYC</span>
                    <span className="text-[10px] text-[#8B6F47]">Identitas & legalitas tervalidasi</span>
                  </div>
                </label>
              </div>

              {/* Rating Vendor Mitra */}
              <div>
                <label className="block text-xs font-bold text-[#3C2415] mb-2">
                  Rating vendor mitra
                </label>
                <div className="space-y-2">
                  {[
                    { val: '4.8', label: '4.8 ke atas', count: 14 },
                    { val: '4.5', label: '4.5 ke atas', count: 24 },
                    { val: '4.0', label: '4 ke atas', count: 24 },
                  ].map((r) => (
                    <label key={r.val} className="flex items-center justify-between text-xs text-[#3C2415] cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="ratingFilter"
                          checked={selectedRating === r.val}
                          onChange={() => setSelectedRating(r.val)}
                          className="text-[#3C2415] focus:ring-[#3C2415]"
                        />
                        <span>{r.label}</span>
                      </div>
                      <span className="text-[11px] text-[#8B6F47]">({r.count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Physical Condition Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-[#3C2415] mb-2">
                  Kondisi kelayakan fisik
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-[#3C2415] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={conditionGradeA}
                      onChange={(e) => setConditionGradeA(e.target.checked)}
                      className="rounded border-[#E8DDD0] text-[#3C2415] focus:ring-[#3C2415]"
                    />
                    <span>Seperti baru (Grade A)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#3C2415] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={conditionVeryGood}
                      onChange={(e) => setConditionVeryGood(e.target.checked)}
                      className="rounded border-[#E8DDD0] text-[#3C2415] focus:ring-[#3C2415]"
                    />
                    <span>Sangat baik (inspeksi siap pakai)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#F0E8DE]">
                <button 
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full bg-[#3C2415] hover:bg-[#2A1A0E] text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  Terapkan filter
                </button>
                <button 
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full bg-[#FAF6F1] hover:bg-[#F0E8DE] text-[#3C2415] py-2.5 rounded-xl text-xs font-bold transition-colors border border-[#E8DDD0]"
                >
                  Bersihkan
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT PRODUCT GRID SECTION */}
          <main className="lg:col-span-9 space-y-6">
            {/* Results Count Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8B6F47]">
                Menampilkan {paginatedProducts.length} dari {filteredProducts.length} alat event
              </span>
            </div>

            {/* Product Grid (3 Columns) */}
            {paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedProducts.map((product) => {
                  const isFav = favorites[product.id] || false;
                  return (
                    <div 
                      key={product.id}
                      className="bg-white rounded-2xl border border-[#E8DDD0] overflow-hidden hover:shadow-lg transition-all flex flex-col group"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-[4/3] bg-[#FAF6F1] overflow-hidden">
                        <ImagePlaceholder label="Foto Produk" iconSize={24} />
                        
                        {/* Status Badge */}
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            product.availableText === 'Sisa 1 Unit' 
                              ? 'bg-[#E67E22]/90' 
                              : 'bg-[#27AE60]/90'
                          } backdrop-blur-sm`}>
                            {product.availableText || 'Tersedia'}
                          </span>
                        </div>

                        {/* Heart Button */}
                        <button 
                          onClick={() => toggleFavorite(product.id)}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#3C2415] hover:bg-white transition-colors shadow-sm"
                        >
                          <Heart 
                            size={14} 
                            className={isFav ? "fill-[#C0392B] text-[#C0392B]" : "text-[#8B6F47]"} 
                          />
                        </button>
                      </div>

                      {/* Product Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[#8B6F47] uppercase tracking-wider block mb-1">
                            {product.category}
                          </span>
                          <Link to={`/product/${product.id}`}>
                            <h3 className="text-sm font-bold text-[#3C2415] hover:text-[#8B6F47] transition-colors line-clamp-2 leading-snug mb-2">
                              {product.name}
                            </h3>
                          </Link>

                          {/* Vendor info */}
                          <div className="flex items-center gap-1.5 text-xs text-[#8B6F47] mb-1">
                            <ShieldCheck size={13} className="text-[#27AE60]" />
                            <span className="truncate">{product.vendor}</span>
                          </div>

                          {/* Rating & Location */}
                          <div className="flex items-center gap-1.5 text-xs text-[#8B6F47] mb-3">
                            <div className="flex items-center text-amber-500 font-bold">
                              <Star size={12} className="fill-amber-400 text-amber-400 mr-0.5" />
                              <span>{product.rating}</span>
                            </div>
                            <span>({product.reviewCount})</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin size={11} />
                              {product.location}
                            </span>
                          </div>
                        </div>

                        {/* Price and CTA */}
                        <div className="pt-3 border-t border-[#F0E8DE] flex items-center justify-between">
                          <div>
                            <div className="text-sm font-extrabold text-[#3C2415]">
                              Rp{product.price.toLocaleString('id-ID')}
                              <span className="text-[11px] font-normal text-[#8B6F47]">/hari</span>
                            </div>
                          </div>
                          <Link 
                            to={`/product/${product.id}`}
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
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#E8DDD0]">
                <h3 className="text-base font-bold text-[#3C2415] mb-1">Tidak ada produk ditemukan</h3>
                <p className="text-xs text-[#8B6F47] mb-4">Coba sesuaikan kata kunci pencarian atau bersihkan filter.</p>
                <button
                  onClick={handleResetFilters}
                  className="bg-[#3C2415] text-white px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Reset Filter
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E8DDD0]">
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border border-[#E8DDD0] flex items-center justify-center text-xs font-bold text-[#3C2415] disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          isActive 
                            ? 'bg-[#3C2415] text-white'
                            : 'border border-[#E8DDD0] text-[#3C2415] hover:bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border border-[#E8DDD0] flex items-center justify-center text-xs font-bold text-[#3C2415] disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="text-xs text-[#8B6F47]">
                  Halaman {currentPage} dari {totalPages} (Total {filteredProducts.length} produk)
                </div>
              </div>
            )}

            {/* Escrow Bottom Banner */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8DDD0] flex items-center gap-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#FAF6F1] flex items-center justify-center text-[#3C2415] shrink-0 border border-[#E8DDD0]">
                <Lock size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#3C2415]">Deposit Escrow Vendoria</h4>
                <p className="text-[11px] text-[#8B6F47] mt-0.5">
                  Deposit setiap alat ditahan aman dan dikembalikan otomatis setelah serah terima valid.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
