import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import VendorDashboard from './VendorDashboard';
import VendorResource from './VendorResource';
import VendorCatalogPage from './VendorCatalogPage';
import VendorOrdersPage from './VendorOrdersPage';
import VendorHandoversPage from './VendorHandoversPage';
import VendorClaimsPage from './VendorClaimsPage';
import VendorPayoutsPage from './VendorPayoutsPage';
import { payoutLabels } from './vendorPayoutsApi';
import { claimLabels } from './vendorClaimsApi';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../AuthContext';
import VendorSettings from './VendorSettings';
import VendorBusinessGate from './VendorBusinessGate';
import VendorProfileMenu from './VendorProfileMenu';
import VendorFooter from './VendorFooter';
import { vendorAssets } from './vendorAssets';
import { VendorNotifications, VendorSearch } from './VendorActivity';
import { EmptyState, PageHeading } from './VendorUi';
import { initialData, resources } from './vendorData';
import { dismissVendorNotifications, listVendorNotifications, readVendorNotifications } from './vendorDashboardApi';
import { getVendorSettings } from './vendorSettingsApi';
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
  const [data, setData] = useState(() => ({ ...structuredClone(initialData), catalog: [], orders: [], handovers: [], claims: [], payouts: [] }));
  const [catalogVendor, setCatalogVendor] = useState(null);
  const [ordersVendor, setOrdersVendor] = useState(null);
  const [settingsVendor, setSettingsVendor] = useState(null);
  const profileRequest = useRef(0);
  const [handoverVendor, setHandoverVendor] = useState(null);
  const [searchVendor, setSearchVendor] = useState(null);
  const searchLoaded = useCallback(value => setSearchVendor(value.vendor), []);
  const handoversLoaded = useCallback(value => {
    setHandoverVendor(value.vendor);
    setData(current => ({ ...current, handovers: value.items.map(item => ({ id: String(item.orderId), order: item.code, customer: item.customer, date: item.start, status: item.status })) }));
  }, []);
  const catalogLoaded = useCallback(value => { setCatalogVendor(value.vendor); setData(current => ({ ...current, catalog: value.items })); }, []);
  // Klaim = data nyata (vendorClaimsApi.js); status diganti label tampilan untuk dashboard & pencarian.
  const claimsLoaded = useCallback(items => setData(current => ({ ...current, claims: items.map(item => ({ id: item.id, order: item.order, customer: item.customer, reason: item.reason, date: item.date, amount: item.amount, status: claimLabels[item.status], notes: item.note || '' })) })), []);
  // Pencairan = data nyata (vendorPayoutsApi.js); dipakai pencarian workspace.
  const payoutsLoaded = useCallback(items => setData(current => ({ ...current, payouts: items.map(item => ({ id: item.id, date: (item.requestedAt || '').slice(0, 10), bank: item.bank || '—', account: item.account || '—', amount: item.amount, status: payoutLabels[item.status], notes: '' })) })), []);
  const settingsLoaded = useCallback(value => {
    if (String(value.owner?.user_id) !== String(user?.user_id)) return;
    ++profileRequest.current;
    setSettingsVendor(value.business);
  }, [user?.user_id]);
  useEffect(() => {
    const lifecycle = new AbortController();
    const load = async () => {
      const request = ++profileRequest.current;
      try {
        const value = await getVendorSettings();
        if (!lifecycle.signal.aborted && request === profileRequest.current && String(value.owner?.user_id) === String(user?.user_id)) {
          setSettingsVendor(value.business);
        }
      } catch { /* Keep the last confirmed business name if a refresh fails. */ }
    };
    load();
    window.addEventListener('focus', load);
    return () => { lifecycle.abort(); window.removeEventListener('focus', load); };
  }, [location.pathname, user?.user_id]);
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
  const [notifications, setNotifications] = useState([]);
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
    if (['catalog', 'orders', 'handovers', 'claims', 'payouts'].includes(key)) return;
    const updated = Boolean(record.id);
    const next = { ...record, id: record.id || `${resources[key].prefix}-${String(++counters.current[key]).padStart(3, '0')}` };
    setData(current => ({ ...current, [key]: updated ? current[key].map(item => item.id === next.id ? next : item) : [next, ...current[key]] }));
    notify(`${resources[key].singular[0].toUpperCase() + resources[key].singular.slice(1)} ${updated ? 'diperbarui' : 'ditambahkan'} pada data contoh.`);
  };
  const remove = (key, ids) => { if (['catalog', 'orders', 'handovers', 'claims', 'payouts'].includes(key)) return; setData(current => ({ ...current, [key]: current[key].filter(record => !ids.includes(record.id)) })); notify(`${ids.length} data dihapus dari pratinjau.`); };
  const onUpload = file => { const url = URL.createObjectURL(file); objectUrls.current.push(url); return url; };
  // Notifikasi = pesanan/klaim/pencairan yang perlu ditindak (server); dimuat ulang tiap pindah halaman agar ikut perkembangan terbaru.
  const loadNotifications = useCallback(() => listVendorNotifications().then(setNotifications), []);
  useEffect(() => { loadNotifications().catch(() => {}); }, [location.pathname, loadNotifications]);
  const changeNotifications = (send, apply, ids) => {
    if (!ids.length) return;
    setNotifications(apply);
    send(ids).catch(error => { notify(error.message); loadNotifications().catch(() => {}); });
  };
  const readNotifications = ids => { const unreadIds = notifications.filter(item => !item.read && ids.includes(item.id)).map(item => item.id); changeNotifications(readVendorNotifications, current => current.map(item => unreadIds.includes(item.id) ? { ...item, read: true } : item), unreadIds); };
  const deleteNotification = id => { changeNotifications(dismissVendorNotifications, current => current.filter(item => item.id !== id), [id]); notify('Notifikasi dihapus.'); };

  let content;
  if (resourceKey === 'catalog') content = <RequireAuth role="vendor"><VendorBusinessGate><VendorCatalogPage segments={segments} onLoaded={catalogLoaded} notify={notify} onUpload={onUpload} /></VendorBusinessGate></RequireAuth>;
  else if (resourceKey === 'orders') content = <RequireAuth role="vendor"><VendorBusinessGate><VendorOrdersPage segments={segments} onLoaded={ordersLoaded} notify={notify} /></VendorBusinessGate></RequireAuth>;
  else if (resourceKey === 'handovers') content = <RequireAuth role="vendor"><VendorBusinessGate><VendorHandoversPage segments={segments} onLoaded={handoversLoaded} notify={notify} /></VendorBusinessGate></RequireAuth>;
  else if (resourceKey === 'claims') content = <RequireAuth role="vendor"><VendorBusinessGate><VendorClaimsPage segments={segments} onLoaded={claimsLoaded} notify={notify} /></VendorBusinessGate></RequireAuth>;
  else if (resourceKey === 'payouts') content = <RequireAuth role="vendor"><VendorBusinessGate><VendorPayoutsPage segments={segments} onLoaded={payoutsLoaded} notify={notify} /></VendorBusinessGate></RequireAuth>;
  else if (resourceKey) content = <VendorResource key={resourceKey} resourceKey={resourceKey} segments={segments} data={data} onSave={save} onDelete={remove} onUpload={onUpload} />;
  else if (page === 'dashboard') content = <RequireAuth role="vendor"><VendorDashboard ownerName={user?.nama || 'Vendor'} /></RequireAuth>;
  else if (['pengaturan', 'profil-bisnis', 'kyc', 'keamanan'].includes(page)) content = <RequireAuth role="vendor"><VendorSettings key={page} page={page} onLoaded={settingsLoaded} notify={notify} /></RequireAuth>;
  else if (['notifikasi', 'notifikasi-menu'].includes(page)) content = <VendorNotifications notifications={notifications} onRead={readNotifications} onDelete={deleteNotification} />;
  else if (page === 'pencarian') content = <RequireAuth role="vendor"><VendorSearch onLoaded={searchLoaded} /></RequireAuth>;
  else content = <><PageHeading title="Halaman tidak ditemukan" /><section className="v-card"><EmptyState title="Alamat workspace tidak tersedia" description="Gunakan navigasi di atas untuk membuka halaman vendor."><Link className="v-button v-button-primary" to="/vendor/dashboard">Kembali ke dashboard</Link></EmptyState></section></>;

  return <div className="vendor-workspace vendor-portal">
    <a className="v-skip-link" href="#vendor-main">Langsung ke konten</a>
    <div className="vendor-shell">
      <header className="vp-header"><div className="vp-header-inner">
        <Link className="vp-brand" to="/vendor/dashboard" aria-label="Vendoria, ke dashboard vendor"><img src={vendorAssets.logo} alt="" /><span>Vendoria</span></Link>
        <nav className="vp-navigation" aria-label="Navigasi vendor">{navigation.map(([label, path]) => <NavLink key={path} to={`/vendor/${path}`} className={({ isActive }) => isActive ? 'is-current' : undefined}>{label}</NavLink>)}</nav>
        <div className="vp-header-actions"><Link className="vp-header-icon" to="/vendor/pencarian" aria-label="Cari"><img src={vendorAssets.search} alt="" /></Link><Link className="vp-header-icon vp-bell" to="/vendor/notifikasi-menu" aria-label={`Notifikasi, ${unread} belum dibaca`}><img src={vendorAssets.bell} alt="" />{unread > 0 && <span>{unread}</span>}</Link><span className="vp-header-divider" /><VendorProfileMenu owner={{ name: user?.nama || 'Pemilik', foto_profil: user?.foto_profil }} roleLabel="Pemilik" portal businessName={settingsVendor?.nama_vendor || catalogVendor?.name || ordersVendor?.name || handoverVendor?.name || searchVendor?.name || 'Lengkapi profil bisnis'} /></div>
      </div></header>
      <main id="vendor-main" className="v-main vp-main" tabIndex={-1}>{content}</main>
      <VendorFooter />
    </div>
    {toast && <div className="v-toast" role="status">{toast}<button type="button" aria-label="Tutup pemberitahuan" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}
