-- Status keamanan saja. Hash password dan seluruh data lama dipertahankan.
BEGIN;
ALTER TABLE public.pengguna ADD COLUMN IF NOT EXISTS two_factor_email boolean NOT NULL DEFAULT false;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'pengguna' AND column_name = 'password_dibuat') THEN
    ALTER TABLE public.pengguna ADD COLUMN password_dibuat boolean;
    -- Akun Google lama tidak bisa dibedakan: hash acak dan hash password sama-sama BCrypt.
    -- NULL berarti belum diketahui; verifikasi email diperlukan sebelum membuat password.
    UPDATE public.pengguna SET password_dibuat = true WHERE google_sub IS NULL;
    ALTER TABLE public.pengguna ALTER COLUMN password_dibuat SET DEFAULT true;
  END IF;
END $$;
COMMIT;
