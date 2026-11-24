# Catatan Perbaikan (CHANGELOG_FIXES)

Terbaru di atas. Cari riwayat dengan `grep -n -i "<gejala>" CHANGELOG_FIXES.md`.

### Fix #2 — Create/update berfoto selalu "Terjadi kesalahan. Coba lagi." setelah migrasi ke Cloudinary: kredensial `.env` bawa spasi/CR

| | |
|---|---|
| **Tanggal** | 2026-11-24 |
| **File** | `backend/src/main/java/com/vendoria/backend/auth/CloudinaryBlobStore.java` |
| **Masalah** | Setelah penyimpanan gambar (katalog, bukti serah-terima, KYC) dipindah ke Cloudinary, semua create/update yang mengunggah gambar gagal dengan pesan generik di frontend. |
| **Akar** | Kesalahan sendiri pada migrasi Cloudinary. `.env` berformat CRLF; Spring membaca `CLOUDINARY_CLOUD_NAME` dengan panjang 10 (aslinya 8: ada spasi/CR di tepi). SDK melempar `RuntimeException` (bukan `IOException`), tak tertangkap store, jadi jadi 500 tanpa `message` dan frontend jatuh ke teks cadangan di `src/api.js`. Smoke test pertama lolos karena saya me-trim nilai `.env` sendiri, bukan lewat konfigurasi Spring. |
| **Fix** | Kredensial di-`trim()`; semua `RuntimeException` dari SDK dibungkus jadi `IOException` (+ log `Cloudinary <aksi> gagal`) sehingga store membalas 503 "Penyimpanan ... tidak tersedia". |
| **Verifikasi** | Test sementara dengan konteks Spring asli + `.env` asli: `cloud-name len=10 trimmedLen=8`, put/get/delete ke Cloudinary berhasil. Test terkait gambar: 34 lulus (3 unit store + KycDatabase 6, VendorCatalogDatabase 8, VendorHandoversDatabase 10, dst.), 0 gagal. Belum dicoba lewat UI. |
| **Pelajaran** | Verifikasi integrasi eksternal lewat jalur konfigurasi yang sama dengan aplikasi, bukan parsing manual. Nilai dari `.env` bisa membawa CR/spasi; trim di titik konsumsi. Bungkus exception SDK agar jadi error yang bermakna, bukan 500 kosong. |
| **Log Keyword** | `Terjadi kesalahan. Coba lagi.`, `cloud_name`, `Cloudinary upload gagal`, `.env CRLF` |
| **Deploy** | Belum (lokal) |

### Fix #1 — Halaman admin blank setelah commit katalog: `content is not defined` + `options.map` undefined

| | |
|---|---|
| **Tanggal** | 2026-11-24 |
| **File** | `src/features/admin/AdminWorkspace.jsx`, `src/features/vendor/VendorResource.jsx` |
| **Masalah** | Setelah commit `a13efaa` (katalog admin), seluruh `/admin/*` blank, lalu `/admin/katalog` blank saat daftar dibuka. |
| **Akar** | Kesalahan sendiri pada `a13efaa`. (1) Saat membuang alur dialog Tangguhkan, edit rentang kode ikut menghapus blok `let content; if (onKycPage) ...` sehingga render melempar `ReferenceError: content is not defined`. (2) Filter kategori daftar sumber daya membaca `field.options.map`, padahal field kategori katalog admin diubah menjadi teks tanpa `options` -> `TypeError`. |
| **Fix** | Blok `content` dipulihkan (+ cabang katalog). Filter kategori memakai opsi dari data bila field tidak punya `options` (vendor tetap memakai `options` field). |
| **Verifikasi** | Playwright dengan API di-mock. Sebelum: `PAGEERROR content is not defined` (root 0 byte) dan 2x `Cannot read properties of undefined (reading 'map')` di `/admin/katalog`. Sesudah: 0 pageerror; `/admin` 15.298 byte, `/admin/katalog` 11.246 byte; `/vendor`, `/vendor/katalog`, `/vendor/katalog/tambah` render. |
| **Pelajaran** | `npm run build` tetap lulus walau ada ReferenceError runtime (tidak ada lint). Setelah menghapus blok kode besar, buka halamannya; jangan hanya build. Hindari edit berbasis rentang/regex sampai penanda berikutnya. |
| **Log Keyword** | `content is not defined`, `Cannot read properties of undefined (reading 'map')`, blank admin, katalog |
| **Deploy** | Belum (lokal, belum di-push) |
