import { blogPosts } from '../../data/blogPosts';
// Each entry corresponds to one non-authentication frame on Figma's "versi revisi" page.
// Keep distinct states addressable so they can be reviewed without changing source code.
export const screens = [
  ['home', '/', '84:3400', 'Beranda'],
  ['catalog', '/catalog', '84:4705', 'Katalog alat event'],
  ['product', '/product/5', '84:6113', 'Deskripsi & spesifikasi'],
  ['product-condition', '/product/5/kondisi', '84:7295', 'Kondisi & SOP'],
  ['product-reviews', '/product/5/ulasan', '84:9589', 'Ulasan penyewa'],
  ['product-policy', '/product/5/kebijakan', '84:10958', 'Deposit & klaim'],
  ['vendor-profile', '/vendor/3', '85:13250', 'Profil vendor'],
  ['vendor-dashboard', '/vendor/dashboard', '86:2', 'Dashboard vendor', 'vendor'],
  ['vendor-handover', '/vendor/serah-terima', '86:600', 'Serah terima vendor', 'vendor'],
  ['vendor-catalog', '/vendor/katalog', '86:986', 'Katalog vendor', 'vendor'],
  ['vendor-orders', '/vendor/pesanan', '86:1524', 'Pesanan vendor', 'vendor'],
  ['vendor-claims', '/vendor/klaim', '86:2064', 'Klaim vendor', 'vendor'],
  ['vendor-payouts', '/vendor/pencairan', '86:2538', 'Pencairan dana vendor', 'vendor'],
  ['vendor-search', '/vendor/pencarian', '86:2951', 'Pencarian vendor', 'vendor'],
  ['vendor-notification-menu', '/vendor/notifikasi-menu', '86:3594', 'Menu notifikasi vendor', 'vendor'],
  ['vendor-notifications', '/vendor/notifikasi', '86:4914', 'Notifikasi vendor', 'vendor'],
  ['vendor-account', '/vendor/pengaturan', '86:5438', 'Profil pemilik', 'vendor'],
  ['vendor-business', '/vendor/profil-bisnis', '86:5903', 'Profil bisnis', 'vendor'],
  ['vendor-kyc', '/vendor/kyc', '86:6337', 'Detail KYC vendor', 'vendor'],
  ['vendor-security', '/vendor/keamanan', '86:6680', 'Keamanan vendor', 'vendor'],
  ['admin-dashboard', '/admin', '89:2', 'Dashboard admin', 'admin'],
  ['admin-kyc', '/admin/kyc', '89:898', 'Verifikasi KYC', 'admin'],
  ['admin-claims', '/admin/klaim', '89:1645', 'Kelola klaim', 'admin'],
  ['admin-catalog', '/admin/katalog', '89:3424', 'Kelola katalog alat', 'admin'],
  ['admin-reports', '/admin/laporan', '89:4216', 'Laporan transaksi', 'admin'],
  ['admin-customers', '/admin/pengguna/customer', '89:5198', 'Pengguna customer', 'admin'],
  ['admin-categories', '/admin/kategori', '89:5923', 'Kategori katalog', 'admin'],
  ['admin-payouts', '/admin/laporan/pencairan', '89:6402', 'Laporan pencairan', 'admin'],
  ['admin-vendors', '/admin/pengguna/vendor', '89:6950', 'Pengguna vendor', 'admin'],
  ['admin-administrators', '/admin/pengguna/admin', '89:7828', 'Pengguna admin', 'admin'],
  ['admin-edit-product', '/admin/katalog/1/edit', '89:8305', 'Edit katalog', 'admin'],
  ['admin-product', '/admin/katalog/1', '89:9351', 'Detail katalog admin', 'admin'],
  ['admin-suspend-product', '/admin/katalog/1/suspend', '92:3', 'Suspend katalog', 'admin'],
  ['admin-product-wide', '/admin/katalog/1/lihat', '92:856', 'Detail katalog lebar', 'admin'],
  ['admin-edit-product-wide', '/admin/katalog/1/edit-lengkap', '92:2052', 'Edit katalog lengkap', 'admin'],
  ['admin-add-product', '/admin/katalog/tambah', '92:3104', 'Tambah katalog', 'admin'],
  ['admin-category-dialog', '/admin/kategori/tambah', '92:4071', 'Tambah kategori', 'admin'],
  ['admin-product-review', '/admin/katalog/1/pratinjau', '92:5382', 'Pratinjau katalog', 'admin'],
  ['vendor-contact', '/vendor/3/kontak', '101:2', 'Kontak vendor'],
  ['rental-guide', '/cara-sewa', '101:1144', 'Cara sewa'],
  ['rental-faq', '/cara-sewa/faq', '101:1785', 'Pusat bantuan & FAQ'],
  ['rental-policy', '/cara-sewa/kebijakan', '101:2289', 'Kebijakan deposit & proteksi'],
  ['checkout', '/keranjang', '103:3688', 'Keranjang & checkout'],
  ['payment-bank', '/pembayaran/bank', '103:4479', 'Pembayaran virtual account'],
  ['payment-qr', '/pembayaran/qris', '103:5173', 'Pembayaran QRIS'],
  ['payment-wallet', '/pembayaran/e-wallet', '103:5827', 'Pembayaran e-wallet'],
  ['booking-confirmed', '/booking/terkonfirmasi', '103:7063', 'Booking terkonfirmasi'],
  ['orders', '/pesanan', '103:7616', 'Pesanan saya', 'customer'],
  ['order-detail', '/pesanan/VND-261011-8227', '103:8519', 'Detail pesanan', 'customer'],
  ['order-handover', '/pesanan/VND-261011-8227/serah-terima', '103:9459', 'Serah terima pesanan', 'customer'],
  ['order-return', '/pesanan/VND-261011-8227/pengembalian', '106:10412', 'Pengembalian & ulasan', 'customer'],
  ['claim-ticket', '/klaim/KLM-891', '106:11949', 'Tiket mediasi', 'customer'],
  ['claim-decision', '/klaim/KLM-891/keputusan', '106:12530', 'Keputusan klaim', 'customer'],
  ['wishlist-empty', '/wishlist/kosong', '109:13149', 'Wishlist kosong'],
  ['wishlist', '/wishlist', '109:13575', 'Wishlist'],
  ['account-profile', '/akun', '109:14128', 'Profil akun', 'customer'],
  ['account-security', '/akun/keamanan', '109:14600', 'Keamanan akun', 'customer'],
  ['account-kyc', '/akun/kyc', '109:15059', 'Status KYC akun', 'customer'],
  ['account-address', '/akun/alamat', '109:15463', 'Alamat acara', 'customer'],
  ['account-refund', '/akun/rekening', '109:15959', 'Rekening refund', 'customer'],
  ['account-add-address', '/akun/alamat/tambah', '109:16389', 'Tambah alamat', 'customer'],
  ['account-add-refund', '/akun/rekening/tambah', '109:16970', 'Tambah rekening refund', 'customer'],
  ['notifications', '/notifikasi', '109:18000', 'Pusat notifikasi'],
  ['kyc', '/kyc', '109:19307', 'Verifikasi KYC'],
  ['kyc-pending', '/kyc-pending', '109:20019', 'KYC menunggu'],
  ['kyc-verified', '/kyc-verified', '109:20373', 'KYC terverifikasi'],
  ['kyc-rejected', '/kyc-rejected', '109:20729', 'KYC ditolak'],
  ['notification-menu', '/notifikasi/menu', '109:21462', 'Popover notifikasi'],
].map(([key, path, nodeId, title, role]) => ({ key, path, nodeId, title, role, backoffice: role === 'vendor' || role === 'admin' }));

export const screenByKey = Object.fromEntries(screens.map(screen => [screen.key, screen]));
export function resolveScreen(pathname) {
  const exact = screens.find(screen => screen.path === pathname);
  if (exact) return exact;
  if (pathname === '/cara-sewa/serah-terima') return screenByKey['rental-guide'];
  // Artikel tidak punya frame Figma; nodeId hanya menentukan menu header yang menyala.
  const post = blogPosts.find(item => pathname === `/blog/${item.slug}`);
  if (post) return { key: 'blog', path: pathname, nodeId: screenByKey.home.nodeId, title: post.title };
  if (/^\/product\/[^/]+/.test(pathname)) {
    return screenByKey[({ kondisi: 'product-condition', ulasan: 'product-reviews', kebijakan: 'product-policy' })[pathname.split('/')[3]] || 'product'];
  }
  if (/^\/vendor\/\d+/.test(pathname)) return screenByKey[pathname.endsWith('/kontak') ? 'vendor-contact' : 'vendor-profile'];
  if (/^\/pesanan\/[^/]+/.test(pathname)) return screenByKey[pathname.endsWith('/serah-terima') ? 'order-handover' : pathname.endsWith('/pengembalian') ? 'order-return' : 'order-detail'];
  return screenByKey.home;
}
