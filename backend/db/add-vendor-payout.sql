-- Rekening pencairan vendor (/vendor/profil-bisnis) dan permintaan pencairan dana (/vendor/pencairan).
-- Hanya menambah tabel/kolom/indeks baru; data lama tidak diubah. Aman dijalankan berulang kali.
BEGIN;
-- Satu rekening per vendor; nomor lengkap hanya dipakai untuk transfer, tidak dikirim balik ke browser.
CREATE TABLE IF NOT EXISTS public.rekening_vendor (
  vendor_id      bigint PRIMARY KEY REFERENCES public.vendor(vendor_id) ON DELETE CASCADE,
  bank           varchar(20)  NOT NULL CHECK (bank IN ('BCA', 'Mandiri', 'BRI', 'BNI')),
  nomor_rekening varchar(20)  NOT NULL CHECK (nomor_rekening ~ '^[0-9]{8,20}$'),
  nama_pemilik   varchar(120) NOT NULL CHECK (length(trim(nama_pemilik)) > 0),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

-- Salinan rekening tujuan saat pencairan diajukan (null untuk pencairan lama), agar mengganti rekening tidak mengubah riwayat.
ALTER TABLE public.pencairan_dana
  ADD COLUMN IF NOT EXISTS bank           varchar(20),
  ADD COLUMN IF NOT EXISTS nomor_rekening varchar(20),
  ADD COLUMN IF NOT EXISTS nama_pemilik   varchar(120);

-- Satu pesanan hanya boleh punya satu pencairan yang masih berlaku (gagal/dibatalkan boleh diajukan ulang).
-- Gagal bila data lama sudah punya duplikat: periksa dulu, lalu ulangi skrip ini.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pencairan_order_aktif
  ON public.pencairan_dana(order_id) WHERE status IN ('menunggu', 'diproses', 'berhasil');
COMMIT;
