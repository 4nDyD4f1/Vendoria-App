// Jenis klaim: 'kerusakan' dari vendor, selebihnya laporan customer atas pesanan.
export const reportTypes = {
  kerusakan: 'Kerusakan (laporan vendor)',
  tidak_sampai: 'Barang tidak sampai',
  tidak_sesuai: 'Barang tidak sesuai',
  kurang: 'Barang kurang',
  tidak_berfungsi: 'Barang rusak / tidak berfungsi',
  lainnya: 'Lainnya',
};
export const isCustomerReport = claim => Boolean(claim.type) && claim.type !== 'kerusakan';
export const needsUnits = type => type === 'kurang' || type === 'tidak_berfungsi';
