# Panduan Kontribusi Vendoria

Terima kasih sudah tertarik membantu mengembangkan Vendoria!

## Sebelum mulai

- Pastikan kamu sudah menerima undangan dan memiliki akses ke repository private ini.
- Untuk perubahan besar, diskusikan dulu lewat issue atau dengan pemilik proyek.
- Jangan sertakan password, token, data pribadi, atau kredensial dalam kode, issue, maupun pull request.
- Proyek ini belum memiliki lisensi; kontribusi ditujukan untuk pengembangan repository ini dan tidak memberi izin penggunaan ulang di luar repository.

## Menyiapkan proyek

```bash
git clone <URL-repository>
cd vendoria-app
npm ci
npm run dev
```

## Alur kerja

1. Perbarui branch `main`: `git pull origin main`.
2. Buat branch untuk satu pekerjaan, misalnya `feat/filter-katalog` atau `fix/tampilan-login`.
3. Buat perubahan sekecil dan sefokus mungkin.
4. Jalankan pemeriksaan:

   ```bash
   npm run lint
   npm run build
   ```

5. Commit perubahan dengan pesan yang jelas, lalu push branch-mu.
6. Buka pull request ke `main`, jelaskan masalah yang diselesaikan, ringkas perubahan, dan sertakan screenshot jika tampilan berubah.
7. Tanggapi masukan reviewer. Jangan menggabungkan pull request sendiri kecuali sudah disepakati dengan pemilik proyek.

## Panduan perubahan

- Ikuti pola komponen dan gaya yang sudah digunakan di proyek.
- Jangan menambahkan dependency baru tanpa alasan yang jelas.
- Untuk perubahan UI, periksa tampilan desktop dan mobile.
- Jangan mengklaim fitur backend atau autentikasi sungguhan jika implementasinya masih berupa data/mock di frontend.
