import { initialData as vendorData } from '../vendor/vendorData';

const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const status = (options = ['Aktif', 'Nonaktif']) => field('status', 'Status', 'select', { options });
const notes = field('notes', 'Catatan', 'textarea', { optional: true });
const accountEmail = field('email', 'Email akun', 'email', { maxLength: 255, lockWhen: 'email_locked', lockedHint: 'Email ini dilindungi oleh login Google atau autentikasi 2 langkah aktif.' });
const accountPhone = field('phone', 'Nomor WhatsApp', 'tel', { optional: true, maxLength: 30 });
const accountPassword = field('password', 'Kata sandi', 'password', { secret: true, maxLength: 72 });
const accountNotes = { ...notes, maxLength: 4000 };
const categoryOptions = ['Tenda & kanopi', 'Sound system', 'Lighting & FX', 'Dekorasi', 'Kursi & meja', 'Panggung & genset'];

export const adminResources = {
  kyc: { path: 'kyc', title: 'Verifikasi KYC', singular: 'pengajuan KYC', prefix: 'KYC', description: 'Tinjau identitas customer dan vendor sebelum akun terverifikasi.', columns: [['id', 'No. pengajuan'], ['name', 'Nama pemohon'], ['type', 'Jenis akun'], ['date', 'Tanggal pengajuan'], ['status', 'Status']], fields: [field('name', 'Nama pemohon'), field('type', 'Jenis akun', 'select', { options: ['Customer', 'Vendor'] }), field('email', 'Email', 'email'), field('phone', 'Nomor WhatsApp', 'tel'), field('identity', 'Nomor identitas'), field('city', 'Domisili'), field('date', 'Tanggal pengajuan', 'date'), status(['Menunggu', 'Terverifikasi', 'Ditolak']), notes] },
  claims: { path: 'klaim', title: 'Kelola klaim', singular: 'klaim', prefix: 'KLM', description: 'Tinjau laporan, nilai klaim, dan keputusan penyelesaian sengketa.', columns: [['id', 'No. klaim'], ['order', 'Pesanan'], ['vendor', 'Vendor'], ['reason', 'Perihal'], ['amount', 'Nilai klaim'], ['status', 'Status']], fields: [field('order', 'Nomor pesanan'), field('customer', 'Nama customer'), field('vendor', 'Nama vendor'), field('reason', 'Perihal klaim'), field('date', 'Tanggal pengajuan', 'date'), field('amount', 'Nilai klaim (Rp)', 'number', { min: 0 }), status(['Diajukan', 'Ditinjau', 'Disetujui', 'Ditolak']), notes] },
  catalog: { path: 'katalog', title: 'Katalog alat', singular: 'alat', prefix: 'ALT', numericIds: true, description: 'Kelola alat dari seluruh vendor, termasuk peninjauan dan penangguhan.', columns: [['name', 'Nama alat'], ['vendor', 'Vendor'], ['category', 'Kategori'], ['price', 'Harga / hari'], ['status', 'Status']], fields: [field('name', 'Nama alat'), field('vendor', 'Nama vendor'), field('category', 'Kategori', 'select', { options: categoryOptions }), field('stock', 'Stok unit', 'number', { min: 0 }), field('price', 'Harga sewa per hari (Rp)', 'number', { min: 0 }), status(['Aktif', 'Menunggu review', 'Ditangguhkan', 'Draft']), field('description', 'Deskripsi alat', 'textarea', { optional: true }), notes] },
  categories: { path: 'kategori', title: 'Kategori katalog', singular: 'kategori', prefix: 'CAT', live: true, description: 'Atur kategori agar pelanggan lebih mudah menemukan perlengkapan acara. Jumlah alat dihitung dari katalog vendor.', columns: [['name', 'Nama kategori'], ['count', 'Jumlah alat']], fields: [field('name', 'Nama kategori')] },
  customers: { path: 'pengguna/pengguna', title: 'Pengguna customer', singular: 'customer', prefix: 'CST', live: true, description: 'Kelola profil dan status akun penyewa perlengkapan acara.', columns: [['name', 'Nama customer'], ['email', 'Email'], ['phone', 'Nomor WhatsApp'], ['status', 'Status']], fields: [field('name', 'Nama lengkap', 'text', { maxLength: 120 }), accountEmail, accountPhone, status(), accountPassword, accountNotes], extraDetailFields: [field('verification', 'Verifikasi identitas')] },
  vendors: { path: 'pengguna/vendor', title: 'Pengguna vendor', singular: 'vendor', prefix: 'VDR', live: true, description: 'Kelola akun pemilik dan informasi bisnis vendor. Keputusan KYC dilakukan melalui halaman Verifikasi KYC.', columns: [['name', 'Nama bisnis'], ['owner', 'Pemilik'], ['city', 'Kota'], ['verification', 'Verifikasi'], ['status', 'Status akun']], fields: [field('name', 'Nama bisnis', 'text', { maxLength: 150 }), field('owner', 'Nama pemilik', 'text', { maxLength: 120 }), accountEmail, accountPhone, field('city', 'Kota operasional', 'text', { optional: true, maxLength: 100 }), field('address', 'Alamat bisnis', 'textarea', { optional: true, maxLength: 2000 }), field('description', 'Deskripsi bisnis', 'textarea', { optional: true, maxLength: 10000 }), { ...status(), label: 'Status akun' }, field('businessStatus', 'Status bisnis', 'select', { options: ['Aktif', 'Nonaktif'], defaultValue: 'Nonaktif' }), accountPassword, accountNotes], extraDetailFields: [field('verification', 'Verifikasi identitas')] },
  administrators: { path: 'pengguna/admin', title: 'Pengguna administrator', singular: 'administrator', prefix: 'ADM', live: true, description: 'Kelola profil dan status anggota tim administrasi. Semua administrator aktif memiliki akses penuh.', columns: [['name', 'Nama administrator'], ['email', 'Email'], ['status', 'Status']], fields: [field('name', 'Nama lengkap'), field('email', 'Email', 'email'), status(),field('password', 'Kata sandi', 'password', { secret: true }), notes] },
  payouts: { path: 'laporan/pencairan', title: 'Pencairan dana', singular: 'pencairan', prefix: 'PCR', description: 'Pantau pencairan dana vendor dan rekening tujuan pembayaran.', columns: [['id', 'No. pencairan'], ['vendor', 'Vendor'], ['date', 'Tanggal'], ['bank', 'Bank tujuan'], ['amount', 'Nominal'], ['status', 'Status']], fields: [field('vendor', 'Nama vendor'), field('date', 'Tanggal pencairan', 'date'), field('bank', 'Bank tujuan', 'select', { options: ['BCA', 'Mandiri', 'BRI', 'BNI'] }), field('account', 'Nomor rekening'), field('amount', 'Nominal pencairan (Rp)', 'number', { min: 1 }), status(['Diajukan', 'Diproses', 'Selesai', 'Ditolak']), notes] },
};

