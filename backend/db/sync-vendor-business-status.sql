-- Apply alongside the automatic vendor activation backend release.
-- Data-only, idempotent migration; no new tables or columns.
-- Forward-only policy change: historical manual activation flags are not retained.
-- Rollback requires reverting the activation policy release and explicitly restoring any manual flags.
BEGIN;
SET LOCAL lock_timeout = '5s';
UPDATE vendor v
SET status_aktif = (u.role='vendor' AND u.status_akun='Aktif' AND u.status_verifikasi='terverifikasi'
  AND coalesce(v.nama_vendor,'') ~ '[^[:space:]]' AND coalesce(v.kota,'') ~ '[^[:space:]]'
  AND coalesce(v.alamat,'') ~ '[^[:space:]]' AND coalesce(v.deskripsi,'') ~ '[^[:space:]]')
FROM pengguna u WHERE u.user_id=v.user_id
AND v.status_aktif IS DISTINCT FROM
  (u.role='vendor' AND u.status_akun='Aktif' AND u.status_verifikasi='terverifikasi'
  AND coalesce(v.nama_vendor,'') ~ '[^[:space:]]' AND coalesce(v.kota,'') ~ '[^[:space:]]'
  AND coalesce(v.alamat,'') ~ '[^[:space:]]' AND coalesce(v.deskripsi,'') ~ '[^[:space:]]');
COMMIT;
