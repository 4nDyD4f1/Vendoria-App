-- Login Google: menyimpan "sub" (ID unik akun Google) di tabel pengguna.
-- NULL untuk akun yang daftar dengan email + password. Aman dijalankan berulang kali.
-- Jalankan sekali di database yang dipakai backend, SEBELUM menjalankan backend versi yang memakai login Google:
--   psql -h localhost -U postgres -d db_vendoria -f backend/db/add-google-sub.sql
ALTER TABLE pengguna ADD COLUMN IF NOT EXISTS google_sub varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pengguna_google_sub ON pengguna (google_sub);
