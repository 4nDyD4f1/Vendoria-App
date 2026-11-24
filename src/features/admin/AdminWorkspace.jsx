import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Building2, ClipboardList, CreditCard, FileCheck2, FolderTree, Package, Search, ShieldCheck, Users, X } from 'lucide-react';
import WorkspaceResource from '../vendor/VendorResource';
import VendorProfileMenu from '../vendor/VendorProfileMenu';
import { VendorNotifications } from '../vendor/VendorActivity';
import { EmptyState, PageHeading } from '../vendor/VendorUi';
import { WorkspaceResourceContext } from '../shared/workspaceResource';
import WorkspaceFooter from '../shared/WorkspaceFooter';
import { useAuth } from '../../AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminReports from './AdminReports';
import AdminSearch from './AdminSearch';
import AdminKycPage from '../kyc/AdminKycPage';
import AdminAccountPage from './AdminAccountPage';
import AdminClaimsPage from './AdminClaimsPage';
import AdminCatalogPage from './AdminCatalogPage';
import { listCatalog } from './catalogApi';
import { listClaims } from './claimsApi';
import AdminPayoutsPage from './AdminPayoutsPage';
import { listPayouts } from './reportsApi';
import { listAccounts } from './accountsApi';
import { listKyc, kycStatus } from '../kyc/kycApi';
import { adminInitialData, adminResources, resolveAdminResource } from './adminData';
import { dismissNotifications, listNotifications, readNotifications } from './notificationsApi';
import { deleteAdministrator, listAdministrators, saveAdministrator } from './administratorsApi';
import { deleteCategories, listCategories, saveCategory } from './categoriesApi';
import '../interface/interface.css';
import '../vendor/vendor.css';
import './admin.css';
import './admin-shell.css';

// Menu atas sesuai desain Figma. Halaman turunan (kategori, pencairan, pengguna/*) menyalakan menu induknya.
const nav = [['Dashboard', '', []], ['Verifikasi KYC', 'kyc', ['kyc']], ['Kelola Klaim', 'klaim', ['klaim']], ['Kelola Katalog', 'katalog', ['katalog', 'kategori']], ['Laporan', 'laporan', ['laporan']], ['Pengguna', 'pengguna/pengguna', ['pengguna']]];
const isActive = (path, route, prefixes) => route === '' ? path === '' || path === 'dashboard' : prefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
const pageTitles = { '': 'Dashboard', dashboard: 'Dashboard', laporan: 'Laporan transaksi', pencarian: 'Pencarian' };
const resourceIcons = { kyc: FileCheck2, claims: ClipboardList, catalog: Package, categories: FolderTree, customers: Users, vendors: Building2, administrators: ShieldCheck, payouts: CreditCard };

