import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import VendorDashboard from './VendorDashboard';
import VendorResource from './VendorResource';
import VendorCatalogPage from './VendorCatalogPage';
import VendorOrdersPage from './VendorOrdersPage';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../AuthContext';
import VendorSettings from './VendorSettings';
import VendorProfileMenu from './VendorProfileMenu';
import VendorFooter from './VendorFooter';
import { vendorAssets } from './vendorAssets';
import { VendorNotifications, VendorSearch } from './VendorActivity';
import { EmptyState, PageHeading } from './VendorUi';
import { initialData, initialNotifications, resources } from './vendorData';
import '../interface/interface.css';
import './vendor.css';
import './vendor-portal.css';

const navigation = [['Dashboard', 'dashboard'], ['Katalog', 'katalog'], ['Pesanan', 'pesanan'], ['Serah Terima', 'serah-terima'], ['Klaim', 'klaim'], ['Pencairan', 'pencairan']];
const titles = Object.fromEntries([...navigation, ['Profil bisnis', 'profil-bisnis'], ['Profil pemilik', 'pengaturan'], ['Verifikasi KYC', 'kyc'], ['Keamanan', 'keamanan'], ['Pencarian', 'pencarian']].map(([label, path]) => [path, label]));

export default function VendorWorkspace() {
  const { user } = useAuth();
  const location = useLocation();
  const segments = location.pathname.replace(/^\/vendor\/?/, '').split('/').filter(Boolean);
  const page = segments[0] || 'dashboard';
  const resourceKey = Object.keys(resources).find(key => resources[key].path === page);
  const [data, setData] = useState(() => ({ ...structuredClone(initialData), catalog: [] }));
  const [catalogVendor, setCatalogVendor] = useState(null);
  const [ordersVendor, setOrdersVendor] = useState(null);
  const catalogLoaded = useCallback(value => { setCatalogVendor(value.vendor); setData(current => ({ ...current, catalog: value.items })); }, []);
  const ordersLoaded = useCallback(value => {
    setOrdersVendor(value.vendor);
    setData(current => ({
      ...current,
      orders: (value.items || []).map(item => ({
        id: String(item.order_id),
        code: item.kode_pemesanan,
        customer: item.customer_name,
        equipment: item.equipment_summary,
        start: item.tanggal_mulai_sewa,
        end: item.tanggal_selesai_sewa,
        total: item.total_biaya_sewa,
        status: item.status_pesanan,
        venue: item.lokasi_acara || '',
      })),
    }));
  }, []);
  const [notifications, setNotifications] = useState(() => initialNotifications.map(item => ({ ...item })));
  const [settings, setSettings] = useState({
    owner: { name: 'Bagas Arya Pratama', email: 'bagas.arya@example.com', phone: '081298765432', organization: 'Roder Bogor Tenda Megah' },
    business: { name: 'Roder Bogor Tenda Megah', email: 'halo@roderbogor.example', phone: '081288004420', city: 'Bogor, Jawa Barat', address: 'Jl. Raya Dramaga No. 88, Bogor', description: 'Penyewaan tenda, perlengkapan, dan kebutuhan acara untuk wilayah Bogor dan sekitarnya.' },
  });
  const [toast, setToast] = useState('');
  const timer = useRef(null);
  const objectUrls = useRef([]);
  const counters = useRef(Object.fromEntries(Object.entries(initialData).map(([key, rows]) => [key, Math.max(...rows.map(row => Number(row.id.split('-').at(-1))))])));
  const unread = notifications.filter(item => !item.read).length;
  const title = titles[page] || (['notifikasi', 'notifikasi-menu'].includes(page) ? 'Notifikasi' : 'Halaman vendor');

  useEffect(() => { const previousTitle = document.title; document.title = `${title} — Vendor Vendoria`; window.scrollTo(0, 0); return () => { document.title = previousTitle; }; }, [location.pathname, title]);
  useEffect(() => () => { clearTimeout(timer.current); objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  const notify = message => { setToast(message); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 4500); };
  const save = (key, record) => {
    if (['catalog', 'orders'].includes(key)) return;
    const updated = Boolean(record.id);
    const next = { ...record, id: record.id || `${resources[key].prefix}-${String(++counters.current[key]).padStart(3, '0')}` };
    setData(current => ({ ...current, [key]: updated ? current[key].map(item => item.id === next.id ? next : item) : [next, ...current[key]] }));
    notify(`${resources[key].singular[0].toUpperCase() + resources[key].singular.slice(1)} ${updated ? 'diperbarui' : 'ditambahkan'} pada data contoh.`);
  };
  const remove = (key, ids) => { if (['catalog', 'orders'].includes(key)) return; setData(current => ({ ...current, [key]: current[key].filter(record => !ids.includes(record.id)) })); notify(`${ids.length} data dihapus dari pratinjau.`); };
  const onUpload = file => { const url = URL.createObjectURL(file); objectUrls.current.push(url); return url; };
  const readNotifications = ids => setNotifications(current => current.map(item => ids.includes(item.id) ? { ...item, read: true } : item));
  const livePages = ['katalog', 'pesanan'];

  let content;
  if (resourceKey === 'catalog') content = <RequireAuth role="vendor"><VendorCatalogPage segments={segments} onLoaded={catalogLoaded} notify={notify} onUpload={onUpload} /></RequireAuth>;
  else if (resourceKey === 'orders') content = <RequireAuth role="vendor"><VendorOrdersPage segments={segments} onLoaded={ordersLoaded} notify={notify} /></RequireAuth>;
  else if (resourceKey) content = <VendorResource key={resourceKey} resourceKey={resourceKey} segments={segments} data={data} onSave={save} onDelete={remove} onUpload={onUpload} />;
  else if (page === 'dashboard') content = <VendorDashboard data={data} business={settings.business} />;
  else if (['pengaturan', 'profil-bisnis', 'kyc', 'keamanan'].includes(page)) content = <VendorSettings key={page} page={page} settings={settings} onSave={(type, values) => { setSettings(current => ({ ...current, [type]: values })); notify('Perubahan profil disimpan pada pratinjau frontend.'); }} notify={notify} />;
  else if (['notifikasi', 'notifikasi-menu'].includes(page)) content = <VendorNotifications notifications={notifications} onRead={readNotifications} onDelete={id => { setNotifications(current => current.filter(item => item.id !== id)); notify('Notifikasi dihapus dari pratinjau.'); }} />;
  else if (page === 'pencarian') content = <VendorSearch key={location.search} data={data} />;
  else content = <><PageHeading title="Halaman tidak ditemukan" /><section className="v-card"><EmptyState title="Alamat workspace tidak tersedia" description="Gunakan navigasi di atas untuk membuka halaman vendor."><Link className="v-button v-button-primary" to="/vendor/dashboard">Kembali ke dashboard</Link></EmptyState></section></>;

  return <div className="vendor-workspace vendor-portal">
    <a className="v-skip-link" href="#vendor-main">Langsung ke konten</a>
    <div className="vendor-shell">
      <header className="vp-header"><div className="vp-header-inner">
        <Link className="vp-brand" to="/" aria-label="Vendoria, ke halaman utama"><img src={vendorAssets.logo} alt="" /><span>Vendoria</span></Link>
        <nav className="vp-navigation" aria-label="Navigasi vendor">{navigation.map(([label, path]) => <NavLink key={path} to={`/vendor/${path}`} className={({ isActive }) => isActive ? 'is-current' : undefined}>{label}</NavLink>)}</nav>
        <div className="vp-header-actions"><Link className="vp-header-icon" to="/vendor/pencarian" aria-label="Cari"><img src={vendorAssets.search} alt="" /></Link><Link className="vp-header-icon vp-bell" to="/vendor/notifikasi-menu" aria-label={`Notifikasi, ${unread} belum dibaca`}><img src={vendorAssets.bell} alt="" />{unread > 0 && <span>{unread}</span>}</Link><span className="vp-header-divider" /><VendorProfileMenu owner={livePages.includes(page) && user ? { ...settings.owner, name: user.nama, foto_profil: user.foto_profil } : settings.owner} roleLabel="Pemilik" portal businessName={page === 'katalog' ? catalogVendor?.name || ordersVendor?.name || 'Vendor Anda' : page === 'pesanan' ? ordersVendor?.name || catalogVendor?.name || 'Vendor Anda' : settings.business.name} /></div>
      </div></header>
      {page !== 'dashboard' && !livePages.includes(page) && <div className="v-preview-strip"><span><i />Pratinjau frontend</span><p>Data contoh · Perubahan akan kembali saat halaman dimuat ulang.</p></div>}
      <main id="vendor-main" className="v-main vp-main" tabIndex={-1}>{content}</main>
      {page === 'dashboard' && <p className="vp-preview-note">Pratinjau frontend · Data contoh · Perubahan kembali saat halaman dimuat ulang.</p>}
      <VendorFooter />
    </div>
    {toast && <div className="v-toast" role="status">{toast}<button type="button" aria-label="Tutup pemberitahuan" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}
