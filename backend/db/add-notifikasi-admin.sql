-- Status baca/hapus notifikasi admin (/admin/notifikasi). Hanya menambah tabel baru; data lama tidak disentuh.
-- Notifikasi sendiri tidak disimpan: dihitung dari antrean KYC, klaim, dan pencairan yang masih menunggu.
-- kunci = 'kyc:<id>' | 'klaim:<id>' | 'pencairan:<id>'.
BEGIN;
CREATE TABLE IF NOT EXISTS public.notifikasi_admin (
  user_id      bigint NOT NULL REFERENCES public.pengguna(user_id) ON DELETE CASCADE,
  kunci        varchar(40) NOT NULL,
  dibaca_pada  timestamptz,
  dihapus_pada timestamptz,
  PRIMARY KEY (user_id, kunci)
);
COMMIT;
