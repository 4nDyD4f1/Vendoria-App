import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Heart,
  ShoppingCart,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import VendoriaLogo from './VendoriaLogo';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const currentPath = location.pathname;
  const firstName = user?.nama?.trim().split(/\s+/)[0] || 'Profil';

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Beranda', href: '/' },
    { label: 'Katalog', href: '/catalog' },
    { label: 'Cara Sewa', href: '/cara-sewa' },
    { label: 'Pesanan Saya', href: '/pesanan' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FDF8F2]/95 backdrop-blur-md transition-all">
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
        
        {/* ================= 1. BRAND LOGO ================= */}
        <VendoriaLogo variant="dark" size="md" />

        {/* ================= 2. CENTER CAPSULE NAVIGATION ================= */}
        <nav className="hidden lg:flex items-center">
          <div className="bg-[#F5EEE8] rounded-full p-1 flex items-center shadow-xs">
            {navLinks.map((link) => {
              const isActive = 
                link.href === '/' 
                  ? currentPath === '/' 
                  : currentPath.startsWith(link.href);
              
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`px-5 py-2 rounded-full text-[13px] transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#35261F] text-white font-semibold shadow-xs'
                      : 'text-[#6F5E52] hover:text-[#35261F] font-medium'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ================= 3. RIGHT ICONS & PROFILE ================= */}
        <div className="hidden lg:flex items-center gap-5">
          {loading ? null : user ? (
            <>
              {/* Search Icon */}
              <Link 
                to="/catalog" 
                className="text-[#35261F] hover:opacity-75 transition-opacity"
                title="Cari"
              >
                <Search size={19} strokeWidth={1.8} />
              </Link>

              {/* Notification Bell with Badge 6 */}
              <div 
                className="relative text-[#35261F] hover:opacity-75 transition-opacity cursor-pointer"
                title="Notifikasi"
              >
                <Bell size={19} strokeWidth={1.8} />
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B33927] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                  6
                </span>
              </div>

              {/* Wishlist Heart */}
              <Link 
                to="/catalog" 
                className="text-[#35261F] hover:opacity-75 transition-opacity"
                title="Favorit"
              >
                <Heart size={19} strokeWidth={1.8} />
              </Link>

              {/* Cart Icon */}
              <Link 
                to="/catalog" 
                className="text-[#35261F] hover:opacity-75 transition-opacity"
                title="Keranjang"
              >
                <ShoppingCart size={19} strokeWidth={1.8} />
              </Link>

              {/* Vertical Subtle Divider */}
              <div className="w-[1px] h-6 bg-[#EBE2D9] mx-0.5" />

              {/* Profile Pill */}
              <Link 
                to="/kyc" 
                className="flex items-center gap-2.5 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span className="w-8 h-8 rounded-full bg-[#EFE6DD] flex items-center justify-center text-[#35261F] overflow-hidden">
                  {user.foto_profil ? <img src={user.foto_profil} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User size={16} strokeWidth={1.8} />}
                </span>
                <span className="text-[13px] font-semibold text-[#35261F]">
                  {firstName}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="text-[#35261F] hover:opacity-75 transition-opacity"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut size={18} strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-[13px] font-semibold text-[#35261F] hover:opacity-80 transition-opacity"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="bg-[#35261F] hover:bg-[#231813] text-white px-5 py-2 rounded-full text-[13px] font-semibold transition-all shadow-xs"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>

        {/* ================= MOBILE HAMBURGER ================= */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-xl bg-[#F5EEE8] text-[#35261F]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ================= MOBILE EXPANDED MENU ================= */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#EBE2D9] bg-[#FDF8F2] px-6 py-4 space-y-3 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  (link.href === '/' && currentPath === '/') || (link.href !== '/' && currentPath.startsWith(link.href))
                    ? 'bg-[#35261F] text-white'
                    : 'text-[#6F5E52] hover:bg-[#F5EEE8]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {loading ? null : user ? (
            <div className="pt-3 border-t border-[#EBE2D9] flex items-center justify-between">
              <Link
                to="/kyc"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-xs font-bold text-[#35261F]"
              >
                <span className="w-7 h-7 rounded-full bg-[#EFE6DD] flex items-center justify-center overflow-hidden">
                  {user.foto_profil ? <img src={user.foto_profil} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User size={14} />}
                </span>
                <span>{firstName}</span>
              </Link>
              <div className="flex items-center gap-3 text-[#35261F]">
                <Link to="/catalog" onClick={() => setMobileOpen(false)}><Search size={18} /></Link>
                <Link to="/catalog" onClick={() => setMobileOpen(false)}><Bell size={18} /></Link>
                <Link to="/catalog" onClick={() => setMobileOpen(false)}><ShoppingCart size={18} /></Link>
                <button type="button" onClick={handleLogout} aria-label="Keluar"><LogOut size={18} /></button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#EBE2D9] flex items-center gap-4">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="text-[13px] font-semibold text-[#35261F] hover:opacity-80 transition-opacity"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="bg-[#35261F] hover:bg-[#231813] text-white px-5 py-2 rounded-full text-[13px] font-semibold transition-all shadow-xs"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
