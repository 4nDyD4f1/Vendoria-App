import catalogEntries from '../interface/catalogEntries.json';

export const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
export const shortDate = value => value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—';
const imageFor = title => catalogEntries.find(item => item.title === title)?.image || '';

export const initialData = {
  catalog: [
    { id: 'ALT-001', name: 'Tenda Roder Transparan VIP 10x20m', category: 'Tenda & kanopi', stock: 4, price: 3200000, status: 'Aktif', description: 'Tenda transparan untuk pernikahan dan acara outdoor. Termasuk rangka dan pemasangan.', image: imageFor('Tenda Roder Transparan VIP 10x20m') },
    { id: 'ALT-002', name: 'Tenda Dome Roder Premium 5x5m', category: 'Tenda & kanopi', stock: 12, price: 450000, status: 'Aktif', description: 'Tenda dome untuk area registrasi, bazar, dan acara komunitas.', image: imageFor('Tenda Dome Roder Premium 5x5m') },
    { id: 'ALT-003', name: 'Genset Silent Cummins 45 kVA', category: 'Panggung & genset', stock: 2, price: 2100000, status: 'Aktif', description: 'Genset silent dengan bahan bakar untuk pemakaian delapan jam.', image: imageFor('Genset Silent Cummins 45 kVA + Solar 8 Jam') },
    { id: 'ALT-004', name: 'Tenda Sarnafil Putih 5x10m', category: 'Tenda & kanopi', stock: 8, price: 650000, status: 'Aktif', description: 'Tenda sarnafil putih untuk acara formal dan pameran.', image: imageFor('Tenda Sarnafil Putih 5x10m') },
    { id: 'ALT-005', name: 'Paket Kursi Crossback Kayu Jati', category: 'Kursi & meja', stock: 100, price: 35000, status: 'Aktif', description: 'Kursi crossback kayu dengan bantalan duduk. Harga per unit.', image: imageFor('Paket 100 Kursi Crossback Kayu Jati') },
    { id: 'ALT-006', name: 'Lighting Warm Ambience & Fairy Lights', category: 'Lighting & FX', stock: 6, price: 550000, status: 'Perawatan', description: 'Paket pencahayaan warm white untuk suasana resepsi.', image: imageFor('Lighting Set Warm Ambience & Fairy Lights') },
    { id: 'ALT-007', name: 'Set Line Array 5000W', category: 'Sound system', stock: 3, price: 1850000, status: 'Draft', description: 'Paket audio dengan mixer digital dan operator.', image: imageFor('Set Line Array 5000W + Digital Mixer 32-Channel') },
  ],
  orders: [
    { id: 'VND-8227', customer: 'Bagas Arya Pratama', equipment: 'Tenda Roder Transparan VIP 10x20m', start: '2026-11-24', end: '2026-11-26', total: 9600000, status: 'Dikonfirmasi', venue: 'Gedung Alumni IPB, Bogor', notes: 'Pemasangan sehari sebelum acara.' },
    { id: 'VND-8226', customer: 'Nadia Putri', equipment: 'Tenda Dome Roder Premium 5x5m', start: '2026-11-23', end: '2026-11-24', total: 1800000, status: 'Berlangsung', venue: 'Taman Budaya Bogor', notes: 'Empat unit untuk area bazar.' },
    { id: 'VND-8225', customer: 'Rizky Ramadhan', equipment: 'Genset Silent Cummins 45 kVA', start: '2026-11-25', end: '2026-11-25', total: 2100000, status: 'Menunggu', venue: 'Aula Sekolah Vokasi IPB', notes: '' },
    { id: 'VND-8224', customer: 'Alya Maharani', equipment: 'Paket Kursi Crossback Kayu Jati', start: '2026-11-22', end: '2026-11-22', total: 3500000, status: 'Selesai', venue: 'Grand Savero, Bogor', notes: '' },
    { id: 'VND-8223', customer: 'Dimas Pratama', equipment: 'Tenda Sarnafil Putih 5x10m', start: '2026-11-21', end: '2026-11-22', total: 2600000, status: 'Selesai', venue: 'Lapangan Sempur', notes: '' },
    { id: 'VND-8222', customer: 'Salsabila Zahra', equipment: 'Tenda Roder Transparan VIP 10x20m', start: '2026-11-28', end: '2026-11-29', total: 6400000, status: 'Menunggu', venue: 'Botani Square, Bogor', notes: '' },
  ],
  handovers: [
    { id: 'ST-1024', order: 'VND-8227', customer: 'Bagas Arya Pratama', date: '2026-11-24', type: 'Pengiriman', status: 'Terjadwal', pic: 'Rudi Hartono', notes: 'Cek rangka, atap, dan kelengkapan sebelum dikirim.' },
    { id: 'ST-1023', order: 'VND-8226', customer: 'Nadia Putri', date: '2026-11-24', type: 'Pengembalian', status: 'Menunggu inspeksi', pic: 'Andi Saputra', notes: '' },
    { id: 'ST-1022', order: 'VND-8224', customer: 'Alya Maharani', date: '2026-11-22', type: 'Pengembalian', status: 'Selesai', pic: 'Rudi Hartono', notes: 'Seluruh unit telah diperiksa.' },
  ],
  claims: [
    { id: 'KLM-891', order: 'VND-8223', customer: 'Dimas Pratama', reason: 'Kerusakan bagian atap tenda', date: '2026-11-22', amount: 350000, status: 'Ditinjau', notes: 'Sobekan pada salah satu sisi atap. Bukti foto dalam data contoh.' },
    { id: 'KLM-887', order: 'VND-8214', customer: 'Fajar Maulana', reason: 'Keterlambatan pengembalian', date: '2026-11-18', amount: 150000, status: 'Disetujui', notes: 'Pengembalian terlambat satu hari.' },
  ],
  payouts: [
    { id: 'PCR-2041', date: '2026-11-23', bank: 'BCA', account: '8830••••7992', amount: 6100000, status: 'Diproses', notes: 'Pencairan transaksi selesai tanggal 21–22 November.' },
    { id: 'PCR-2038', date: '2026-11-19', bank: 'BCA', account: '8830••••7992', amount: 4800000, status: 'Selesai', notes: '' },
    { id: 'PCR-2034', date: '2026-11-16', bank: 'Mandiri', account: '1300••••2410', amount: 7200000, status: 'Selesai', notes: '' },
  ],
};

