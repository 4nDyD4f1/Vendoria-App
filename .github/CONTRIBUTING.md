# Panduan Kontribusi Vendoria

Terima kasih sudah tertarik membantu mengembangkan Vendoria!

## Sebelum mulai

- Repository ini public. Kamu bisa berkontribusi lewat fork dan pull request; akses tulis langsung hanya diperlukan jika ingin push branch ke repository utama.
- Untuk perubahan besar, diskusikan dulu lewat issue atau dengan pemilik proyek.
- Jangan sertakan password, token, data pribadi, atau kredensial dalam kode, issue, maupun pull request.
- Proyek ini belum memiliki lisensi; kontribusi ditujukan untuk pengembangan repository ini dan tidak memberi izin penggunaan ulang di luar repository.

## Menyiapkan proyek

```bash
git clone https://github.com/<username-kamu>/Vendoria-App.git
cd Vendoria-App
npm ci
npm run dev
```

Jika kamu melakukan fork, tambahkan repository utama sebagai `upstream`:

```bash
git remote add upstream https://github.com/4nDyD4f1/Vendoria-App.git
```

## Alur kerja

1. Jika menggunakan fork, sinkronkan fork dengan `git fetch upstream` lalu `git merge upstream/main`. Jika memiliki akses tulis, perbarui dengan `git pull origin main`.
2. Buat branch untuk satu pekerjaan, misalnya `feat/filter-katalog` atau `fix/tampilan-login`.
3. Buat perubahan sekecil dan sefokus mungkin.
4. Jalankan pemeriksaan:

   ```bash
   npm run lint
   npm run build
   ```

5. Commit perubahan dengan pesan yang jelas, lalu push branch-mu ke fork atau repository utama jika memiliki akses tulis.
6. Buka pull request ke branch `main` di repository ini, jelaskan masalah yang diselesaikan, ringkas perubahan, dan sertakan screenshot jika tampilan berubah.
7. Tanggapi masukan reviewer. Jangan menggabungkan pull request sendiri kecuali sudah disepakati dengan pemilik proyek.

## Panduan perubahan

- Ikuti pola komponen dan gaya yang sudah digunakan di proyek.
- Jangan menambahkan dependency baru tanpa alasan yang jelas.
- Untuk perubahan UI, periksa tampilan desktop dan mobile.
- Jangan mengklaim fitur backend atau autentikasi sungguhan jika implementasinya masih berupa data/mock di frontend.
