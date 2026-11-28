import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Heart, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import header from './designs/header.json';
import { descendants } from './treeWalk';
import { useWishlist } from './useWishlist';
import './wishlist.css';
import CustomerNotifications from './CustomerNotifications';

const logo = descendants(header, node => node.tag === 'img')[0].props.src;
const links = [['Beranda', '/'], ['Katalog', '/catalog'], ['Cara Sewa', '/cara-sewa'], ['Pesanan Saya', '/pesanan']];

export default function InterfaceHeader({ preview, go, activeLabel, cartCount = 0, unread = 3 }) {
  const { user, loading, logout } = useAuth();
  const { items: wishlist, ready: wishlistReady } = useWishlist(user, preview);
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationState, setNotificationState] = useState(null);
  const customer = !preview && user?.role === 'customer';
  const notificationOpen = notificationState?.key === location.key ? notificationState.open : Boolean(location.state?.customerNotificationsOpen);
  const setNotificationOpen = value => { setNotificationState({ key: location.key, open: value }); if (value) setProfileOpen(false); };
  const active = location.pathname;
  const guestActions = (
    <div className="flex items-center gap-4" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", lineHeight: 1.5 }}>
      <Link to="/login" className="text-[13px] font-semibold text-[#35261F] hover:opacity-80 transition-opacity">Masuk</Link>
      <Link to="/register" className="bg-[#35261F] hover:bg-[#231813] text-white px-5 py-2 rounded-full text-[13px] font-semibold transition-all shadow-xs">Daftar</Link>
    </div>
  );
  return <header className="interface-header">
    <div className="interface-header-inner">
      <Link to={preview ? '/interface-review/home' : '/'} className="interface-brand" aria-label="Vendoria — Beranda"><img src={logo} alt="" width="40" height="40" /><span>Vendoria</span></Link>
      <nav className="interface-nav" aria-label="Navigasi utama">
        {links.map(([label, href]) => <button type="button" key={href} onClick={() => go(href)} className={(activeLabel !== undefined ? activeLabel === label : href === '/' ? active === '/' || active.endsWith('/home') : active.startsWith(href)) ? 'is-current' : ''}>{label}</button>)}
      </nav>
      <div className="interface-header-actions">
        {loading && !preview ? null : user || preview ? <>
          <button type="button" aria-label="Cari" onClick={() => go('/catalog?search=1')}><Search size={18} strokeWidth={1.7} /></button>
          {customer ? <CustomerNotifications key={user.user_id} open={notificationOpen} onOpenChange={setNotificationOpen} /> : <button type="button" className="interface-bell" aria-label={`Notifikasi, ${unread} belum dibaca`} onClick={() => go('/notifikasi/menu')}><Bell size={18} strokeWidth={1.7} />{unread > 0 && <span>{unread}</span>}</button>}
          <button type="button" className="interface-bell" aria-label={wishlistReady ? `Wishlist, ${wishlist.length} alat` : 'Wishlist'} onClick={() => go('/wishlist')}><Heart size={18} strokeWidth={1.7} />{wishlistReady && wishlist.length > 0 && <span>{wishlist.length}</span>}</button>
          <button type="button" className="interface-bell" aria-label={`Keranjang, ${cartCount} item`} onClick={() => go('/keranjang')}><ShoppingCart size={18} strokeWidth={1.7} />{cartCount > 0 && <span>{cartCount}</span>}</button>
          <div className="interface-profile-wrap">
            <button type="button" className="interface-profile" aria-expanded={profileOpen} onClick={() => { setNotificationOpen(false); setProfileOpen(value => !value); }}><span>{user?.foto_profil ? <img src={user.foto_profil} alt="" referrerPolicy="no-referrer" /> : <User size={16} strokeWidth={1.7} />}</span>{user?.nama?.trim().split(/\s+/)[0] || 'Profil'}</button>
            {profileOpen && <div className="interface-profile-menu">
              <button type="button" onClick={() => { setProfileOpen(false); go('/akun'); }}>Pengaturan Akun</button>
              <button type="button" onClick={() => { setProfileOpen(false); go('/kyc'); }}>Verifikasi KYC</button>
              {user?.role === 'vendor' && <button type="button" onClick={() => go('/vendor/dashboard')}>Dashboard Vendor</button>}
              {user?.role === 'admin' && <button type="button" onClick={() => go('/admin')}>Dashboard Admin</button>}
              <button type="button" onClick={async () => { setProfileOpen(false); if (preview) go('/'); else { await logout(); navigate('/'); } }}>Keluar</button>
            </div>}
          </div>
        </> : guestActions}
      </div>
      <button type="button" className="interface-mobile-toggle" aria-label="Buka navigasi" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
    </div>
    {open && <div className="interface-mobile-menu">
      {links.map(([label, href]) => <button type="button" key={href} onClick={() => { setOpen(false); go(href); }}>{label}</button>)}
      {user || preview ? [['Wishlist', '/wishlist'], ['Keranjang', '/keranjang'], ['Notifikasi', '/notifikasi'], ['Profil Saya', '/akun']].map(([label, href]) => <button type="button" key={href} onClick={() => { setOpen(false); if (customer && label === 'Notifikasi') setNotificationOpen(true); else go(href); }}>{label}</button>) : guestActions}
    </div>}
  </header>;
}