export const adminInitialData = {
  kyc: [
    { id: 'KYC-1042', name: 'Nadia Putri', type: 'Customer', email: 'nadia@example.test', phone: '081200000101', identity: '3271 •••• •••• 0012', city: 'Bogor', date: '2026-11-23', status: 'Menunggu', notes: 'Data contoh. Pemeriksaan identitas menunggu peninjauan admin.' },
    { id: 'KYC-1041', name: 'Karya Audio Pro Bogor', type: 'Vendor', email: 'karya@example.test', phone: '081200000102', identity: '3271 •••• •••• 0013', city: 'Bogor', date: '2026-11-23', status: 'Menunggu', notes: 'Pengajuan identitas pemilik bisnis.' },
    { id: 'KYC-1040', name: 'Rizky Ramadhan', type: 'Customer', email: 'rizky@example.test', phone: '081200000103', identity: '3276 •••• •••• 0014', city: 'Depok', date: '2026-11-22', status: 'Menunggu', notes: '' },
    { id: 'KYC-1039', name: 'Bagas Arya Pratama', type: 'Vendor', email: 'bagas@example.test', phone: '081200000104', identity: '3271 •••• •••• 0001', city: 'Bogor', date: '2026-11-21', status: 'Terverifikasi', notes: 'Identitas telah diperiksa pada data contoh.' },
    { id: 'KYC-1038', name: 'Alya Maharani', type: 'Customer', email: 'alya@example.test', phone: '081200000105', identity: '3271 •••• •••• 0015', city: 'Bogor', date: '2026-11-20', status: 'Ditolak', notes: 'Foto identitas kurang jelas pada contoh pengajuan.' },
    { id: 'KYC-1037', name: 'Griya Kursi Nusantara', type: 'Vendor', email: 'griya@example.test', phone: '081200000106', identity: '3671 •••• •••• 0016', city: 'Tangerang', date: '2026-11-19', status: 'Terverifikasi', notes: '' },
  ],
  claims: [...vendorData.claims.map(record => ({ ...record, vendor: 'Roder Bogor Tenda Megah' })), { id: 'KLM-890', order: 'VND-8219', customer: 'Alya Maharani', vendor: 'Estetik Rental Pesta', reason: 'Perlengkapan tidak sesuai pesanan', date: '2026-11-21', amount: 500000, status: 'Diajukan', notes: 'Customer mengajukan pemeriksaan perbedaan perlengkapan.' }],
  catalog: vendorData.catalog.map((record, index) => ({ ...record, id: String(index + 1), vendor: index === 6 ? 'Karya Audio Pro Bogor' : 'Roder Bogor Tenda Megah', status: record.status === 'Perawatan' ? 'Menunggu review' : record.status, notes: '' })),
  categories: [], // data nyata dari backend (categoriesApi.js), bukan data contoh
  customers: ['Bagas Arya Pratama', 'Nadia Putri', 'Rizky Ramadhan', 'Alya Maharani', 'Dimas Pratama', 'Salsabila Zahra'].map((name, index) => ({ id: `CST-00${index + 1}`, name, email: `${name.split(' ')[0].toLowerCase()}@example.test`, phone: `08120000020${index}`, city: index === 2 ? 'Depok' : 'Bogor', status: index === 4 ? 'Nonaktif' : 'Aktif', notes: '' })),
  vendors: [
    { id: 'VDR-001', name: 'Roder Bogor Tenda Megah', owner: 'Bagas Arya Pratama', email: 'roder@example.test', phone: '081200000301', city: 'Bogor', verification: 'Terverifikasi', status: 'Aktif', notes: '' },
    { id: 'VDR-002', name: 'Karya Audio Pro Bogor', owner: 'Rizky Ramadhan', email: 'karya@example.test', phone: '081200000302', city: 'Bogor', verification: 'Menunggu', status: 'Menunggu', notes: '' },
    { id: 'VDR-003', name: 'Estetik Rental Pesta', owner: 'Alya Maharani', email: 'estetik@example.test', phone: '081200000303', city: 'Depok', verification: 'Terverifikasi', status: 'Aktif', notes: '' },
    { id: 'VDR-004', name: 'Griya Kursi Nusantara', owner: 'Dimas Pratama', email: 'griya@example.test', phone: '081200000304', city: 'Tangerang', verification: 'Terverifikasi', status: 'Ditangguhkan', notes: 'Penangguhan akun pada data contoh.' },
  ],
  administrators: [], // data nyata dari backend (administratorsApi.js), bukan data contoh
  payouts: vendorData.payouts.map((record, index) => ({ ...record, vendor: index === 1 ? 'Estetik Rental Pesta' : 'Roder Bogor Tenda Megah' })),
};

