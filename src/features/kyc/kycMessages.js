export function kycMessage(status, role = 'customer') {
  const to = role === 'vendor' ? '/vendor/kyc' : '/kyc';
  if (status === 'menunggu') return { to, title: 'KYC sedang ditinjau', action: 'Lihat status KYC', message: 'Dokumen sudah diterima. Tunggu sampai KYC terverifikasi untuk melanjutkan aktivitas transaksi.' };
  if (status === 'ditolak') return { to, title: 'Pengajuan KYC perlu diperbaiki', action: 'Perbaiki KYC', message: 'Periksa catatan pemeriksa dan kirim ulang dokumen hingga identitas Anda terverifikasi.' };
  return { to, title: 'Lengkapi verifikasi KYC', action: 'Lengkapi KYC', message: role === 'vendor' ? 'Verifikasi identitas Anda agar bisnis dapat diaktifkan setelah profil bisnis lengkap.' : 'KYC harus terverifikasi sebelum Anda membuat pesanan dan membayar deposit.' };
}
