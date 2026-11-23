import { Suspense, use, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { catalogProducts as products } from './catalogProducts';
import { InterfaceContext } from './InterfaceContext';
import DesignNode from './DesignNode';
import InterfaceHeader from './InterfaceHeader';
import { descendants, nodeText } from './designTree';
import { resolveScreen, screenByKey, screens } from './screens';
import footer from './designs/footer.json';
import notificationMenu from './designs/notification-menu.json';
import catalogEntries from './catalogEntries.json';
import headerStates from './headerStates.json';
import './interface.css';
import { useWishlist } from './useWishlist';
import { wishlistItemFor } from './wishlistData';
import LiveWishlist from './LiveWishlist';
import RentalGuideTabs from './RentalGuideTabs';
import AccountTabs from './AccountTabs';
import { accountTabs } from './accountDesign';

const loaders = import.meta.glob('./designs/[0-9]*.json', { import: 'default' });
const loaded = new Map();
function loadDesign(nodeId) {
  if (!loaded.has(nodeId)) loaded.set(nodeId, loaders[`./designs/${nodeId.replace(':', '-')}.json`]());
  return loaded.get(nodeId);
}
function ScreenContent({ screen, preview, initialRentalTab, initialAccountTab, initialAccountModal }) {
  if (screen.key === 'account-profile' && !preview) return <AccountTabs loadDesign={loadDesign} initialTab={initialAccountTab} initialModal={initialAccountModal} />;
  if (screen.key === 'rental-guide' && !preview) return <RentalGuideTabs loadDesign={loadDesign} initialTab={initialRentalTab} />;
  if (screen.key === 'wishlist' || screen.key === 'wishlist-empty' && !preview) return <LiveWishlist loadDesign={loadDesign} />;
  const tree = use(loadDesign(screen.nodeId));
  return <DesignNode node={tree} />;
}
function normalized(value) { return value.toLowerCase().replace(/\([^)]*\)/g, '').trim(); }
function productId(ancestors) {
  const card = [...ancestors].reverse().find(n => /ProductCard|Article|Sidebar/.test(n.name || ''));
  const text = nodeText(card);
  return products.find(p => text.toLowerCase().includes(p.name.toLowerCase()))?.id || 5;
}

