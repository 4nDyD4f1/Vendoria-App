-- Biaya platform dan potongan klaim pada pencairan dana vendor. Hanya menambah kolom; data lama tidak diubah. Aman diulang.
-- Arti kolom setelah skrip ini:
--   jumlah          = dana bersih yang ditransfer ke vendor (kotor - biaya_platform - potongan_klaim), seperti sebelumnya.
--   jumlah_kotor    = total biaya sewa pesanan (null pada pencairan lama = anggap sama dengan jumlah).
--   biaya_platform  = potongan platform dalam rupiah; persen_biaya = persen yang berlaku saat diajukan (riwayat tak berubah jika persen diganti).
--   potongan_klaim  = ganti rugi klaim yang disetujui (pengembalian_dana) atas pesanan itu.
BEGIN;
ALTER TABLE public.pencairan_dana
  ADD COLUMN IF NOT EXISTS jumlah_kotor   numeric(14,2),
  ADD COLUMN IF NOT EXISTS biaya_platform numeric(14,2) NOT NULL DEFAULT 0 CHECK (biaya_platform >= 0),
  ADD COLUMN IF NOT EXISTS persen_biaya   numeric(5,2)  NOT NULL DEFAULT 0 CHECK (persen_biaya >= 0 AND persen_biaya <= 100),
  ADD COLUMN IF NOT EXISTS potongan_klaim numeric(14,2) NOT NULL DEFAULT 0 CHECK (potongan_klaim >= 0);
COMMIT;
