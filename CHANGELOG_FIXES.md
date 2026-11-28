# Catatan Perbaikan (CHANGELOG_FIXES)

Terbaru di atas. Cari riwayat dengan `grep -n -i "<gejala>" CHANGELOG_FIXES.md`.

### Fix #28 — Katalog: ruang kosong besar, footer menimpa isi, pagination tidak ke atas

| | |
|---|---|
| **Tanggal** | 2026-11-29 |
| **File** | `LiveCatalog.jsx`, `live-catalog.css` |
| **Masalah** | Halaman berisi sedikit alat menyisakan 1.096 px kosong; di lebar 1.000 px footer menimpa isi (-290 px) sehingga "Halaman berikutnya" tak bisa diklik; klik pagination tidak menggeser scroll. |
| **Akar** | Wadah hasil dari Figma dikunci 1.583 px (3 baris kartu). Gulir-ke-atas hanya dipicu `pathname`, sedangkan pagination hanya mengubah query. |
| **Fix** | Tinggi wadah `auto`; tombol pagination memanggil `scrollTo(0,0)`. |
| **Verifikasi** | Browser (16 alat tiruan; 1440/1000/390 px). Sebelum: ruang berlebih di desktop, footer menimpa di 1000 px, 6/6 klik pagination tak menggeser scroll. Sesudah: 21/21 lulus (ruang sebelum footer tetap 80/80/40 px di 1, 4, 12 alat dan 0 hasil). |
| **Pelajaran** | Tinggi tetap dari Figma harus dilepas bila isinya data nyata; uji dengan jumlah data lebih sedikit dan lebih banyak dari desain. |
| **Log Keyword** | pagination, `grid-rows-[_1583px]`, ruang kosong katalog |
| **Deploy** | Belum (di server) |

### Fix #27 — Kategori dan notifikasi tampil "Belum ada" selagi masih memuat

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `AdminWorkspace.jsx`, `VendorWorkspace.jsx` |
| **Masalah** | `/admin/kategori` dan halaman notifikasi admin/vendor menampilkan keadaan kosong sebelum data datang. |
| **Akar** | Daftar dimulai dari `[]` tanpa penanda sudah dimuat. |
| **Fix** | Penanda "sudah dimuat"; sebelum itu tampil skeleton. |
| **Verifikasi** | Browser: skeleton selama request digantung, hilang saat server menjawab error; 35 halaman dengan backend uji selesai memuat. |
| **Pelajaran** | Keadaan kosong dan keadaan memuat harus dibedakan. |
| **Log Keyword** | skeleton, "Belum ada kategori" |
| **Deploy** | Belum (lokal) |

