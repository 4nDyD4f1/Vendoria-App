-- Foto profil (URL https dari akun Google) di tabel pengguna. NULL bila tak ada. Aman dijalankan berulang kali.
-- Jalankan sekali di database yang dipakai backend, SEBELUM menjalankan backend versi yang memakai foto profil:
--   psql -h localhost -U postgres -d db_vendoria -f backend/db/add-foto-profil.sql
ALTER TABLE pengguna ADD COLUMN IF NOT EXISTS foto_profil varchar(500);
