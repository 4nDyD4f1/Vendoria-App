# Catatan Perbaikan (CHANGELOG_FIXES)

Terbaru di atas. Cari riwayat dengan `grep -n -i "<gejala>" CHANGELOG_FIXES.md`.

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