export default function InterfacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user, loading, logout } = useAuth();
  const preview = location.pathname.startsWith('/interface-review/');
  const screen = preview ? screenByKey[params.screenKey] || screenByKey.home : resolveScreen(location.pathname);
  const [fields, setFields] = useState({});
  const [filter, setFilter] = useState({});
  const [selected, setSelected] = useState({});
  const { items: wishlist, toggle: toggleWishlist } = useWishlist(user, preview);
  const [cart, setCart] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [rentalDates, setRentalDates] = useState({});
  const [hidden, setHidden] = useState({});
  const [read, setRead] = useState({});
  const [uploads, setUploads] = useState({});
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState(null);
  const [showPreviewNote, setShowPreviewNote] = useState(true);
  const fileInput = useRef(null);
  const uploadTarget = useRef(null);
  const notificationTimer = useRef(null);
  const objectUrls = useRef([]);
  const contentRef = useRef(null);
  const lastScreen = useRef(screen.key);
  const [messages, setMessages] = useState([]);
  const [faqExpanded, setFaqExpanded] = useState({});
  const currentProduct = products.find(p => String(p.id) === location.pathname.split('/')[2]);
  const duration = rentalDates.start && rentalDates.end ? Math.max(1, Math.ceil((new Date(rentalDates.end) - new Date(rentalDates.start)) / 86400000)) : 3;
  const activeImage = currentProduct ? catalogEntries.find(entry => entry.title === currentProduct.name)?.image : null;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${screen.title} — Vendoria`;
    if (lastScreen.current !== screen.key) {
      setFilter({});
      setSelected({});
      setDialog(null);
      lastScreen.current = screen.key;
      if (!/product-|account-|payment-|rental-|kyc/.test(screen.key)) window.scrollTo(0, 0);
    }
    return () => { document.title = previousTitle; };
  }, [screen.key, screen.title]);
  useEffect(() => () => {
    clearTimeout(notificationTimer.current);
    objectUrls.current.forEach(url => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => {
    if (dialog) contentRef.current?.querySelector('[role=dialog] button')?.focus();
  }, [dialog]);

  const notify = message => {
    setToast(message);
    clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setToast(''), 4000);
  };
  const href = target => {
    if (!preview || /^(https?:|mailto:|tel:|#)/.test(target) || ['/login', '/register', '/vendor'].includes(target)) return target;
    const path = target.split('?')[0];
    const match = screens.find(item => item.path === path) || resolveScreen(path);
    return `/interface-review/${match.key}${target.includes('?') ? '?' + target.split('?')[1] : ''}`;
  };
  const go = target => {
    if (/^(https?:|mailto:|tel:)/.test(target)) { window.location.assign(target); return; }
    navigate(href(target));
  };
  const targetFor = ({ node, label, ancestors }) => {
    const name = node.name || '';
    const t = normalized(label);
    const role = screen.backoffice ? screen.role : 'customer';
    const inHeader = ancestors.some(n => n.name === 'Header' || n.name?.startsWith('Navigation'));
    if (screen.key === 'home' && node.id === '84:3505') return '/catalog';
    if (/Ke halaman utama/.test(name)) return '/';
    if (/^Button - Cari$/.test(name)) return role === 'vendor' ? '/vendor/pencarian' : '/catalog?search=1';
    if (/^Button - Notifikasi/.test(name)) return role === 'vendor' ? '/vendor/notifikasi-menu' : '/notifikasi/menu';
    if (/^Button - Keranjang/.test(name)) return '/keranjang';
    if (/^Button - Wishlist,/.test(name)) return wishlist.length ? '/wishlist' : '/wishlist/kosong';
    if (inHeader && role !== 'customer') {
      const map = role === 'vendor' ? { dashboard: '/vendor/dashboard', katalog: '/vendor/katalog', pesanan: '/vendor/pesanan', 'serah terima': '/vendor/serah-terima', klaim: '/vendor/klaim', pencairan: '/vendor/pencairan', 'roder bogor': '/vendor/pengaturan' }
        : { dashboard: '/admin', 'verifikasi kyc': '/admin/kyc', 'kelola klaim': '/admin/klaim', 'kelola katalog': '/admin/katalog', laporan: '/admin/laporan', pengguna: '/admin/pengguna/customer', admin: '/akun' };
      if (map[t]) return map[t];
    }
    if (name === 'Tab') {
      if (screen.key.startsWith('product')) {
        const base = preview ? '/product/5' : `/product/${location.pathname.split('/')[2]}`;
        return t.includes('kondisi') ? `${base}/kondisi` : t.includes('ulasan') ? `${base}/ulasan` : t.includes('kebijakan') ? `${base}/kebijakan` : base;
      }
      if (screen.key.includes('account-')) return t.includes('keamanan') ? '/akun/keamanan' : t === 'kyc' ? '/akun/kyc' : t.includes('alamat') ? '/akun/alamat' : t.includes('rekening') ? '/akun/rekening' : '/akun';
      if (/rental-guide|rental-faq|rental-policy/.test(screen.key)) return /faq/i.test(label) ? '/cara-sewa/faq' : /kebijakan/i.test(label) ? '/cara-sewa/kebijakan' : '/cara-sewa';
      if (/admin-catalog|admin-categories|admin-category-dialog/.test(screen.key)) return /kategori/i.test(label) ? '/admin/kategori' : '/admin/katalog';
      if (/admin-(customers|vendors|administrators)/.test(screen.key)) return /vendor/.test(t) ? '/admin/pengguna/vendor' : /admin/.test(t) ? '/admin/pengguna/admin' : '/admin/pengguna/customer';
      if (/admin-(reports|payouts)/.test(screen.key)) return /pencairan/.test(t) ? '/admin/laporan/pencairan' : '/admin/laporan';
      if (/vendor-(account|security)/.test(screen.key)) return /keamanan/.test(t) ? '/vendor/keamanan' : '/vendor/pengaturan';
    }
    const exact = {
      beranda: '/', 'kembali ke beranda': '/', 'lanjut ke beranda': '/', katalog: '/catalog', 'cara sewa': '/cara-sewa', 'pesanan saya': '/pesanan', pesanan: '/pesanan',
      'cari alat': '/catalog', 'buka katalog alat': '/catalog', 'jelajahi katalog': '/catalog', 'lihat semua katalog': '/catalog', 'tambah alat lainnya buka katalog dan simpan alat favorit baru': '/catalog',
      'pelajari cara sewa': '/cara-sewa', 'baca panduan lengkap': '/cara-sewa', 'cara pemesanan': '/cara-sewa', 'panduan serah terima': '/cara-sewa/serah-terima', 'lihat sop': '/cara-sewa/serah-terima',
      'kebijakan pengembalian': '/cara-sewa/kebijakan', 'pelajari perlindungan escrow': '/cara-sewa/kebijakan',
      'lihat profil vendor': '/vendor/3', 'kontak vendor': '/vendor/3/kontak', 'hubungi vendor': '/vendor/3/kontak', 'hubungi pic vendor': '/vendor/3/kontak',
      'sewa sekarang': '/keranjang', 'sewa sekaligus': '/keranjang', 'pindahkan semua ke keranjang': '/keranjang', wishlist: '/wishlist', 'buka wishlist': '/wishlist', 'mode kosong': '/wishlist/kosong', keranjang: '/keranjang',
      'virtual account': '/pembayaran/bank', 'qris dinamis': '/pembayaran/qris', 'e-wallet langsung': '/pembayaran/e-wallet', 'lihat pesanan saya': '/pesanan',
      'simulasikan verifikasi berhasil': '/booking/terkonfirmasi', 'buka tiket mediasi': '/klaim/KLM-891', 'simulasikan klaim': '/klaim/ajukan',
      'simulasikan disetujui': '/klaim/KLM-891/keputusan', 'simulasikan disetujui sebagian': '/klaim/KLM-891/keputusan', 'simulasikan ditolak': '/klaim/KLM-891/keputusan',
      'tambah alamat': '/akun/alamat/tambah', 'tambah rekening': '/akun/rekening/tambah', 'cek status rekening': '/akun/rekening',
      'lihat detail kyc': role === 'vendor' ? '/vendor/kyc' : '/kyc', profil: '/akun', 'pengaturan akun': role === 'vendor' ? '/vendor/pengaturan' : '/akun',
      'profil bisnis': '/vendor/profil-bisnis', 'buka klaim': '/vendor/klaim', 'serah terima': '/vendor/serah-terima',
      'belum terverifikasi': '/kyc', 'menunggu verifikasi': '/kyc-pending', terverifikasi: '/kyc-verified', ditolak: '/kyc-rejected', 'ajukan ulang': '/kyc',
      'tambah katalog': '/admin/katalog/tambah', 'tambah alat': '/admin/katalog/tambah', 'tambah kategori': '/admin/kategori/tambah',
      'lihat semua notifikasi': role === 'vendor' ? '/vendor/notifikasi' : '/notifikasi', 'lihat semua': role === 'vendor' ? '/vendor/notifikasi' : '/notifikasi',
      'gabung vendor mitra': '/register', 'verifikasi ktp & kyc': '/kyc',
    };
    if (exact[t]) return exact[t];
    if (name === 'Menu Item') return /kyc ditolak/.test(t) ? '/kyc-rejected' : /kyc terverifikasi/.test(t) ? '/kyc-verified' : /dokumen kyc diterima/.test(t) ? '/kyc-pending' : screen.role === 'vendor' ? '/vendor/notifikasi' : '/notifikasi';
    if (t === 'lihat' && role === 'admin') return '/admin/katalog/1';
    if (t === 'lihat') return `/product/${productId(ancestors)}`;
    if (/^lihat semua \(/.test(t)) return '/vendor/3';
    if (/^langkah 1|1 langkah 1/.test(t)) return '/keranjang';
    if (/langkah 2/.test(t)) return '/pembayaran/bank';
    if (/langkah 3/.test(t)) return '/pembayaran/konfirmasi';
    if (/langkah 4/.test(t)) return '/booking/terkonfirmasi';
    if (/^lihat detail|^detail pesanan/.test(t)) return '/pesanan/VND-261011-8227';
    if (/^lihat bukti|^unggah foto serah|mulai masa sewa/.test(t)) return '/pesanan/VND-261011-8227/serah-terima';
    if (/^foto pengembalian|^unggah foto pengembalian|^tulis ulasan|^beri ulasan/.test(t)) return '/pesanan/VND-261011-8227/pengembalian';
    if (/^ajukan klaim/.test(t)) return '/klaim/ajukan';
    if (t === 'edit' && role === 'admin') return screen.key.includes('categor') ? '/admin/kategori/tambah' : '/admin/katalog/1/edit';
    if (t === 'edit' && screen.key === 'account-address') return '/akun/alamat/tambah';
    if (/kembali ke pengaturan/.test(t)) return '/vendor/pengaturan';
    if (/kembali|batal|tutup/.test(t) || /Button - (Tutup|Kembali)/.test(name)) {
      if (screen.key === 'account-add-address') return '/akun/alamat';
      if (screen.key === 'account-add-refund') return '/akun/rekening';
      if (screen.key === 'admin-category-dialog') return '/admin/kategori';
      if (/admin-.*product/.test(screen.key)) return '/admin/katalog';
      if (screen.key === 'vendor-contact') return '/vendor/3';
      if (screen.key === 'notification-menu') return '/kyc-rejected';
    }
    if (/Bayar.*Deposit|Lanjut.*Pembayaran/i.test(label) || node.id === '103:4000') return '/pembayaran/bank';
    return null;
  };

  const search = () => {
    if (screen.key === 'home') go('/catalog');
    else notify('Hasil pencarian diperbarui.');
  };
  const openFile = (node, label) => {
    uploadTarget.current = { node, label };
    fileInput.current.accept = /pembayaran/i.test(label) ? 'image/jpeg,image/png,application/pdf' : 'image/jpeg,image/png';
    fileInput.current.multiple = /bukti|minimal 2/i.test(label);
    fileInput.current.click();
  };
  const action = ({ node, label, ancestors, index, target }) => {
    const name = node.name || '';
    const text = normalized(label);
    const card = [...ancestors].reverse().find(n => /Card|Article|Row/.test(n.name || ''));
    if (screen.key === 'rental-faq' && label.trim().endsWith('?')) {
      const initiallyOpen = ancestors.at(-1)?.children?.some(child => child.name === 'Paragraph');
      setFaqExpanded(current => ({ ...current, [node.id]: !(current[node.id] ?? initiallyOpen) }));
      return;
    }
    if (/Switch/.test(name)) { setFields(current => ({ ...current, [node.id]: !(current[node.id] ?? true) })); return; }
    if (/wishlist/i.test(name) && !/^Button - Wishlist,/.test(name)) {
      const active = toggleWishlist(wishlistItemFor(ancestors, currentProduct));
      notify(active ? 'Alat disimpan ke wishlist.' : 'Alat dihapus dari wishlist.');
      return;
    }
    if (/tambah ke keranjang|^\+ tambah$/.test(text)) {
      setCart(current => [...new Set([...current, productId(ancestors)])]);
      notify('Alat ditambahkan ke keranjang.');
      return;
    }
    if (/Button - (Kurangi|Tambah)$/.test(name)) { setQuantity(current => Math.max(1, Math.min(2, current + (name.endsWith('Kurangi') ? -1 : 1)))); return; }
    if (/salin/i.test(label)) {
      const value = /nominal/i.test(label) ? '1500000' : screen.key === 'booking-confirmed' ? 'VND-261011-8227' : '8808 1234 5678 9012';
      navigator.clipboard?.writeText(value).then(() => notify('Disalin ke clipboard.')).catch(() => setDialog({ title: 'Salin', body: value }));
      return;
    }
    if (/Cetak|Unduh Invoice/.test(label)) { window.print(); return; }
    if (/Unggah|upload|Tarik file|memilih|bukti tambahan/i.test(`${name} ${label}`) && !/kirim|serah terima/i.test(label)) { openFile(node, label || name); return; }
    if (/perbesar|layar penuh|^Tampak Depan|Port & Kabel|Uji Fungsi Nyala|Hardcase \/ Tas/i.test(`${name} ${label}`)) {
      const images = descendants(ancestors.find(n => descendants(n, c => c.tag === 'img').length > 2), n => n.tag === 'img');
      const image = images[Math.min(index, images.length - 1)] || images[0];
      setDialog({ title: label || 'Foto kondisi barang', image: image?.props?.src });
      return;
    }
    if (/tandai.*dibaca/i.test(label)) {
      if (/semua/i.test(label)) {
        contentRef.current?.querySelectorAll('[data-card-id]').forEach(element => setRead(current => ({ ...current, [element.dataset.cardId]: true })));
      } else if (card) setRead(current => ({ ...current, [card.id]: true }));
      notify('Notifikasi ditandai sudah dibaca.'); return;
    }
    if (text === 'keluar') { if (preview) go('/'); else logout().then(() => navigate('/')); return; }
    if (/kirim bukti pembayaran/i.test(label)) {
      if (!Object.keys(uploads).length) { notify('Pilih bukti pembayaran terlebih dahulu.'); return; }
      go('/pembayaran/konfirmasi'); return;
    }
    if (/kirim dokumen/i.test(label)) {
      if (Object.keys(uploads).length < 2) { notify('Unggah foto KTP dan swafoto terlebih dahulu.'); return; }
      notify('Simulasi dokumen terkirim; data belum dikirim ke server.'); go('/kyc-pending'); return;
    }
    if (/^kirim klaim$/.test(text)) {
      if (Object.values(uploads).reduce((count, item) => count + item.count, 0) < 2) { notify('Lampirkan minimal dua foto bukti.'); return; }
      go('/klaim/KLM-891'); return;
    }
    if (/^kirim$/.test(text) && screen.key.startsWith('claim-')) {
      const value = Object.entries(fields).filter(([key]) => key.startsWith(screen.key)).at(-1)?.[1];
      if (value) { setMessages(current => [...current, value]); notify('Pesan ditambahkan ke pratinjau percakapan.'); }
      else notify('Tulis pesan terlebih dahulu.');
      return;
    }
    if (/^simpan|^perbarui|^kirim ulasan/i.test(label)) {
      if (/password|kata sandi/i.test(label)) {
        const values = [...contentRef.current.querySelectorAll('input[type=password]')].map(input => input.value);
        if (!values.every(Boolean) || values[1]?.length < 8 || values[1] !== values[2]) { notify('Lengkapi password; konfirmasi harus sama dan minimal 8 karakter.'); return; }
      }
      notify('Perubahan disimpan pada pratinjau lokal.');
      if (screen.key === 'account-add-address') go('/akun/alamat');
      if (screen.key === 'account-add-refund') go('/akun/rekening');
      if (/admin-.*product/.test(screen.key)) go('/admin/katalog');
      return;
    }
    if (target) { go(target); return; }
    if (name === 'Tab' || /^(Semua|Tenda|Sound|Lighting|Dekorasi|Kursi|Panggung|Furniture|Genset|Customer|Vendor|Admin|BCA|Mandiri|BRI|BNI|Bogor|Depok|Jakarta|Tangerang|Bekasi|Jabodetabek)/i.test(label)) {
      setSelected({ [node.id]: true });
      setFilter(current => ({ ...current, category: label, keyword: '' }));
      return;
    }
    if (/^cari alat$/.test(text)) { search(); return; }
    if (/^hapus|Button - Hapus/i.test(`${label} ${name}`)) {
      setDialog({ title: 'Hapus dari pratinjau?', body: 'Perubahan ini hanya berlaku pada tampilan lokal.', confirm: () => { if (card) setHidden(current => ({ ...current, [card.id]: true })); setDialog(null); notify('Item dihapus dari pratinjau.'); } }); return;
    }
    if (/^ikuti$|^nonaktifkan$|^aktifkan$|^setujui$|^tolak$|suspend/i.test(label)) {
      setSelected(current => ({ ...current, [node.id]: !current[node.id] })); notify('Status diperbarui pada pratinjau lokal.'); return;
    }
    if (/^bagikan$/.test(text)) { navigator.clipboard?.writeText(window.location.href).then(() => notify('Tautan profil disalin.')); return; }
    if (/bintang/.test(name)) { setSelected({ [node.id]: true }); return; }
    if (name.includes('Berikutnya') || name.includes('Sebelumnya') || /Halaman \d/.test(name) || /^\d+$/.test(text)) {
      setSelected({ [node.id]: true }); notify('Halaman pratinjau dipilih.'); return;
    }
    if (/buka$/.test(text) && screen.key === 'vendor-dashboard') { go(['/vendor/pesanan', '/vendor/serah-terima', '/vendor/klaim', '/vendor/pencairan'][index % 4]); return; }
    const help = /bantuan|resolusi|operator|escrow|perlindungan|kebijakan|syarat|privasi/i.test(label);
    setDialog({ title: label || name.replace(/^Button - /, '') || 'Detail', body: help ? 'Tim Vendoria membantu proses pemesanan, dokumentasi kondisi barang, dan penyelesaian klaim. Hubungi halo@vendoria.id atau +62 812-8800-4420.' : 'Tampilan ini menggunakan data contoh sesuai desain Figma. Perubahan dilakukan dalam pratinjau lokal.' });
  };

  const matchesProduct = node => {
    const text = normalized(nodeText(node));
    const keyword = normalized(filter.keyword || '');
    const category = normalized(filter.category || '').replace(/ &.*/, '').replace(/system/, '').trim();
    return (!keyword || text.includes(keyword)) && (!category || /^semua|paling|harga|rating|virtual|bca|mandiri|bri|bni/.test(category) || text.includes(category));
  };
  const profile = !preview && user && screen.key === 'account-profile';
  const kycLabel = { belum_diverifikasi: 'KYC Belum Diverifikasi', menunggu: 'KYC Menunggu Verifikasi', terverifikasi: 'KYC Terverifikasi', ditolak: 'KYC Ditolak' };
  const formatText = (text, ancestors) => {
    if (profile) { // teks contoh dari desain Figma diganti data sesi/database
      if (text === 'Data Pribadi & Kontak' && !user.no_telp?.trim()) return <>{text}<span className="profile-incomplete" role="status"><span className="profile-incomplete-sep" aria-hidden="true">|</span>Profil belum lengkap. Lengkapi nomor WhatsApp Anda.</span></>;
      if (text === 'Bagas Arya Pratama') return user.nama;
      if (text.trim() === 'bagas.arya@ipb.ac.id') return `${user.email} `;
      if (text.trim() === '+62 812-9876-5432') return ` ${user.no_telp || 'Nomor belum diisi'} `;
      if (text.includes('Bergabung 14 Mar 2026')) return user.created_at ? ` Bergabung ${new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
      if (text === 'KYC Terverifikasi') return kycLabel[user.status_verifikasi] || text;
      if (text === '1 alat tersimpan di wishlist') return `${wishlist.length} alat tersimpan di wishlist`;
    }
    if (screen.key.startsWith('product') && currentProduct && currentProduct.id !== 5) {
      if (text === 'Tenda Roder Transparan VIP 10x20m' && !ancestors.some(n => n.name === 'ProductCard')) return currentProduct.name;
      if (text === 'Rp3.200.000' && ancestors.some(n => n.name === 'Sidebar')) return `Rp${currentProduct.price.toLocaleString('id-ID')}`;
    }
    if (ancestors.some(n => n.children?.some(child => child.name === 'Button - Kurangi') && n.children?.some(child => child.name === 'Button - Tambah')) && text === '1') return String(quantity);
    if (screen.key.startsWith('product') && ancestors.some(n => n.name === 'Sidebar')) {
      const price = currentProduct?.price || 3200000;
      if (text === 'Rp9.600.000') return `Rp${(price * duration * quantity).toLocaleString('id-ID')}`;
      if (text === 'Rp1.500.000') return `Rp${(1500000 * quantity).toLocaleString('id-ID')}`;
      if (text === 'Rp11.100.000') return `Rp${((price * duration + 1500000) * quantity).toLocaleString('id-ID')}`;
      if (/^Biaya Sewa \(/.test(text)) return `Biaya Sewa (${duration} hari x ${quantity} unit)`;
      if (/^Durasi:/.test(text)) return `Durasi: ${duration} Hari`;
    }
    if (ancestors.some(n => n.name === 'Button - Kurangi' || n.name === 'Button - Tambah')) return text;
    return text;
  };
  const context = { screen, preview, user, fields, setFields, filter, setFilter, selected, wishlist, currentProduct, avatarUrl: profile ? user.foto_profil : null, googleEmail: profile && user.akun_google,
    // lencana contoh yang tak punya data di database: Kredibilitas 98%, email & nomor "terverifikasi"
    hidden: profile ? { ...hidden, '109:14220': true, '109:14259': true, '109:14271': true } : hidden, read, uploads, formatText, matchesProduct, targetFor, action, href, search, rentalDates, setRentalDates, activeImage, faqExpanded, setFaqExpanded };
  const stableKey = screen.nodeId;
  const unauthorizedRole = screen.role && screen.role !== 'customer' && user && user.role !== screen.role;
  // Vendor/admin pages and their descendants are public; other access checks remain in place.
  const publicBackoffice = /^\/(?:vendor|admin)(?:\/|$)/.test(location.pathname);
  const enforceAccess = !preview && !publicBackoffice;
  if (!preview && ['rental-faq', 'rental-policy'].includes(screen.key)) return <Navigate to="/cara-sewa" replace state={{ rentalTab: screen.key }} />;
  // Menu akun berbagi satu path (/akun); alamat lama diarahkan ke sana dengan menu yang sesuai.
  if (!preview && ['account-add-address', 'account-add-refund'].includes(screen.key)) return <Navigate to="/akun" replace state={{ accountTab: screen.key === 'account-add-address' ? 'account-address' : 'account-refund', accountModal: screen.key === 'account-add-address' ? 'address' : 'refund' }} />;
  if (!preview && accountTabs.some(tab => tab.key === screen.key) && screen.key !== 'account-profile') return <Navigate to="/akun" replace state={{ accountTab: screen.key }} />;
  if (enforceAccess && screen.role && loading) return <div className="vendoria-interface p-10" role="status">Memuat halaman…</div>;
  if (enforceAccess && screen.role && !user) return <Navigate to="/login" replace />;
  if (enforceAccess && unauthorizedRole) return <div className="vendoria-interface p-10"><h1 className="text-2xl mb-4">Halaman khusus {screen.role}</h1><Link to="/">Kembali ke Beranda</Link></div>;

  return <InterfaceContext.Provider value={context}>
    <div className="vendoria-interface" ref={contentRef} onKeyDown={event => {
      if (event.key === 'Escape') { if (dialog) setDialog(null); else if (/add-|dialog|contact|notification-menu/.test(screen.key)) go(screen.key.includes('address') ? '/akun/alamat' : screen.key.includes('refund') ? '/akun/rekening' : screen.key.includes('categor') ? '/admin/kategori' : screen.key.includes('vendor') ? '/vendor/3' : '/kyc-rejected'); }
      if (event.key === 'Tab' && dialog) {
        const elements = [...contentRef.current.querySelectorAll('[role=dialog] button,[role=dialog] a,[role=dialog] input')];
        if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
      }
    }}>
      {!screen.backoffice && <InterfaceHeader preview={preview} go={go} activeLabel={headerStates[screen.nodeId]?.active} cartCount={cart.length || headerStates[screen.nodeId]?.cart || 0} unread={Object.keys(read).length ? Math.max(0, (headerStates[screen.nodeId]?.unread || 15) - Object.keys(read).length) : headerStates[screen.nodeId]?.unread || 0} />}
      <main className={`design-surface ${screen.backoffice ? '' : 'customer-surface'}`}>
        <Suspense fallback={<div className="px-10 py-20" role="status">Memuat halaman…</div>}><ScreenContent key={['rental-guide', 'account-profile'].includes(screen.key) && !preview ? location.key : stableKey} screen={screen} preview={preview} initialRentalTab={location.state?.rentalTab} initialAccountTab={location.state?.accountTab} initialAccountModal={location.state?.accountModal} /></Suspense>
        {messages.length > 0 && <div className="mx-10 p-5 rounded-2xl border border-[#ede1d9] bg-white">{messages.map((message, index) => <p key={index} className="text-sm mb-2">{message}</p>)}</div>}
      </main>
      {!screen.backoffice && <DesignNode node={footer} />}
      {screen.key === 'notification-menu' && <div className="interface-notification-popup"><DesignNode node={notificationMenu} /></div>}
      <input ref={fileInput} hidden type="file" onChange={event => {
        const files = [...(event.target.files || [])];
        const allowed = fileInput.current.accept.split(',');
        if (files.some(file => file.size > 5 * 1024 * 1024 || !allowed.includes(file.type))) { notify('Gunakan format yang didukung dengan ukuran maksimal 5 MB per file.'); event.target.value = ''; return; }
        const target = uploadTarget.current;
        if (files.length && target) {
          const url = URL.createObjectURL(files[0]); objectUrls.current.push(url);
          setUploads(current => ({ ...current, [target.node.id]: { name: files.map(file => file.name).join(', '), count: files.length, url } }));
          notify('File dipilih untuk pratinjau lokal.');
        }
        event.target.value = '';
      }} />
      {toast && <div className="interface-toast" role="status">{toast}</div>}
      {dialog && <div className="interface-dialog-backdrop" onClick={() => setDialog(null)}>
        <section className="interface-dialog" role="dialog" aria-modal="true" aria-label={dialog.title} onClick={event => event.stopPropagation()}>
          <h2>{dialog.title}</h2>{dialog.image ? <img src={dialog.image} alt={dialog.title} /> : <p>{dialog.body}</p>}
          {dialog.confirm && <button type="button" onClick={dialog.confirm}>Hapus</button>}{' '}<button type="button" onClick={() => setDialog(null)}>{dialog.confirm ? 'Batal' : 'Tutup'}</button>
        </section>
      </div>}
      {preview && showPreviewNote && <div className="interface-demo-note"><Link to="/interface-review">← Semua layar</Link><span>Pratinjau · data contoh</span><button type="button" aria-label="Sembunyikan label pratinjau" onClick={() => setShowPreviewNote(false)}>×</button></div>}
    </div>
  </InterfaceContext.Provider>;
}
