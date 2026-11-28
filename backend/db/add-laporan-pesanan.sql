-- Laporan pesanan oleh customer memakai tabel klaim.
-- Hanya menambah kolom (data lama tetap), aman dijalankan ulang.
alter table klaim
  add column if not exists jenis varchar(20) not null default 'kerusakan'
    check (jenis in ('kerusakan','tidak_sampai','tidak_sesuai','kurang','tidak_berfungsi','lainnya')),
  add column if not exists item_id bigint,
  add column if not exists jumlah_unit integer check (jumlah_unit > 0),
  add column if not exists foto_pelapor text,
  add column if not exists tanggapan_vendor text,
  add column if not exists foto_vendor text,
  add column if not exists barang_kembali_pada timestamptz;
