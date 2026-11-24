-- Keranjang customer + detail acara pada pesanan. Hanya menambah (tabel baru + kolom nullable); data lama tidak diubah.
BEGIN;
CREATE TABLE IF NOT EXISTS public.keranjang (
  user_id         bigint NOT NULL REFERENCES public.pengguna(user_id) ON DELETE CASCADE,
  item_id         bigint NOT NULL REFERENCES public.item(item_id) ON DELETE CASCADE,
  jumlah          integer NOT NULL CHECK (jumlah BETWEEN 1 AND 99),
  ditambahkan_pada timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_keranjang_item ON public.keranjang(item_id);

-- lokasi_acara (sudah ada) menyimpan alamat lengkap venue.
ALTER TABLE public.pemesanan
  ADD COLUMN IF NOT EXISTS nama_acara     varchar(150),
  ADD COLUMN IF NOT EXISTS kategori_acara varchar(50),
  ADD COLUMN IF NOT EXISTS nama_venue     varchar(150),
  ADD COLUMN IF NOT EXISTS nama_pic       varchar(120),
  ADD COLUMN IF NOT EXISTS whatsapp_pic   varchar(30),
  ADD COLUMN IF NOT EXISTS catatan_akses  varchar(300);
COMMIT;
