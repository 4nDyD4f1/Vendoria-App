-- Wishlist customer tersimpan per akun. Tidak mengubah tabel/data katalog yang sudah ada.
-- Nama publik saat disimpan dipertahankan agar alat yang kemudian ditarik tetap dikenali pemilik wishlist.
BEGIN;
CREATE TABLE IF NOT EXISTS public.wishlist (
  user_id             bigint NOT NULL REFERENCES public.pengguna(user_id) ON DELETE CASCADE,
  item_id             bigint NOT NULL REFERENCES public.item(item_id) ON DELETE CASCADE,
  nama_saat_disimpan  varchar(255) NOT NULL CHECK (length(btrim(nama_saat_disimpan)) > 0),
  disimpan_pada       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_item ON public.wishlist(item_id);
COMMIT;