export const transactions = [
  { id: 'TRX-2418', date: '2026-11-23', customer: 'Bagas Arya Pratama', vendor: 'Roder Bogor Tenda Megah', total: 9600000, fee: 480000, status: 'Diproses' },
  { id: 'TRX-2417', date: '2026-11-23', customer: 'Nadia Putri', vendor: 'Karya Audio Pro Bogor', total: 1850000, fee: 92500, status: 'Selesai' },
  { id: 'TRX-2416', date: '2026-11-22', customer: 'Alya Maharani', vendor: 'Estetik Rental Pesta', total: 4500000, fee: 225000, status: 'Selesai' },
  { id: 'TRX-2415', date: '2026-11-22', customer: 'Dimas Pratama', vendor: 'Roder Bogor Tenda Megah', total: 2600000, fee: 130000, status: 'Selesai' },
  { id: 'TRX-2414', date: '2026-11-21', customer: 'Rizky Ramadhan', vendor: 'Karya Audio Pro Bogor', total: 3700000, fee: 185000, status: 'Selesai' },
  { id: 'TRX-2413', date: '2026-11-20', customer: 'Salsabila Zahra', vendor: 'Griya Kursi Nusantara', total: 3500000, fee: 175000, status: 'Selesai' },
  { id: 'TRX-2412', date: '2026-11-19', customer: 'Nadia Putri', vendor: 'Estetik Rental Pesta', total: 4500000, fee: 0, status: 'Dibatalkan' },
  { id: 'TRX-2411', date: '2026-11-18', customer: 'Bagas Arya Pratama', vendor: 'Roder Bogor Tenda Megah', total: 6400000, fee: 320000, status: 'Selesai' },
];

