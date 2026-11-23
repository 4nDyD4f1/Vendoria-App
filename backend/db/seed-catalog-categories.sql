-- Data referensi katalog; tidak mengubah struktur tabel atau menimpa kategori yang ada.
INSERT INTO kategori(nama_kategori) VALUES
  ('Tenda & kanopi'), ('Sound system'), ('Lighting & FX'),
  ('Dekorasi'), ('Kursi & meja'), ('Panggung & genset')
ON CONFLICT (nama_kategori) DO NOTHING;
