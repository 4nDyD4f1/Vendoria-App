-- Kelola administrator (/admin/pengguna/admin): status akun dan catatan di tabel pengguna.
-- Semua administrator setara (akses penuh); tidak ada peran/jabatan admin yang berbeda.
-- Aman dijalankan berulang kali. Jalankan sekali di database yang dipakai backend, SEBELUM menjalankan backend versi ini:
--   psql -h localhost -U postgres -d db_vendoria -f backend/db/add-administrator.sql
ALTER TABLE pengguna ADD COLUMN IF NOT EXISTS status_akun varchar(10) NOT NULL DEFAULT 'Aktif'
  CHECK (status_akun IN ('Aktif', 'Nonaktif')); -- 'Nonaktif' = tidak bisa login
ALTER TABLE pengguna ADD COLUMN IF NOT EXISTS catatan_admin text;

-- Administrator PERTAMA tidak bisa dibuat lewat aplikasi (hanya admin yang boleh menambah admin).
-- Jadikan satu akun yang sudah terdaftar sebagai admin (ganti emailnya, jalankan sendiri, SEKALI):
--   UPDATE pengguna SET role = 'admin', updated_at = now() WHERE lower(email) = lower('email-anda@contoh.com');
