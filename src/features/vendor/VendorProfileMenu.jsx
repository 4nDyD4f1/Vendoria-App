import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, LoaderCircle, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { vendorAssets } from './vendorAssets';

export default function VendorProfileMenu({ owner, roleLabel = 'Pemilik', menuLabel = 'Menu akun vendor', portal = false, businessName = '' }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const menuId = useId();
  const [openRoute, setOpenRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const open = openRoute === location.key;
  const initials = owner.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');

  useLayoutEffect(() => {
    if (open) menu.current?.querySelector('[role=menuitem]')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpenRoute(null); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, [open]);

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Reuse the existing session logout. The public preview has no session to clear.
      // Keep retrying logout after an error even if AuthContext has cleared its local user.
      if (user || error) await logout();
      navigate('/', { replace: true });
    } catch {
      setError('Belum bisa keluar. Silakan coba lagi.');
      setBusy(false);
    }
  };

  return <div className="v-profile-menu" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpenRoute(null); trigger.current?.focus(); }
    if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const items = [...menu.current.querySelectorAll('[role=menuitem]:not(:disabled)')];
      const index = items.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
      items[next]?.focus();
    }
  }}>
    <button className="v-user-menu" ref={trigger} type="button" aria-label={`Menu profil ${roleLabel.toLowerCase()}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpenRoute(open ? null : location.key)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); setOpenRoute(location.key); menu.current?.querySelector('[role=menuitem]')?.focus(); }
    }}>
      <span className="v-profile-avatar">{owner.foto_profil ? <img src={owner.foto_profil} alt="" referrerPolicy="no-referrer" /> : portal ? <img src={vendorAssets.profile} alt="" /> : initials}</span>
      <div><strong title={portal ? businessName : owner.name}>{portal ? businessName : owner.name.trim().split(/\s+/)[0]}</strong>{!portal && <small>{roleLabel}</small>}</div>
      {!portal && <ChevronDown size={14} className="v-profile-chevron" aria-hidden="true" />}
    </button>
    {open && <div className="v-profile-dropdown" id={menuId} ref={menu} role="menu" aria-label={menuLabel}>
      <div className="v-profile-dropdown-identity" role="presentation"><span className="v-profile-avatar" aria-hidden="true">{owner.foto_profil ? <img src={owner.foto_profil} alt="" referrerPolicy="no-referrer" /> : initials}</span><div><strong>{owner.name}</strong><small>{roleLabel} workspace</small></div></div>
      <div className="v-profile-dropdown-actions" role="presentation">{portal && [['Profil pemilik', 'pengaturan'], ['Profil bisnis', 'profil-bisnis'], ['Verifikasi KYC', 'kyc'], ['Keamanan', 'keamanan']].map(([label, path]) => <Link className="vp-profile-link" key={path} role="menuitem" to={`/vendor/${path}`} onClick={() => setOpenRoute(null)}>{label}</Link>)}<button className="v-profile-logout" role="menuitem" type="button" onClick={leave} disabled={busy} aria-busy={busy}>
        <span className="v-profile-logout-icon">{busy ? <LoaderCircle size={17} className="v-profile-spinner" /> : <LogOut size={17} strokeWidth={1.7} />}</span>
        <span><strong>{busy ? 'Sedang keluar…' : 'Keluar'}</strong><small>Akhiri sesi Anda</small></span>
      </button></div>
      {error && <p className="v-profile-logout-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