// Data contoh dashboard (dari desain Figma node 89:2); belum ada endpoint transaksi/laporan.
export const dashboardTransactions = [
  { id: '#261012-8821', customer: 'Bagas Arya Pratama', vendor: 'Roder Bogor Tenda Megah', total: 21450000, status: 'Menunggu Pembayaran' },
  { id: '#261120-1000', customer: 'Siti Rahmawati', vendor: 'Karya Audio Pro Bogor', total: 600000, status: 'Selesai' },
  { id: '#261118-1737', customer: 'Bagas Arya Pratama', vendor: 'Roder Bogor Tenda Megah', total: 1000000, status: 'Selesai' },
  { id: '#261005-7712', customer: 'Bagas Arya Pratama', vendor: 'Karya Audio Pro Bogor', total: 5000000, status: 'Terkonfirmasi' },
  { id: '#261116-2474', customer: 'Anisa Putri', vendor: 'Luminary Stage Lighting Bogor', total: 1350000, status: 'Selesai' },
  { id: '#260928-4019', customer: 'Bagas Arya Pratama', vendor: 'Roder Bogor Tenda Megah', total: 10600000, status: 'Sedang Disewa' },
];

// value = nilai sewa (juta rupiah), count = jumlah transaksi
export const weeklyVolume = [
  { label: 'M-7', value: 24, count: 6 }, { label: 'M-6', value: 9, count: 3 }, { label: 'M-5', value: 11, count: 7 }, { label: 'M-4', value: 12, count: 7 },
  { label: 'M-3', value: 17, count: 5 }, { label: 'M-2', value: 17, count: 7 }, { label: 'M-1', value: 8, count: 4 }, { label: 'Ini', value: 41, count: 10 },
];

export const adminNotifications = [
  { id: 1, title: 'Pengajuan KYC baru', body: 'Identitas Nadia Putri menunggu peninjauan.', time: '10 menit lalu', path: '/admin/kyc/KYC-1042', read: false },
  { id: 2, title: 'Klaim perlu ditinjau', body: 'Klaim KLM-891 memerlukan keputusan admin.', time: '30 menit lalu', path: '/admin/klaim/KLM-891', read: false },
  { id: 3, title: 'Katalog menunggu review', body: 'Periksa informasi alat yang diajukan vendor.', time: '1 jam lalu', path: '/admin/katalog/6', read: false },
  { id: 4, title: 'Pencairan dana selesai', body: 'Pencairan PCR-2038 selesai pada data contoh.', time: 'Kemarin', path: '/admin/laporan/pencairan/PCR-2038', read: true },
];

export function resolveAdminResource(pathname) {
  const relative = pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '').replace(/^pengguna\/customer(?=\/|$)/, 'pengguna/pengguna');
  const entry = Object.entries(adminResources).sort((a, b) => b[1].path.length - a[1].path.length).find(([, resource]) => relative === resource.path || relative.startsWith(`${resource.path}/`));
  if (!entry) return null;
  const [key, resource] = entry;
  const tail = relative.slice(resource.path.length).split('/').filter(Boolean);
  if (tail[1] === 'edit-lengkap') tail[1] = 'edit';
  return { key, segments: [resource.path, ...tail] };
}
