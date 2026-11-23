import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Bell, Building2, ChevronRight, CircleHelp, ClipboardList, CreditCard, FileCheck2, LayoutDashboard, Menu, Package, Search, ShieldCheck, Truck, UserRound, X } from 'lucide-react';
import VendorDashboard from './VendorDashboard';
import VendorResource from './VendorResource';
import VendorSettings from './VendorSettings';
import VendorProfileMenu from './VendorProfileMenu';
import { VendorNotifications, VendorSearch } from './VendorActivity';
import { EmptyState, PageHeading } from './VendorUi';
import { initialData, initialNotifications, resources } from './vendorData';
import '../interface/interface.css';
import './vendor.css';

const menuGroups = [
  { label: 'WORKSPACE', items: [['Dashboard', 'dashboard', LayoutDashboard], ['Pencarian', 'pencarian', Search]] },
  { label: 'OPERASIONAL', items: [['Katalog alat', 'katalog', Package], ['Pesanan', 'pesanan', ClipboardList], ['Serah terima', 'serah-terima', Truck], ['Klaim', 'klaim', CircleHelp], ['Pencairan dana', 'pencairan', CreditCard]] },
  { label: 'PENGATURAN', items: [['Profil bisnis', 'profil-bisnis', Building2], ['Profil pemilik', 'pengaturan', UserRound], ['Verifikasi KYC', 'kyc', FileCheck2], ['Keamanan', 'keamanan', ShieldCheck]] },
];
const titles = Object.fromEntries(menuGroups.flatMap(group => group.items.map(([title, path]) => [path, title])));