const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
export const resources = {
  catalog: {
    path: 'katalog', title: 'Katalog alat', singular: 'alat', prefix: 'ALT', description: 'Kelola perlengkapan, harga sewa, dan ketersediaan alat Anda.',
    columns: [['name', 'Nama alat'], ['category', 'Kategori'], ['stock', 'Stok'], ['price', 'Harga / hari'], ['status', 'Status']],
    fields: [field('name', 'Nama alat'), field('category', 'Kategori', 'select', { options: ['Tenda & kanopi', 'Sound system', 'Lighting & FX', 'Dekorasi', 'Kursi & meja', 'Panggung & genset'] }), field('stock', 'Stok unit', 'number', { min: 0 }), field('price', 'Harga sewa per hari (Rp)', 'number', { min: 0 }), field('status', 'Status katalog', 'select', { options: ['Aktif', 'Draft', 'Perawatan'] }), field('description', 'Deskripsi alat', 'textarea', { optional: true })],
  },
  orders: {
    path: 'pesanan', title: 'Pesanan', singular: 'pesanan', prefix: 'VND', description: 'Pantau jadwal sewa dan kelola setiap pesanan dalam satu tempat.',
    columns: [['id', 'No. pesanan'], ['customer', 'Pelanggan'], ['start', 'Tanggal sewa'], ['total', 'Total sewa'], ['status', 'Status']],
    fields: [field('customer', 'Nama pelanggan'), field('equipment', 'Perlengkapan'), field('start', 'Tanggal mulai', 'date'), field('end', 'Tanggal selesai', 'date'), field('total', 'Total sewa (Rp)', 'number', { min: 0 }), field('status', 'Status pesanan', 'select', { options: ['Menunggu', 'Dikonfirmasi', 'Berlangsung', 'Selesai', 'Dibatalkan'] }), field('venue', 'Lokasi acara'), field('notes', 'Catatan pesanan', 'textarea', { optional: true })],
  },
  handovers: {
    path: 'serah-terima', title: 'Serah terima', singular: 'serah terima', prefix: 'ST', description: 'Atur pengiriman, pengembalian, dan pemeriksaan kondisi alat.',
    columns: [['id', 'No. serah terima'], ['order', 'Pesanan'], ['customer', 'Pelanggan'], ['date', 'Jadwal'], ['type', 'Jenis'], ['status', 'Status']],
    fields: [field('order', 'Nomor pesanan'), field('customer', 'Nama pelanggan'), field('date', 'Tanggal serah terima', 'date'), field('type', 'Jenis serah terima', 'select', { options: ['Pengiriman', 'Pengembalian'] }), field('pic', 'Penanggung jawab'), field('status', 'Status', 'select', { options: ['Terjadwal', 'Menunggu inspeksi', 'Selesai'] }), field('notes', 'Catatan kondisi alat', 'textarea', { optional: true })],
  },
  claims: {
    path: 'klaim', title: 'Klaim', singular: 'klaim', prefix: 'KLM', description: 'Dokumentasikan kendala dan pantau proses penyelesaian klaim.',
    columns: [['id', 'No. klaim'], ['order', 'Pesanan'], ['reason', 'Perihal'], ['amount', 'Nilai klaim'], ['status', 'Status']],
    fields: [field('order', 'Nomor pesanan'), field('customer', 'Nama pelanggan'), field('reason', 'Perihal klaim'), field('date', 'Tanggal pengajuan', 'date'), field('amount', 'Nilai klaim (Rp)', 'number', { min: 0 }), field('status', 'Status klaim', 'select', { options: ['Diajukan', 'Ditinjau', 'Disetujui', 'Ditolak'] }), field('notes', 'Keterangan dan kronologi', 'textarea', { optional: true })],
  },
  payouts: {
    path: 'pencairan', title: 'Pencairan dana', singular: 'pencairan', prefix: 'PCR', description: 'Kelola daftar pencairan dan rekening tujuan pembayaran.',
    columns: [['id', 'No. pencairan'], ['date', 'Tanggal'], ['bank', 'Bank tujuan'], ['account', 'Rekening'], ['amount', 'Nominal'], ['status', 'Status']],
    fields: [field('date', 'Tanggal pencairan', 'date'), field('bank', 'Bank tujuan', 'select', { options: ['BCA', 'Mandiri', 'BRI', 'BNI'] }), field('account', 'Nomor rekening'), field('amount', 'Nominal pencairan (Rp)', 'number', { min: 1 }), field('status', 'Status pencairan', 'select', { options: ['Diajukan', 'Diproses', 'Selesai', 'Ditolak'] }), field('notes', 'Catatan', 'textarea', { optional: true })],
  },
};

export const initialNotifications = [
  { id: 1, title: 'Pesanan baru perlu dikonfirmasi', body: 'Rizky Ramadhan memesan Genset Silent Cummins untuk 25 November.', time: '10 menit lalu', path: '/vendor/pesanan/VND-8225', read: false },
  { id: 2, title: 'Pengiriman terjadwal besok', body: 'Siapkan perlengkapan untuk pesanan Bagas Arya Pratama.', time: '45 menit lalu', path: '/vendor/serah-terima/ST-1024', read: false },
  { id: 3, title: 'Pencairan dana sedang diproses', body: 'Pencairan PCR-2041 sedang diproses ke rekening BCA.', time: '2 jam lalu', path: '/vendor/pencairan/PCR-2041', read: false },
  { id: 4, title: 'Pesanan telah selesai', body: 'Pesanan Alya Maharani selesai dan alat sudah dikembalikan.', time: 'Kemarin', path: '/vendor/pesanan/VND-8224', read: true },
];
