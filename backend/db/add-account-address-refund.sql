-- Alamat acara dan rekening refund milik customer (menu /akun). Hanya menambah tabel baru; data lama tidak disentuh.
BEGIN;
CREATE TABLE IF NOT EXISTS public.alamat_acara (
  alamat_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES public.pengguna(user_id) ON DELETE CASCADE,
  nama_venue       varchar(150) NOT NULL,
  alamat_lengkap   varchar(500) NOT NULL,
  catatan_loading  varchar(500),
  utama            boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alamat_acara_user ON public.alamat_acara(user_id);
-- paling banyak satu alamat utama per customer
CREATE UNIQUE INDEX IF NOT EXISTS uq_alamat_acara_utama ON public.alamat_acara(user_id) WHERE utama;

CREATE TABLE IF NOT EXISTS public.rekening_refund (
  rekening_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        bigint NOT NULL REFERENCES public.pengguna(user_id) ON DELETE CASCADE,
  bank           varchar(20) NOT NULL CHECK (bank IN ('BCA', 'Mandiri', 'BRI', 'BNI')),
  nomor_rekening varchar(20) NOT NULL CHECK (nomor_rekening ~ '^[0-9]{8,20}$'),
  nama_pemilik   varchar(120) NOT NULL,
  utama          boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bank, nomor_rekening)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rekening_refund_utama ON public.rekening_refund(user_id) WHERE utama;
COMMIT;
