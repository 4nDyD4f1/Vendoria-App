// Tiga artikel statis untuk "Tips dan inspirasi acara" di beranda.
export const blogPosts = [
  {
    slug: 'peralatan-pesta-kebun-romantis',
    category: 'Pernikahan',
    title: 'Checklist Lengkap Peralatan Pesta Kebun Romantis',
    excerpt: 'Dari tenda gazebo hingga lampu string, ini daftar yang perlu disiapkan agar pesta kebun terasa hangat dan tetap aman.',
    image: '/assets/figma/a7aac7201ffdfb7d7440.png',
    intro: 'Pesta kebun terlihat sederhana di foto, padahal hampir semua kenyamanannya harus dibawa sendiri: peneduh, lantai, listrik, sampai penerangan. Daftar di bawah membantu kamu tidak melewatkan hal penting.',
    sections: [
      { heading: 'Peneduh dan alas', text: 'Cuaca tidak bisa dinegosiasikan. Siapkan peneduh walaupun ramalan cuaca terlihat cerah, dan pastikan kursi tidak amblas di rumput basah.', list: ['Tenda transparan atau gazebo untuk area utama', 'Tenda kecil terpisah untuk katering dan perlengkapan', 'Lantai flooring atau karpet jalan di area yang sering dilewati', 'Pemberat atau angkur tenda yang sesuai dengan jenis tanah'] },
      { heading: 'Meja dan kursi', text: 'Hitung tamu, lalu tambah cadangan sekitar sepuluh persen. Kursi lipat kayu cocok untuk nuansa kebun, sedangkan meja bundar membuat tamu lebih mudah mengobrol.', list: ['Kursi tamu dan cadangan', 'Meja bundar atau meja panjang beserta taplak', 'Meja akad atau meja utama', 'Meja registrasi dan meja hadiah'] },
      { heading: 'Cahaya yang membangun suasana', text: 'Lampu string memberi kesan hangat, tetapi jangan menjadi satu-satunya sumber cahaya. Jalur menuju toilet, parkiran, dan area makan tetap perlu terang.', list: ['Lampu string di atas area duduk', 'Lampu sorot hangat untuk dekorasi dan pelaminan', 'Penerangan jalur dan tangga'] },
      { heading: 'Listrik dan suara', text: 'Tanyakan daya yang tersedia di lokasi sebelum menyewa. Bila tidak cukup, sewa genset silent dan letakkan jauh dari area tamu. Gunakan kabel luar ruang dan tutup sambungan dari air.' },
      { heading: 'Sebelum hari H', text: 'Minta foto kondisi barang saat serah terima, coba semua lampu dan pengeras suara di lokasi, lalu tentukan satu orang yang memegang kontak vendor selama acara berlangsung.' },
    ],
  },
  {
    slug: 'watt-sound-system-seminar',
    category: 'Seminar',
    title: 'Menghitung Kebutuhan Watt Sound System Seminar',
    excerpt: 'Jangan sewa kebesaran atau kekecilan. Pelajari cara menghitung kebutuhan daya audio berdasarkan jumlah peserta dan ruangan.',
    image: '/assets/figma/eedbdbc6bf4c698db24f.png',
    intro: 'Seminar tidak butuh suara sekeras konser. Yang dibutuhkan adalah ucapan pembicara terdengar jelas sampai kursi paling belakang tanpa membuat baris depan menutup telinga.',
    sections: [
      { heading: 'Mulai dari jumlah peserta', text: 'Sebagai ancar-ancar untuk acara bicara di dalam ruangan, siapkan sekitar 3 sampai 5 watt RMS per orang. Untuk 100 peserta berarti sekitar 300 sampai 500 watt RMS. Acara dengan banyak musik atau di luar ruangan biasanya perlu kira-kira dua kali lipatnya.' },
      { heading: 'Baca angka RMS, bukan PMPO', text: 'RMS menunjukkan daya yang sanggup dikeluarkan secara terus-menerus. Angka puncak atau PMPO jauh lebih besar dan tidak bisa dipakai untuk membandingkan perangkat.' },
      { heading: 'Perhatikan ruangannya', text: 'Ruangan berlantai keramik dengan dinding kaca memantulkan suara dan membuat ucapan sulit ditangkap. Menambah volume justru memperburuknya. Beberapa speaker kecil yang tersebar sering lebih jelas daripada dua speaker besar di depan.' },
      { heading: 'Mikrofon dan mixer', text: 'Kejelasan suara ditentukan juga oleh mikrofon.', list: ['Satu mikrofon untuk setiap pembicara yang tampil bersamaan', 'Satu atau dua mikrofon tambahan untuk tanya jawab', 'Baterai cadangan untuk mikrofon nirkabel', 'Mixer dengan kanal cukup untuk mikrofon, laptop, dan cadangan'] },
      { heading: 'Uji sebelum peserta datang', text: 'Berjalanlah ke sudut paling jauh sambil ada yang berbicara di panggung. Pastikan speaker berada di depan posisi mikrofon agar tidak berdenging, dan catat posisi volume yang sudah pas.' },
    ],
  },
  {
    slug: 'booth-pameran-minimalis',
    category: 'Pameran',
    title: 'Inspirasi Booth Pameran Minimalis & Eye-catching',
    excerpt: 'Booth sederhana bisa tetap memikat. Kombinasi warna netral, pencahayaan terarah, dan tata alur pengunjung yang tepat.',
    image: '/assets/figma/2c5ac96b31c8824127ba.png',
    intro: 'Pengunjung pameran biasanya hanya melirik beberapa detik sambil berjalan. Booth yang tenang dan jelas sering lebih mudah diingat daripada yang penuh tempelan.',
    sections: [
      { heading: 'Satu pesan utama', text: 'Tentukan satu kalimat yang harus dipahami orang dari jarak tiga meter. Pasang di atas ketinggian mata, besar, dan tanpa saingan.' },
      { heading: 'Warna netral dengan satu aksen', text: 'Gunakan putih, krem, atau kayu terang sebagai dasar, lalu satu warna merek sebagai aksen. Produk akan menonjol tanpa perlu dekorasi tambahan.' },
      { heading: 'Cahaya terarah', text: 'Lampu aula biasanya datar. Tambahkan lampu sorot kecil ke produk unggulan dan papan nama.', list: ['Dua sampai empat lampu sorot hangat', 'Satu lampu belakang untuk memberi kedalaman', 'Kabel yang dirapikan dan direkatkan agar tidak tersandung'] },
      { heading: 'Alur pengunjung', text: 'Biarkan bagian depan terbuka. Meja yang menutup seluruh sisi depan membuat orang enggan masuk. Letakkan area ngobrol di bagian dalam dan brosur di dekat jalur keluar.' },
      { heading: 'Daftar sewa yang praktis', text: 'Untuk booth ukuran tiga kali tiga meter, biasanya cukup satu meja display, dua kursi, satu rak, lampu sorot, dan satu stopkontak panjang. Pastikan batas daya dari penyelenggara sebelum menambah layar atau perangkat lain.' },
    ],
  },
];