export default function VendorWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.replace(/^\/vendor\/?/, '').split('/').filter(Boolean);
  const page = segments[0] || 'dashboard';
  const resourceKey = Object.keys(resources).find(key => resources[key].path === page);
  const [data, setData] = useState(() => structuredClone(initialData));
  const [notifications, setNotifications] = useState(() => initialNotifications.map(item => ({ ...item })));
  const [settings, setSettings] = useState({
    owner: { name: 'Bagas Arya Pratama', email: 'bagas.arya@example.com', phone: '081298765432', organization: 'Roder Bogor Tenda Megah' },
    business: { name: 'Roder Bogor Tenda Megah', email: 'halo@roderbogor.example', phone: '081288004420', city: 'Bogor, Jawa Barat', address: 'Jl. Raya Dramaga No. 88, Bogor', description: 'Penyewaan tenda, perlengkapan, dan kebutuhan acara untuk wilayah Bogor dan sekitarnya.' },
  });
  const [toast, setToast] = useState('');
  const [drawerPath, setDrawerPath] = useState(null);
  const open = drawerPath === location.pathname;
  const setOpen = value => setDrawerPath(value ? location.pathname : null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 980px)').matches);
  const sidebar = useRef(null);
  const timer = useRef(null);
  const objectUrls = useRef([]);
  const counters = useRef(Object.fromEntries(Object.entries(initialData).map(([key, rows]) => [key, Math.max(...rows.map(row => Number(row.id.split('-').at(-1))))])));
  const unread = notifications.filter(item => !item.read).length;
  const title = titles[page] || (['notifikasi', 'notifikasi-menu'].includes(page) ? 'Notifikasi' : 'Halaman vendor');

  useEffect(() => {
    const query = window.matchMedia('(max-width: 980px)');
    const update = () => { setMobile(query.matches); if (!query.matches) setDrawerPath(null); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { const previousTitle = document.title; document.title = `${title} — Vendor Vendoria`; window.scrollTo(0, 0); return () => { document.title = previousTitle; }; }, [location.pathname, title]);
  useEffect(() => {
    if (!open || !mobile) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current.querySelector('button, a')?.focus();
    const shell = document.querySelector('.vendor-shell');
    const previousInert = shell.inert;
    shell.inert = true;
    return () => { document.body.style.overflow = previousOverflow; shell.inert = previousInert; if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, [open, mobile]);
  useEffect(() => () => { clearTimeout(timer.current); objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  const notify = message => { setToast(message); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 4500); };
  const save = (key, record) => {
    const updated = Boolean(record.id);
    const next = { ...record, id: record.id || `${resources[key].prefix}-${String(++counters.current[key]).padStart(3, '0')}` };
    setData(current => ({ ...current, [key]: updated ? current[key].map(item => item.id === next.id ? next : item) : [next, ...current[key]] }));
    notify(`${resources[key].singular[0].toUpperCase() + resources[key].singular.slice(1)} ${updated ? 'diperbarui' : 'ditambahkan'} pada data contoh.`);
  };
  const remove = (key, ids) => { setData(current => ({ ...current, [key]: current[key].filter(record => !ids.includes(record.id)) })); notify(`${ids.length} data dihapus dari pratinjau.`); };
  const onUpload = file => { const url = URL.createObjectURL(file); objectUrls.current.push(url); return url; };
  const readNotifications = ids => setNotifications(current => current.map(item => ids.includes(item.id) ? { ...item, read: true } : item));

  let content;
  if (resourceKey) content = <VendorResource key={resourceKey} resourceKey={resourceKey} segments={segments} data={data} onSave={save} onDelete={remove} onUpload={onUpload} />;
  else if (page === 'dashboard') content = <VendorDashboard data={data} />;
  else if (['pengaturan', 'profil-bisnis', 'kyc', 'keamanan'].includes(page)) content = <VendorSettings key={page} page={page} settings={settings} onSave={(type, values) => { setSettings(current => ({ ...current, [type]: values })); notify('Perubahan profil disimpan pada pratinjau frontend.'); }} notify={notify} />;
  else if (['notifikasi', 'notifikasi-menu'].includes(page)) content = <VendorNotifications notifications={notifications} onRead={readNotifications} onDelete={id => { setNotifications(current => current.filter(item => item.id !== id)); notify('Notifikasi dihapus dari pratinjau.'); }} />;
  else if (page === 'pencarian') content = <VendorSearch key={location.search} data={data} />;
  else content = <><PageHeading title="Halaman tidak ditemukan" /><section className="v-card"><EmptyState title="Alamat workspace tidak tersedia" description="Gunakan menu di samping untuk membuka halaman vendor."><Link className="v-button v-button-primary" to="/vendor/dashboard">Kembali ke dashboard</Link></EmptyState></section></>;

  return <div className="vendor-workspace">
    <a className="v-skip-link" href="#vendor-main">Langsung ke konten</a>
    {mobile && open && <button className="v-sidebar-backdrop" type="button" aria-label="Tutup menu vendor" tabIndex={-1} onClick={() => setOpen(false)} />}
    <aside className={`vendor-sidebar${open ? ' is-open' : ''}`} ref={sidebar} inert={mobile && !open} role={mobile && open ? 'dialog' : undefined} aria-modal={mobile && open ? 'true' : undefined} aria-label="Navigasi workspace vendor" onKeyDown={event => {
      if (!mobile || !open) return;
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        const controls = [...sidebar.current.querySelectorAll('a,button')];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    }}>
      <div className="v-brand-row"><Link className="v-brand" to="/vendor/dashboard" onClick={() => setOpen(false)}><img src="/assets/figma/e290aac37b05d0237d85.svg" alt="" /><span>Vendoria<small>VENDOR WORKSPACE</small></span></Link><button className="v-icon-button v-sidebar-close" type="button" aria-label="Tutup sidebar" onClick={() => setOpen(false)}><X size={19} /></button></div>
      <div className="v-workspace-identity"><span>RB</span><div><strong>{settings.business.name}</strong><small>{settings.business.city.split(',')[0]} · Vendor</small></div></div>
      <nav className="v-sidebar-nav" aria-label="Menu vendor" onClick={event => { if (event.target.closest('a')) setOpen(false); }}>{menuGroups.map(group => <div className="v-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([label, path, Icon]) => <NavLink key={path} to={`/vendor/${path}`} className={({ isActive }) => `v-nav-link${isActive ? ' is-active' : ''}`}><Icon size={18} strokeWidth={1.6} /><span>{label}</span>{path === 'pesanan' && data.orders.some(order => order.status === 'Menunggu') && <small>{data.orders.filter(order => order.status === 'Menunggu').length}</small>}</NavLink>)}</div>)}</nav>
      <div className="v-sidebar-footer"><Link to="/"><ArrowUpRight size={17} />Ke situs Vendoria</Link></div>
    </aside>
    <div className="vendor-shell"><header className="v-topbar"><div className="v-topbar-location"><button className="v-icon-button v-mobile-toggle" type="button" aria-label="Buka menu vendor" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div><div className="v-topbar-actions"><form className="v-topbar-search" role="search" onSubmit={event => { event.preventDefault(); const query = new FormData(event.currentTarget).get('query'); navigate(`/vendor/pencarian?q=${encodeURIComponent(query)}`); }}><Search size={16} /><input key={location.search} name="query" aria-label="Cari di workspace" placeholder="Cari di workspace…" defaultValue={new URLSearchParams(location.search).get('q') || ''} /><kbd aria-hidden="true">↵</kbd></form><Link to="/vendor/notifikasi" className="v-icon-button v-notification-bell" aria-label={`Notifikasi, ${unread} belum dibaca`}><Bell size={19} strokeWidth={1.6} />{unread > 0 && <span>{unread}</span>}</Link><span className="v-topbar-divider" /><VendorProfileMenu owner={settings.owner} /></div></header>
      <div className="v-preview-strip"><span><i />Pratinjau frontend</span><p>Data contoh · Perubahan akan kembali saat halaman dimuat ulang.</p></div>
      <main id="vendor-main" className="v-main" tabIndex={-1}>{content}</main>
      <footer className="v-workspace-footer"><span>© 2026 Vendoria</span><span>Workspace Vendor</span></footer>
    </div>
    {toast && <div className="v-toast" role="status">{toast}<button type="button" aria-label="Tutup pemberitahuan" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}
