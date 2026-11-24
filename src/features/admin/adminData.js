const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const status = (options = ['Aktif', 'Nonaktif']) => field('status', 'Status', 'select', { options });
const notes = field('notes', 'Catatan', 'textarea', { optional: true });
const accountEmail = field('email', 'Email akun', 'email', { maxLength: 255, lockWhen: 'email_locked', lockedHint: 'Email ini dilindungi oleh login Google atau autentikasi 2 langkah aktif.' });
const accountPhone = field('phone', 'Nomor WhatsApp', 'tel', { optional: true, maxLength: 30 });
const accountPassword = field('password', 'Kata sandi', 'password', { secret: true, maxLength: 72 });
const accountNotes = { ...notes, maxLength: 4000 };

export const adminResources = {
  kyc: { path: 'kyc', title: 'Verifikasi KYC', singular: 'pengajuan KYC', prefix: 'KYC', description: 'Tinjau identitas customer dan vendor sebelum akun terverifikasi.', columns: [['id', 'No. pengajuan'], ['name', 'Nama pemohon'], ['type', 'Jenis akun'], ['date', 'Tanggal pengajuan'], ['status', 'Status']], fields: [field('name', 'Nama pemohon'), field('type', 'Jenis akun', 'select', { options: ['Customer', 'Vendor'] }), field('email', 'Email', 'email'), field('phone', 'Nomor WhatsApp', 'tel'), field('identity', 'Nomor identitas'), field('city', 'Domisili'), field('date', 'Tanggal pengajuan', 'date'), status(['Menunggu', 'Terverifikasi', 'Ditolak']), notes] },
  claims: { path: 'klaim', title: 'Kelola klaim', singular: 'klaim', prefix: 'KLM', live: true, description: 'Tinjau klaim yang masuk, lalu putuskan untuk menyetujui atau menolaknya.', columns: [], fields: [] }, // halaman khusus: AdminClaimsPage
  catalog: { path: 'katalog', title: 'Katalog alat', singular: 'alat', prefix: 'ALT', live: true, noCreate: true, noDelete: true, editable: ['status'], description: 'Pantau alat dari seluruh vendor. Admin hanya dapat mengubah status alat; data lainnya dikelola vendor.', columns: [['name', 'Nama alat'], ['vendor', 'Vendor'], ['category', 'Kategori'], ['price', 'Harga / hari'], ['status', 'Status']], fields: [field('name', 'Nama alat'), field('vendor', 'Nama vendor'), field('category', 'Kategori'), field('stock', 'Stok unit', 'number', { min: 0 }), field('price', 'Harga sewa per hari (Rp)', 'number', { min: 0 }), status(['Aktif', 'Nonaktif', 'Arsip']), field('description', 'Deskripsi alat', 'textarea', { optional: true })] },
  categories: { path: 'kategori', title: 'Kategori katalog', singular: 'kategori', prefix: 'CAT', live: true, description: 'Atur kategori agar pelanggan lebih mudah menemukan perlengkapan acara. Jumlah alat dihitung dari katalog vendor.', columns: [['name', 'Nama kategori'], ['count', 'Jumlah alat']], fields: [field('name', 'Nama kategori')] },
  customers: { noCreate: true, noEdit: true, noDelete: true, path: 'pengguna/pengguna', title: 'Pengguna customer', singular: 'customer', prefix: 'CST', live: true, description: 'Lihat profil dan status akun penyewa perlengkapan acara.', columns: [['name', 'Nama customer'], ['email', 'Email'], ['phone', 'Nomor WhatsApp'], ['status', 'Status']], fields: [field('name', 'Nama lengkap', 'text', { maxLength: 120 }), accountEmail, accountPhone, status(), accountPassword, accountNotes], extraDetailFields: [field('verification', 'Verifikasi identitas')] },
  vendors: { noCreate: true, noEdit: true, noDelete: true, path: 'pengguna/vendor', title: 'Pengguna vendor', singular: 'vendor', prefix: 'VDR', live: true, description: 'Lihat profil vendor. Status bisnis aktif otomatis setelah KYC terverifikasi dan profil bisnis lengkap.', columns: [['name', 'Nama bisnis'], ['owner', 'Pemilik'], ['city', 'Kota'], ['verification', 'Verifikasi'], ['status', 'Status akun']], fields: [field('name', 'Nama bisnis', 'text', { maxLength: 150 }), field('owner', 'Nama pemilik', 'text', { maxLength: 120 }), accountEmail, accountPhone, field('city', 'Kota operasional', 'text', { optional: true, maxLength: 100 }), field('address', 'Alamat bisnis', 'textarea', { optional: true, maxLength: 2000 }), field('description', 'Deskripsi bisnis', 'textarea', { optional: true, maxLength: 10000 }), { ...status(), label: 'Status akun' }, accountPassword, accountNotes], extraDetailFields: [field('verification', 'Verifikasi identitas'), field('businessStatus', 'Status bisnis otomatis')] },
  administrators: { path: 'pengguna/admin', title: 'Pengguna administrator', singular: 'administrator', prefix: 'ADM', live: true, description: 'Kelola profil dan status anggota tim administrasi.', columns: [['name', 'Nama administrator'], ['email', 'Email'], ['status', 'Status']], fields: [field('name', 'Nama lengkap'), field('email', 'Email', 'email'), status(),field('password', 'Kata sandi', 'password', { secret: true }), notes] },
  payouts: { path: 'laporan/pencairan', title: 'Pencairan dana', singular: 'pencairan', prefix: 'PCR', live: true, description: 'Pantau pencairan dana vendor dari pesanan yang selesai.', columns: [], fields: [] }, // halaman khusus: AdminPayoutsPage
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
  claims: [], // data nyata dari backend (claimsApi.js), bukan data contoh
  catalog: [], // data nyata dari backend (catalogApi.js), bukan data contoh
  categories: [], // data nyata dari backend (categoriesApi.js), bukan data contoh
  customers: ['Bagas Arya Pratama', 'Nadia Putri', 'Rizky Ramadhan', 'Alya Maharani', 'Dimas Pratama', 'Salsabila Zahra'].map((name, index) => ({ id: `CST-00${index + 1}`, name, email: `${name.split(' ')[0].toLowerCase()}@example.test`, phone: `08120000020${index}`, city: index === 2 ? 'Depok' : 'Bogor', status: index === 4 ? 'Nonaktif' : 'Aktif', notes: '' })),
  vendors: [
    { id: 'VDR-001', name: 'Roder Bogor Tenda Megah', owner: 'Bagas Arya Pratama', email: 'roder@example.test', phone: '081200000301', city: 'Bogor', verification: 'Terverifikasi', status: 'Aktif', notes: '' },
    { id: 'VDR-002', name: 'Karya Audio Pro Bogor', owner: 'Rizky Ramadhan', email: 'karya@example.test', phone: '081200000302', city: 'Bogor', verification: 'Menunggu', status: 'Menunggu', notes: '' },
    { id: 'VDR-003', name: 'Estetik Rental Pesta', owner: 'Alya Maharani', email: 'estetik@example.test', phone: '081200000303', city: 'Depok', verification: 'Terverifikasi', status: 'Aktif', notes: '' },
    { id: 'VDR-004', name: 'Griya Kursi Nusantara', owner: 'Dimas Pratama', email: 'griya@example.test', phone: '081200000304', city: 'Tangerang', verification: 'Terverifikasi', status: 'Ditangguhkan', notes: 'Penangguhan akun pada data contoh.' },
  ],
  administrators: [], // data nyata dari backend (administratorsApi.js), bukan data contoh
  payouts: [], // data nyata dari backend (reportsApi.js), bukan data contoh
};

export function resolveAdminResource(pathname) {
  const relative = pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '').replace(/^pengguna\/customer(?=\/|$)/, 'pengguna/pengguna');
  const entry = Object.entries(adminResources).sort((a, b) => b[1].path.length - a[1].path.length).find(([, resource]) => relative === resource.path || relative.startsWith(`${resource.path}/`));
  if (!entry) return null;
  const [key, resource] = entry;
  const tail = relative.slice(resource.path.length).split('/').filter(Boolean);
  if (tail[1] === 'edit-lengkap') tail[1] = 'edit';
  return { key, segments: [resource.path, ...tail] };
}