### Fix #26 — Halaman masuk/daftar terbuka di bagian paling bawah

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `src/components/AuthLayout.jsx` |
| **Masalah** | Tamu menekan keranjang/wishlist: `/login` terbuka tergulir sampai bawah (`scrollY` = batas maksimum: 491 px desktop, 1.526 px ponsel). Keluar dari halaman auth lewat footer juga membawa posisi lama. |
| **Akar** | Enam halaman auth di luar `InterfacePage`, tempat satu-satunya gulir-ke-atas (Fix #22). Fix #22 tidak mencakupnya. |
| **Fix** | `useLayoutEffect` di `AuthLayout`: gulir ke atas saat masuk dan saat meninggalkan. |
| **Verifikasi** | Browser (API tiruan, desktop + ponsel): 11 dari 12 skenario gagal sebelum, 12/12 lulus sesudah; build dan lint lulus. |
| **Pelajaran** | Fix gulir harus dicek juga pada route di luar `InterfacePage` (auth, `/vendor`). |
| **Log Keyword** | `scrollTo`, `scrollY`, login scroll bawah |
| **Deploy** | Belum (lokal) |

### Fix #25 — Deposit dipotong diam-diam sebesar seluruh biaya sewa

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `CustomerCartService.java`, `deposit.js`, `LiveCart.jsx`, `LiveProduct.jsx` |
| **Masalah** | Deposit di atas biaya sewa dipotong menjadi 100% sewa tanpa pemberitahuan. |
| **Akar** | Pemotongan lama untuk memenuhi CHECK `total_dp <= total_biaya_sewa`. |
| **Fix** | Keputusan user: maksimal 60% biaya sewa per pesanan (pembulatan ke atas), ditampilkan di produk, keranjang, formulir vendor, dan kebijakan. |
| **Verifikasi** | `theDepositIsCappedAtSixtyPercentOfTheRent` gagal sebelum, lulus sesudah; browser: Rp60.000 dan Rp160.000. |
| **Pelajaran** | Aturan 60% ada di dua tempat (Java dan deposit.js): ubah keduanya. |
| **Log Keyword** | `DEPOSIT_CAP`, audit-ulang #3 |
| **Deploy** | Belum (lokal) |

### Fix #24 — Alat berharga sewa Rp0 membuat pesanan macet

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `VendorCatalogDtos.java`, `CustomerCartService.java`, `VendorCatalogPage.jsx` |
| **Masalah** | Harga 0 menghasilkan deposit 0 yang ditolak pembayaran. |
| **Akar** | Harga boleh 0; Fix #9 hanya menutup deposit 0. |
| **Fix** | Harga >= 1 di server dan formulir; checkout menolak harga 0. |
| **Verifikasi** | `rentalPricesMustBeAboveZero` gagal sebelum, lulus sesudah. |
| **Pelajaran** | Tutup semua masukan yang bisa menghasilkan tagihan 0, bukan satu saja. |
| **Log Keyword** | `Harga sewa harus lebih dari 0`, audit-ulang #2 |
| **Deploy** | Belum (lokal) |

### Fix #23 — Deposit tertahan bila vendor tidak pernah mengonfirmasi

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `UnpaidOrderExpiry.java`, notifikasi customer & vendor |
| **Masalah** | `menunggu_konfirmasi` tidak punya batas waktu; customer tak bisa membatalkan. |
| **Akar** | Hanya vendor yang bisa memajukan tahap. |
| **Fix** | Batal otomatis 24 jam sejak deposit lunas (`app.order.confirm-expiry-hours`), refund deposit dicatat; kedua pihak diberi tahu tenggat. |
| **Verifikasi** | `ordersTheVendorNeverConfirmsAreCancelledAndTheDepositReturns` gagal sebelum, lulus sesudah. Seluruh suite 251: 0 gagal, 8 error tabel wishlist di db uji. |
| **Pelajaran** | Tahap `dikembalikan`/`berjalan` yang didiamkan vendor masih belum punya jalan keluar. |
| **Log Keyword** | `vendor tidak mengonfirmasi`, audit-ulang #1 |
| **Deploy** | Belum (lokal) |

### Fix #22 — Halaman pembayaran dan lapor terbuka tergulir ke footer

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `src/features/interface/InterfacePage.jsx` |
| **Masalah** | Sesudah "Buat Pesanan" dan "Laporkan Pesanan" judul halaman 450-1.300 px di atas layar (ponsel dan desktop). Tab "Deskripsi" produk sebaliknya melompat ke atas. |
| **Akar** | Gulir-ke-atas dipicu `screen.key` dan mengecualikan semua `payment-*` dkk. tanpa melihat asalnya; `/lapor` memakai key yang sama dengan detail (kesalahan sendiri saat menambah halaman itu). |
| **Fix** | Dipicu `pathname`; posisi dipertahankan hanya antar tab dalam area yang sama. |
| **Verifikasi** | Browser (API tiruan, 390px): 3 dari 5 kasus gagal sebelum, 5/5 lulus sesudah; build lulus. |
| **Pelajaran** | Halaman baru yang menumpang key layar lain harus dicek posisi gulirnya. |
| **Log Keyword** | `scrollTo`, `scrollY`, e2e-pemesanan |
| **Deploy** | Belum (lokal) |

### Fix #21 — Customer yang sudah login masih melihat form login

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `RoleRouteBoundary.jsx` |
| **Masalah** | `/login` tetap menampilkan form untuk customer yang sudah login. |
| **Akar** | Pengalihan hanya ada untuk admin dan vendor. |
| **Fix** | Pengguna login dialihkan dari `/login` dan `/register`. |
| **Verifikasi** | Browser dengan backend asli (db uji): ketiga peran dialihkan; tamu tetap bisa login. |
| **Pelajaran** | - |
| **Log Keyword** | e2e-pemesanan #5 |
| **Deploy** | Belum (lokal) |

### Fix #20 — Vendor membatalkan pesanan dengan satu klik

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `OrderProcessModal.jsx` |
| **Masalah** | Batal langsung dieksekusi, tak bisa diurungkan. |
| **Akar** | Tidak ada langkah konfirmasi. |
| **Fix** | Klik kedua "Ya, batalkan pesanan"; tombol Proses disembunyikan saat konfirmasi. |
| **Verifikasi** | Browser 360px dan desktop: klik pertama tidak membatalkan, tombol di dalam dialog. |
| **Pelajaran** | Versi pertama fix ini memotong tombol di ponsel (tiga tombol sebaris); periksa tampilan ponsel, bukan hanya fungsi. |
| **Log Keyword** | e2e-pemesanan #2 |
| **Deploy** | Belum (lokal) |

### Fix #19 — Admin memutuskan klaim tanpa melihat foto serah terima

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `ClaimHandover.jsx`, `AdminClaimsPage.jsx`, `AdminClaimService.java`, `AdminClaimDtos.java` |
| **Masalah** | Dialog klaim tidak menampilkan bukti kondisi apa pun. |
| **Akar** | Kesalahan sendiri pada fitur klaim/laporan: data sudah bisa diakses admin tetapi tidak ditampilkan. |
| **Fix** | Klaim membawa `orderId`; dialog memuat foto serah terima dan pengembalian. |
| **Verifikasi** | Tes `AdminClaimDatabaseTest` gagal sebelum, lulus sesudah; browser: 8 foto termuat. |
| **Pelajaran** | Halaman keputusan harus menampilkan buktinya. |
| **Log Keyword** | e2e-pemesanan #1 |
| **Deploy** | Belum (lokal) |

### Fix #18 — Berkas JavaScript awal 659 KB

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `treeWalk.js`, `InterfaceHeader.jsx`, `wishlistData.js` |
| **Masalah** | Halaman login mengunduh tabel gaya Figma 373 KB. |
| **Akar** | Header mengimpor satu helper dari modul yang juga mengimpor gaya. Saran audit ("lazy-load admin/vendor") keliru: itu sudah dilakukan. |
| **Fix** | Helper dipindah ke modul tanpa gaya. |
| **Verifikasi** | `index-*.js` 659 KB menjadi 285 KB; cek browser halaman publik tanpa error. Chunk InterfacePage 527 KB masih memicu peringatan. |
| **Pelajaran** | Analisis isi bundle sebelum menyarankan perbaikan. |
| **Log Keyword** | bundle size, audit-2026-11-28 #18 |
| **Deploy** | Belum (lokal) |

### Fix #17 — Halaman lama tak terpakai dihapus

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | 11 berkas di `src/pages`, `src/components`, `src/features/admin` |
| **Masalah** | 3.924 baris tidak diimpor dari mana pun. |
| **Akar** | Digantikan halaman baru tetapi tidak dibuang. |
| **Fix** | Dihapus (semuanya tercatat git, bisa dipulihkan). |
| **Verifikasi** | Build dan cek browser lulus. |
| **Pelajaran** | - |
| **Log Keyword** | dead code, audit-2026-11-28 #17 |
| **Deploy** | Belum (lokal) |

### Fix #16 — Lupa password membocorkan email terdaftar

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `PasswordResetService.java`, halaman OTP |
| **Masalah** | Balasan 404 untuk email tak terdaftar. |
| **Akar** | Pesan galat spesifik. |
| **Fix** | Jawaban, jeda, dan kuota sama untuk semua email. |
| **Verifikasi** | `PasswordResetServiceTest` gagal sebelum, lulus sesudah. |
| **Pelajaran** | Pendaftaran masih menjawab "Email sudah terdaftar"; waktu respons juga masih bisa membedakan. |
| **Log Keyword** | enumeration, audit-2026-11-28 #16 |
| **Deploy** | Belum (lokal) |

### Fix #15 — Teks kebijakan produk tidak sesuai aturan

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `LiveProduct.jsx` |
| **Masalah** | "Klaim 3 hari", "2 foto", penyewa memotret pengembalian. |
| **Akar** | Teks desain Figma tak diperbarui saat aturan berubah. |
| **Fix** | Tab Kebijakan dan SOP ditulis ulang. |
| **Verifikasi** | Cek browser. |
| **Pelajaran** | Aturan berubah: perbarui juga teksnya. |
| **Log Keyword** | kebijakan, audit-2026-11-28 #14 |
| **Deploy** | Belum (lokal) |

### Fix #14 — Laporan "tidak sesuai" bisa terlupakan

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `AdminNotificationService.java` |
| **Masalah** | Setelah disetujui, tak ada pengingat sampai barang dikonfirmasi kembali. |
| **Akar** | Kesalahan sendiri pada fitur laporan. |
| **Fix** | Notifikasi `retur:<id>` sampai barang kembali. |
| **Verifikasi** | `adminSeesAllMoneyHeldAndReturnsStillOutstanding`. |
| **Pelajaran** | Status yang menunggu tindakan orang butuh pengingat. |
| **Log Keyword** | `retur:`, audit-2026-11-28 #12 |
| **Deploy** | Belum (lokal) |

### Fix #13 — Escrow admin hanya menghitung deposit

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `AdminDashboardService.java`, `AdminDashboard.jsx` |
| **Masalah** | Pelunasan yang ditahan tidak terhitung. |
| **Akar** | Kesalahan sendiri saat menambah pelunasan. |
| **Fix** | Semua pembayaran terverifikasi pesanan aktif dikurangi refund berhasil. |
| **Verifikasi** | Tes yang sama: sebelumnya 100.000, seharusnya 1.050.000. |
| **Pelajaran** | Jenis pembayaran baru: periksa semua agregat. |
| **Log Keyword** | escrow, audit-2026-11-28 #11 |
| **Deploy** | Belum (lokal) |

### Fix #12 — Stok dihitung dari semua pesanan yang beririsan

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `CustomerCartService.java` |
| **Masalah** | Pesanan yang tidak saling bentrok dijumlahkan. |
| **Akar** | SUM atas seluruh rentang. |
| **Fix** | Pemakaian puncak per hari (`generate_series`). |
| **Verifikasi** | `stockCountsPeakUsageNotEveryOverlappingBooking`. |
| **Pelajaran** | Ketersediaan adalah puncak, bukan jumlah. |
| **Log Keyword** | `Stok ... tinggal`, audit-2026-11-28 #10 |
| **Deploy** | Belum (lokal) |

### Fix #11 — "Hari ini" memakai UTC di server

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `docker-compose.yml` |
| **Masalah** | 00.00-07.00 WIB dianggap hari kemarin. |
| **Akar** | Zona waktu container tak diatur. |
| **Fix** | `-Duser.timezone=Asia/Jakarta`. |
| **Verifikasi** | ✅ Diverifikasi di Docker 2026-11-28: tanpa opsi, Java & sesi DB memakai UTC (tanggal 28); dengan opsi, Asia/Jakarta (tanggal 29) untuk instant 18:00Z. Image backend start, log +07:00. |
| **Pelajaran** | Atur zona waktu secara eksplisit. |
| **Log Keyword** | timezone, audit-2026-11-28 #9 |
| **Deploy** | Belum (lokal) |

### Fix #11b — Pembayaran menggantung dan Midtrans tanpa batas waktu

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `PaymentReconciler.java`, `CustomerPaymentService.java`, `MidtransClient.java` |
| **Masalah** | Tanpa webhook status tetap menunggu; panggilan lambat menahan koneksi database tanpa batas. |
| **Akar** | Tak ada rekonsiliasi dan timeout. |
| **Fix** | Job 5 menit; yang tak pernah dibuka > 2 jam ditandai gagal; connect 5 dtk, baca 10 dtk. |
| **Verifikasi** | `pendingPaymentsAreReconciledWithoutWaitingForTheWebhook`, `MidtransClientTimeoutTest`. Belum diuji ke Midtrans asli. Panggilan HTTP masih di dalam transaksi. |
| **Pelajaran** | Setiap panggilan keluar butuh timeout. |
| **Log Keyword** | `gagal`, audit-2026-11-28 #7 #8 |
| **Deploy** | Belum (lokal) |

### Fix #10 — Struktur database tidak ada di repo

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `backend/db/schema.sql`, `docs/DEPLOY-VPS.md`, `HowToRunLocal.md` |
| **Masalah** | Tabel inti hanya ada di database lokal; server baru bergantung pada dump dari laptop. |
| **Akar** | Skema dikelola manual dan tidak pernah di-commit. |
| **Fix** | `pg_dump --schema-only` (22 tabel, 0 data) masuk repo; panduan memakainya. |
| **Verifikasi** | Database kosong baru + schema.sql + seed kategori: 244/244 tes lulus. |
| **Pelajaran** | Perbarui schema.sql setiap menambah `add-*.sql`. |
| **Log Keyword** | `relation does not exist`, audit-2026-11-28 #6 |
| **Deploy** | Belum (lokal) |

### Fix #9 — Alat berdeposit Rp0 membuat pesanan macet

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `VendorCatalogDtos.java`, `CustomerCartService.java`, `VendorCatalogPage.jsx` |
| **Masalah** | Pesanan dengan deposit 0 tidak bisa dibayar dan tidak bisa diproses. |
| **Akar** | Deposit opsional (default 0), sementara pembayaran menolak nominal 0. |
| **Fix** | Deposit wajib >= 1; checkout menolak alat tanpa deposit. |
| **Verifikasi** | `AuditFixesDatabaseTest.rentalsNeedADepositGreaterThanZero` gagal sebelum, lulus sesudah. |
| **Pelajaran** | Nilai default tidak boleh menghasilkan keadaan yang ditolak langkah berikutnya. |
| **Log Keyword** | `Pesanan tanpa deposit`, audit-2026-11-28 #5 |
| **Deploy** | Belum (lokal) |

### Fix #8 — Pesanan tak dibayar mengunci stok selamanya

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `UnpaidOrderExpiry.java` |
| **Masalah** | `menunggu_pembayaran` tak pernah kedaluwarsa dan ikut dihitung sebagai stok terpakai. |
| **Akar** | Tidak ada pembatalan otomatis maupun pembatalan oleh customer. |
| **Fix** | Job tiap 10 menit membatalkan pesanan > 24 jam (`app.order.unpaid-expiry-hours`), setelah bertanya ke Midtrans. |
| **Verifikasi** | `unpaidOrdersExpireButPaidOrRecentOnesSurvive` gagal sebelum, lulus sesudah. |
| **Pelajaran** | Setiap status yang menahan sumber daya butuh jalan keluar berbatas waktu. |
| **Log Keyword** | `Dibatalkan otomatis`, audit-2026-11-28 #4 |
| **Deploy** | Belum (lokal) |

### Fix #7 — Penautan Google mempertahankan password yang kepemilikan emailnya tak terbukti

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `GoogleUserService.java`, `PenggunaRepository.java` |
| **Masalah** | Orang yang mendaftar lebih dulu memakai email korban tetap bisa masuk sesudah korban memakai Google. |
| **Akar** | Registrasi tanpa verifikasi email + penautan otomatis berdasarkan email. |
| **Fix** | Saat ditautkan, password diganti acak dan `password_dibuat=false` (kecuali admin / 2FA email). |
| **Verifikasi** | `linkingGoogleRetiresThePasswordNobodyProvedTheyOwned` gagal sebelum, lulus sesudah. |
| **Pelajaran** | Akun yang sudah tertaut sebelum fix ini tidak ikut diperbaiki. Promosi admin via BOOTSTRAP_ADMIN masih mempertahankan password lama. |
| **Log Keyword** | account takeover, audit-2026-11-28 #3 |
| **Deploy** | Belum (lokal) |

### Fix #6 — Reset/ganti password tidak mengakhiri sesi lama

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `SessionPasswordGuard.java`, `AccountSecurityService.java` |
| **Masalah** | Sesi 30 hari tetap berlaku sesudah password diganti. |
| **Akar** | Sesi hanya menyimpan user_id. |
| **Fix** | Sesi menyimpan cap password; interceptor `/api/**` membatalkan sesi yang tak cocok. Sesi yang mengganti password sendiri tetap masuk. |
| **Verifikasi** | Dua tes sesi gagal sebelum, lulus sesudah. |
| **Pelajaran** | Admin yang mengubah password lewat halaman administrator akan diminta login ulang. |
| **Log Keyword** | `password_stamp`, audit-2026-11-28 #2 |
| **Deploy** | Belum (lokal) |

### Fix #5 — Vendor bisa mencairkan sewa yang tidak pernah dibayar

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `VendorPayoutService.java` |
| **Masalah** | Pesanan `selesai` tanpa pelunasan ikut dana tersedia (nyata: VND-261128-5539, 60 jt, diterima 1 jt). |
| **Akar** | Kesalahan sendiri: alur pelunasan tidak menambahkan syarat lunas pada pencairan. |
| **Fix** | Syarat pencairan memakai `OrderMoney.SETTLED`. |
| **Verifikasi** | `onlyFullyPaidOrdersCanBePaidOutToTheVendor` gagal sebelum, lulus sesudah. |
| **Pelajaran** | Aturan uang baru harus diperiksa di semua jalur keluar uang. |
| **Log Keyword** | payout, audit-2026-11-28 #1 |
| **Deploy** | Belum (lokal) |

### Fix #4 — Detail produk menampilkan "Sisa tagihan" = sewa − deposit, padahal sewa dilunasi penuh

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `src/features/interface/LiveProduct.jsx` |
| **Masalah** | Estimasi di `/product/:id` mengurangi tagihan dengan deposit (mis. sewa 200.000, deposit 50.000 tampil sisa 150.000). |
| **Akar** | Kesalahan sendiri: saat deposit diubah menjadi jaminan, hanya keranjang dan halaman pembayaran yang diperbarui; panel estimasi produk terlewat. |
| **Fix** | Baris menjadi "Dilunasi setelah konfirmasi vendor" = total sewa penuh. |
| **Verifikasi** | Browser (API tiruan): 2 hari x 100.000 menampilkan Rp200.000 dengan deposit Rp50.000 terpisah. |
| **Pelajaran** | Saat aturan uang berubah, grep semua tempat yang menghitung ulang (`total - deposit`), bukan hanya halaman yang diingat. |
| **Log Keyword** | `Sisa tagihan`, `total - deposit`, backend-pelunasan-deposit-jaminan |
| **Deploy** | Belum (lokal) |

### Fix #3 — Banyak "Terjadi kesalahan. Coba lagi." setelah fitur laporan pesanan: migrasi kolom `klaim` belum dijalankan (PENDING verifikasi)

| | |
|---|---|
| **Tanggal** | 2026-11-28 |
| **File** | `backend/db/add-laporan-pesanan.sql` (database `db_vendoria` lokal) |
| **Masalah** | User melihat banyak pesan generik "Terjadi kesalahan. Coba lagi." sesudah fitur laporan pesanan. |
| **Akar** | Kesalahan sendiri: kode baru membaca `klaim.jenis` dkk., tetapi skrip SQL harus dijalankan manual dan belum dijalankan (terbukti: 9 kolom lama saja di `db_vendoria`). Saat diperiksa backend juga tidak berjalan di :8080, yang menimbulkan pesan serupa. |
| **Fix** | Menjalankan skrip (7 kolom ditambah; 1 baris klaim lama utuh). |
| **Verifikasi** | Kolom ada (`information_schema`). BELUM: backend dinyalakan lagi dan halaman dicoba user. |
| **Pelajaran** | Perubahan skema tanpa migrasi otomatis: jalankan/minta jalankan SQL sebagai langkah pertama, bukan catatan di akhir. |
| **Log Keyword** | `Terjadi kesalahan. Coba lagi.`, `column k.jenis does not exist`, backend-pelunasan-deposit-jaminan |
| **Deploy** | Belum (lokal) |

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