export default function AdminWorkspace() {
  const location = useLocation();
  const path = location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '');
  const resolved = resolveAdminResource(location.pathname);
  const [data, setData] = useState(() => ({ ...structuredClone(adminInitialData), kyc: [], customers: [], vendors: [] }));
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState('');
  const [kycPendingCount, setKycPendingCount] = useState(0);
  const { user } = useAuth();
  const owner = { name: user?.nama || 'Admin', email: user?.email, foto_profil: user?.foto_profil };
  const timer = useRef(null);
  const objectUrls = useRef([]);
  const counters = useRef(Object.fromEntries(Object.entries(adminInitialData).map(([key, rows]) => [key, Math.max(0, ...rows.map(row => Number(row.id.match(/(\d+)$/)?.[1] || 0)))])));
  const unread = notifications.filter(item => !item.read).length;
  const title = resolved ? adminResources[resolved.key].title : pageTitles[path] || (path.startsWith('notifikasi') ? 'Notifikasi' : 'Halaman admin');
  const viewData = { ...data, categories: data.categories };
  const resourceConfig = Object.fromEntries(Object.entries(adminResources).map(([key, resource]) => [key, { ...resource, icon: resourceIcons[key] }]));

  useEffect(() => { const previous = document.title; document.title = `${title} — Admin Vendoria`; window.scrollTo(0, 0); return () => { document.title = previous; }; }, [location.pathname, title]);
  useEffect(() => () => { clearTimeout(timer.current); objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  const notify = message => { setToast(message); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 4500); };
  // Administrator = data nyata dari backend; dimuat saat workspace dibuka (untuk pencarian) dan dimuat ulang tiap halamannya dibuka.
  const onAdminPage = resolved?.key === 'administrators';
  const onCategoryPage = resolved?.key === 'categories';
  const onKycPage = resolved?.key === 'kyc';
  const onClaimsPage = resolved?.key === 'claims';
  const onPayoutsPage = resolved?.key === 'payouts';
  const onCatalogPage = resolved?.key === 'catalog';
  const onAccountPage = ['customers', 'vendors'].includes(resolved?.key);
  const accountsLoaded = useCallback(value => setData(current => ({ ...current, customers: value.customers, vendors: value.vendors })), []);
  useEffect(() => {
    if (onAccountPage) return;
    const lifecycle = new AbortController();
    listAccounts().then(value => { if (!lifecycle.signal.aborted) accountsLoaded(value); }).catch(() => {});
    return () => lifecycle.abort();
  }, [onAccountPage, accountsLoaded]);
  const claimsLoaded = useCallback(claims => setData(current => ({ ...current, claims })), []);
  useEffect(() => {
    if (onClaimsPage) return;
    const lifecycle = new AbortController();
    listClaims().then(value => { if (!lifecycle.signal.aborted) claimsLoaded(value); }).catch(() => {});
    return () => lifecycle.abort();
  }, [onClaimsPage, claimsLoaded]);
  const catalogLoaded = useCallback(catalog => setData(current => ({ ...current, catalog })), []);
  useEffect(() => {
    if (onCatalogPage) return;
    const lifecycle = new AbortController();
    listCatalog().then(value => { if (!lifecycle.signal.aborted) catalogLoaded(value); }).catch(() => {});
    return () => lifecycle.abort();
  }, [onCatalogPage, catalogLoaded]);
  const payoutsLoaded = useCallback(payouts => setData(current => ({ ...current, payouts })), []);
  useEffect(() => {
    if (onPayoutsPage) return;
    const lifecycle = new AbortController();
    listPayouts().then(value => { if (!lifecycle.signal.aborted) payoutsLoaded(value); }).catch(() => {});
    return () => lifecycle.abort();
  }, [onPayoutsPage, payoutsLoaded]);
  // Notifikasi = antrean KYC/klaim/pencairan yang menunggu (server); dimuat ulang tiap pindah halaman agar ikut keputusan terbaru.
  const loadNotifications = useCallback(() => listNotifications().then(setNotifications), []);
  useEffect(() => { loadNotifications().catch(() => {}); }, [location.pathname, loadNotifications]);
  const changeNotifications = (send, apply, ids) => {
    if (!ids.length) return;
    setNotifications(apply);
    send(ids).catch(error => { notify(error.message); loadNotifications().catch(() => {}); });
  };
  const readNotification = ids => { const unreadIds = notifications.filter(item => !item.read && ids.includes(item.id)).map(item => item.id); changeNotifications(readNotifications, current => current.map(item => unreadIds.includes(item.id) ? { ...item, read: true } : item), unreadIds); };
  const deleteNotification = id => { changeNotifications(dismissNotifications, current => current.filter(item => item.id !== id), [id]); notify('Notifikasi dihapus.'); };
  const kycLoaded = useCallback(value => {
    setKycPendingCount(value.counts.menunggu || 0);
    setData(current => ({ ...current, kyc: value.items.map(item => ({ id: String(item.kyc_id), name: item.nama, email: item.email, phone: item.no_telp || '', type: item.role === 'vendor' ? 'Vendor' : 'Customer', date: item.diajukan_pada.slice(0, 10), status: item.status === 'menunggu' ? 'Menunggu' : kycStatus[item.status] })) }));
  }, [setData, setKycPendingCount]);
  useEffect(() => {
    if (onKycPage) return;
    const lifecycle = new AbortController();
    listKyc({ status: 'semua', size: 100 }).then(value => { if (!lifecycle.signal.aborted) kycLoaded(value); }).catch(() => {});
    return () => { lifecycle.abort(); };
  }, [onKycPage, kycLoaded]);
  useEffect(() => {
    let stale = false;
    listAdministrators().then(administrators => { if (!stale) setData(current => ({ ...current, administrators })); }, error => { if (!stale && onAdminPage) notify(error.message); });
    return () => { stale = true; };
  }, [onAdminPage]); // eslint-disable-line react-hooks/exhaustive-deps
  // Kategori = data nyata dari backend (tabel kategori); jumlah alat dihitung server.
  const loadCategories = async () => {
    try { const categories = await listCategories(); setData(current => ({ ...current, categories })); }
    catch (error) { if (onCategoryPage) notify(error.message); }
  };
  useEffect(() => {
    let stale = false;
    listCategories().then(categories => { if (!stale) setData(current => ({ ...current, categories })); }, error => { if (!stale && onCategoryPage) notify(error.message); });
    return () => { stale = true; };
  }, [onCategoryPage]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveCategoryRecord = async record => {
    await saveCategory(record); // menolak (throw) bila gagal: form menampilkan pesannya
    await loadCategories();
    notify(`Kategori ${record.id ? 'diperbarui' : 'ditambahkan'}.`);
  };
  const removeCategoryRecords = async ids => {
    try { await deleteCategories(ids); notify(`${ids.length} kategori dihapus.`); }
    finally { await loadCategories(); } // gagal (mis. masih dipakai alat): pesan tampil di dialog hapus
  };
  const loadAdministrators = async () => {
    const administrators = await listAdministrators();
    setData(current => ({ ...current, administrators }));
  };
  const saveAdmin = async record => {
    const saved = await saveAdministrator(record);
    setData(current => ({ ...current, administrators: record.id ? current.administrators.map(item => item.id === saved.id ? saved : item) : [saved, ...current.administrators] }));
    notify(`Administrator ${record.id ? 'diperbarui' : 'ditambahkan'}.`);
  };
  const removeAdmins = async ids => {
    const results = await Promise.allSettled(ids.map(deleteAdministrator));
    await loadAdministrators();
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    notify(`${ids.length} administrator dihapus.`);
  };
  const save = (key, record) => {
    if (['kyc', 'claims', 'catalog', 'payouts', 'customers', 'vendors'].includes(key)) return;
    if (key === 'administrators') return saveAdmin(record);
    if (key === 'categories') return saveCategoryRecord(record);
    const resource = adminResources[key];
    const updated = Boolean(record.id);
    const next = { ...record, id: record.id || (resource.numericIds ? String(++counters.current[key]) : `${resource.prefix}-${String(++counters.current[key]).padStart(3, '0')}`) };
    setData(current => ({ ...current, [key]: updated ? current[key].map(item => item.id === next.id ? next : item) : [next, ...current[key]] }));
    notify(`${resource.singular[0].toUpperCase() + resource.singular.slice(1)} ${updated ? 'diperbarui' : 'ditambahkan'} pada data contoh.`);
  };
  const remove = (key, ids) => { if (['kyc', 'claims', 'catalog', 'payouts', 'customers', 'vendors'].includes(key)) return; if (key === 'administrators') return removeAdmins(ids); if (key === 'categories') return removeCategoryRecords(ids); setData(current => ({ ...current, [key]: current[key].filter(item => !ids.includes(item.id)) })); notify(`${ids.length} data dihapus dari pratinjau.`); };
  const upload = file => { const url = URL.createObjectURL(file); objectUrls.current.push(url); return url; };
  let content;
  if (onKycPage) content = <AdminKycPage segments={resolved.segments} onLoaded={kycLoaded} />;
  else if (onClaimsPage) content = <AdminClaimsPage segments={resolved.segments} onLoaded={claimsLoaded} />;
  else if (onCatalogPage) content = <AdminCatalogPage segments={resolved.segments} onLoaded={catalogLoaded} notify={notify} />;
  else if (onPayoutsPage) content = <AdminPayoutsPage segments={resolved.segments} onLoaded={payoutsLoaded} />;
  else if (onAccountPage) content = <AdminAccountPage key={resolved.key} resourceKey={resolved.key} segments={resolved.segments} onLoaded={accountsLoaded} />;
  else if (resolved) content = <WorkspaceResource key={resolved.key} resourceKey={resolved.key} segments={resolved.segments} data={viewData} onSave={save} onDelete={remove} onUpload={upload} />;
  else if (!path || path === 'dashboard') content = <AdminDashboard data={viewData} name={owner.name} />;
  else if (path === 'laporan') content = <AdminReports />;
  else if (path === 'pencarian') content = <AdminSearch key={location.search} data={viewData} />;
  else if (['notifikasi', 'notifikasi-menu'].includes(path)) content = <VendorNotifications notifications={notifications} onRead={readNotification} onDelete={deleteNotification} />;
  else content = <><PageHeading title="Halaman tidak ditemukan" /><section className="v-card"><EmptyState title="Alamat workspace tidak tersedia" description="Gunakan menu di samping untuk membuka halaman admin."><Link className="v-button v-button-primary" to="/admin">Kembali ke dashboard</Link></EmptyState></section></>;

  const userCounts = { customers: data.customers.length, vendors: data.vendors.length, administrators: data.administrators.length };
  const listView = resolved && !resolved.segments[1];
  const subTabs = !listView && path !== 'laporan' ? null
    : ['customers', 'vendors', 'administrators'].includes(resolved?.key) ? [[`Customer (${userCounts.customers})`, '/admin/pengguna/pengguna', 'customers'], [`Vendor (${userCounts.vendors})`, '/admin/pengguna/vendor', 'vendors'], [`Admin (${userCounts.administrators})`, '/admin/pengguna/admin', 'administrators']]
      : ['catalog', 'categories'].includes(resolved?.key) ? [['Alat', '/admin/katalog', 'catalog'], ['Kategori', '/admin/kategori', 'categories']]
        : path === 'laporan' || resolved?.key === 'payouts' ? [['Transaksi', '/admin/laporan', null], ['Pencairan dana', '/admin/laporan/pencairan', 'payouts']] : null;

  return <div className="vendor-workspace admin-workspace">
    <a className="v-skip-link" href="#admin-main">Langsung ke konten</a>
    <header className="a-header"><div className="a-header-inner">
      <Link className="a-logo" to="/admin" aria-label="Vendoria, ke dashboard admin"><img src="/assets/figma/e290aac37b05d0237d85.svg" alt="" /><span>Vendoria</span></Link>
      <nav className="a-nav" aria-label="Menu admin">{nav.map(([label, route, prefixes]) => { const active = isActive(path, route, prefixes); return <Link key={label} to={`/admin${route ? `/${route}` : ''}`} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}>{label}{route === 'kyc' && kycPendingCount > 0 && <small>{kycPendingCount}</small>}</Link>; })}</nav>
      <div className="a-header-actions">
        <Link to="/admin/pencarian" className="a-icon-button" aria-label="Cari di workspace admin"><Search size={18} strokeWidth={1.6} /></Link>
        <Link to="/admin/notifikasi" className="a-icon-button a-bell" aria-label={`Notifikasi, ${unread} belum dibaca`}><Bell size={18} strokeWidth={1.6} />{unread > 0 && <span>{unread}</span>}</Link>
        <span className="a-divider" aria-hidden="true" />
        <VendorProfileMenu owner={owner} roleLabel="Administrator" menuLabel="Menu akun admin" />
      </div>
    </div></header>
    <main id="admin-main" className="a-main" tabIndex={-1}>
      {subTabs && <nav className="a-tabs" aria-label="Bagian halaman">{subTabs.map(([label, to, key]) => { const here = key ? key === resolved?.key : to === `/admin${path ? `/${path}` : ''}`; return <Link key={to} to={to} className={here ? 'is-active' : undefined} aria-current={here ? 'page' : undefined}>{label}</Link>; })}</nav>}
      <WorkspaceResourceContext.Provider value={{ resources: resourceConfig, rootPath: '/admin' }}>{content}</WorkspaceResourceContext.Provider>
    </main>
    <WorkspaceFooter />
    {toast && <div className="v-toast" role="status">{toast}<button type="button" aria-label="Tutup pemberitahuan" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}
