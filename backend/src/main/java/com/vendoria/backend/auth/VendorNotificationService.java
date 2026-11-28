package com.vendoria.backend.auth;

import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vendoria.backend.auth.VendorDashboardDtos.*;

/**
 * Notifikasi vendor = hal yang perlu ditindak atau baru terjadi pada pesanan, klaim, dan pencairan vendor itu (dihitung, tidak disimpan).
 * Status baca/hapus disimpan per pengguna di tabel notifikasi_admin (strukturnya generik: user_id + kunci), sama seperti notifikasi admin.
 * Kunci memuat tahap ('pesanan:12:serah'), jadi pesanan yang maju ke tahap berikutnya memunculkan notifikasi baru.
 */
@Service
class VendorNotificationService {
  private final JdbcTemplate jdbc;
  VendorNotificationService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  /** vendor_id hanya angka dari database, bukan input pengguna. Notifikasi lama yang sudah selesai (berhasil/gagal) dibatasi 7/14 hari. */
  private static String pending(long vendorId,long userId) {
    return """
        select 'pesanan:'||p.order_id||':konfirmasi' as kunci,'Pesanan baru perlu dikonfirmasi' as judul,
          c.nama||' memesan pesanan '||p.kode_pemesanan||'. Konfirmasi dalam 24 jam atau pesanan batal otomatis.' as isi,p.tanggal_pemesanan as waktu,'/vendor/pesanan/'||p.order_id as tautan
        from pemesanan p join pengguna c on c.user_id=p.user_id where p.vendor_id=%1$d and p.status_pesanan='menunggu_konfirmasi'
        union all
        select 'pesanan:'||p.order_id||':serah','Serah terima pesanan terkonfirmasi',
          'Siapkan perlengkapan pesanan '||p.kode_pemesanan||' untuk '||c.nama||'.',
          coalesce((select max(h.diubah_pada) from riwayat_status_pesanan h where h.order_id=p.order_id and h.status_baru='dikonfirmasi'),p.tanggal_pemesanan),
          '/vendor/serah-terima/'||p.order_id
        from pemesanan p join pengguna c on c.user_id=p.user_id where p.vendor_id=%1$d and p.status_pesanan='dikonfirmasi' and %3$s
        union all
        select 'pesanan:'||p.order_id||':'||case b.jenis when 'deposit' then 'uangdp' else 'lunas' end,
          case b.jenis when 'deposit' then 'Uang masuk: deposit jaminan' else 'Uang masuk: pelunasan sewa' end,
          %4$s||' dari '||c.nama||' untuk pesanan '||p.kode_pemesanan||' sudah diterima dan ditahan Vendoria'
            ||case b.jenis when 'deposit' then ' sebagai jaminan.' else ' sampai pencairan.' end,
          coalesce(b.diverifikasi_pada,b.dibuat_pada),
          case b.jenis when 'deposit' then '/vendor/pesanan/' else '/vendor/serah-terima/' end||p.order_id
        from pembayaran b join pemesanan p on p.order_id=b.order_id join pengguna c on c.user_id=p.user_id
        where p.vendor_id=%1$d and b.status='terverifikasi' and p.status_pesanan<>'dibatalkan'
          and coalesce(b.diverifikasi_pada,b.dibuat_pada)>=now()-interval '14 days'
          and b.pembayaran_id=(select min(f.pembayaran_id) from pembayaran f where f.order_id=b.order_id and f.jenis=b.jenis and f.status='terverifikasi')
        union all
        select 'pesanan:'||p.order_id||':inspeksi','Pengembalian perlu diperiksa',
          'Pesanan '||p.kode_pemesanan||' sudah dikembalikan. Periksa kondisi alat lalu selesaikan pesanan.',
          coalesce((select max(h.diubah_pada) from riwayat_status_pesanan h where h.order_id=p.order_id and h.status_baru='dikembalikan'),p.tanggal_pemesanan),
          '/vendor/serah-terima/'||p.order_id
        from pemesanan p where p.vendor_id=%1$d and p.status_pesanan='dikembalikan'
        union all
        select 'klaim:'||k.klaim_id||':buka',case k.jenis when 'kerusakan' then 'Klaim perlu ditanggapi' else 'Pelanggan melaporkan pesanan' end,
          case when k.jenis='kerusakan' then 'Klaim KLM-'||k.klaim_id||' pada pesanan '||p.kode_pemesanan||' menunggu keputusan admin.'
            else 'Pesanan '||p.kode_pemesanan||': '||case k.jenis when 'tidak_sampai' then 'barang tidak sampai' when 'tidak_sesuai' then 'barang tidak sesuai' when 'kurang' then 'barang kurang' when 'tidak_berfungsi' then 'barang tidak berfungsi' else 'masalah lain' end||'. Kirim tanggapan di halaman Klaim.' end,k.diajukan_pada,'/vendor/klaim/KLM-'||k.klaim_id
        from klaim k join pemesanan p on p.order_id=k.order_id where p.vendor_id=%1$d and k.status in ('diajukan','ditinjau')
        union all
        select 'klaim:'||k.klaim_id||':putusan',
          case when k.jenis<>'kerusakan' then case k.status when 'disetujui' then 'Laporan pelanggan disetujui' else 'Laporan pelanggan ditolak' end
            when k.status='disetujui' then 'Deposit jaminan menjadi hak Anda' else 'Klaim diputuskan: Ditolak' end,
          case when k.jenis<>'kerusakan' then
              case when k.status='ditolak' then 'Laporan pada pesanan '||p.kode_pemesanan||' ditolak admin. Pesanan berjalan seperti biasa.'
                when k.jenis='tidak_sesuai' and k.barang_kembali_pada is null then 'Terima kembali barang pesanan '||p.kode_pemesanan||' lalu konfirmasi di halaman Klaim.'
                else 'Admin menyetujui laporan pesanan '||p.kode_pemesanan||'. Dana disesuaikan sesuai keputusan.' end
            when k.status='disetujui' then 'Deposit '||%5$s||' dari pesanan '||p.kode_pemesanan||' masuk pencairan setelah pesanan selesai.'
            else 'Klaim KLM-'||k.klaim_id||' pada pesanan '||p.kode_pemesanan||' ditolak admin. Tandai selesai di halaman Klaim.' end,
          coalesce(k.diputuskan_pada,k.diajukan_pada),'/vendor/klaim/KLM-'||k.klaim_id
        from klaim k join pemesanan p on p.order_id=k.order_id where p.vendor_id=%1$d and k.status in ('disetujui','ditolak')
        union all
        select 'pencairan:'||d.pencairan_id||':diproses','Pencairan dana sedang diproses',
          'Pencairan PCR-'||d.pencairan_id||' untuk pesanan '||p.kode_pemesanan||' sedang diproses admin.',d.diajukan_pada,'/vendor/pencairan/PCR-'||d.pencairan_id
        from pencairan_dana d join pemesanan p on p.order_id=d.order_id where d.vendor_id=%1$d and d.status='diproses'
        union all
        select 'pencairan:'||d.pencairan_id||':berhasil','Uang masuk: pencairan ditransfer',
          %6$s||' (PCR-'||d.pencairan_id||') untuk pesanan '||p.kode_pemesanan||' sudah ditransfer ke rekening Anda.',
          coalesce(d.dicairkan_pada,d.diajukan_pada),'/vendor/pencairan/PCR-'||d.pencairan_id
        from pencairan_dana d join pemesanan p on p.order_id=d.order_id
        where d.vendor_id=%1$d and d.status='berhasil' and coalesce(d.dicairkan_pada,d.diajukan_pada)>=now()-interval '7 days'
        union all
        select 'pencairan:'||d.pencairan_id||':gagal','Pencairan dana gagal',
          'Pencairan PCR-'||d.pencairan_id||' gagal diproses. Ajukan ulang dari halaman Pencairan.',d.diajukan_pada,'/vendor/pencairan/PCR-'||d.pencairan_id
        from pencairan_dana d where d.vendor_id=%1$d and d.status='gagal' and d.diajukan_pada>=now()-interval '14 days'
        union all
        select 'kyc:'||coalesce(k.kyc_id,0)||':'||case u.status_verifikasi when 'menunggu' then 'menunggu' when 'ditolak' then 'ditolak' else 'belum' end,
          case u.status_verifikasi when 'menunggu' then 'KYC sedang ditinjau' when 'ditolak' then 'Pengajuan KYC perlu diperbaiki' else 'Lengkapi verifikasi KYC' end,
          case u.status_verifikasi when 'menunggu' then 'Dokumen sudah diterima. Tunggu sampai KYC terverifikasi untuk melanjutkan aktivitas transaksi.'
            when 'ditolak' then 'Periksa catatan pemeriksa dan kirim ulang dokumen hingga identitas Anda terverifikasi.'
            else 'Verifikasi identitas Anda agar bisnis dapat diaktifkan setelah profil bisnis lengkap.' end,
          coalesce(k.diputuskan_pada,k.diajukan_pada,u.created_at,now()),'/vendor/kyc'
        from pengguna u left join lateral (select * from kyc_verifikasi x where x.user_id=u.user_id order by x.diajukan_pada desc,x.kyc_id desc limit 1) k on true
        where u.user_id=%2$d and u.status_verifikasi<>'terverifikasi'
        """.formatted(vendorId,userId,OrderMoney.SETTLED,OrderMoney.rupiah("b.jumlah"),
            OrderMoney.rupiah(OrderMoney.HELD_DEPOSIT),OrderMoney.rupiah("d.jumlah"));
  }

  // shortcut: 50 notifikasi terbaru saja; yang lebih lama tampil setelah yang baru ditangani. Upgrade bila antrean rutin > 50.
  @Transactional(readOnly=true)
  List<Notification> list(Long actorId) {
    VendorAccess.verification(jdbc,actorId);
    long vendorId=Objects.requireNonNullElse(VendorAccess.vendorId(jdbc,actorId),0L);
    return jdbc.query("""
        select n.*,s.dibaca_pada from (%s) n
        left join notifikasi_admin s on s.user_id=? and s.kunci=n.kunci
        where s.dihapus_pada is null order by n.waktu desc,n.kunci limit 50
        """.formatted(pending(vendorId,actorId)),(rs,i)->new Notification(rs.getString("kunci"),rs.getString("judul"),rs.getString("isi"),
        rs.getTimestamp("waktu").toInstant().toString(),rs.getString("tautan"),rs.getTimestamp("dibaca_pada")!=null),actorId);
  }

  @Transactional
  void markRead(Long actorId,List<String> ids) { write(actorId,ids,"null"); }

  @Transactional
  void dismiss(Long actorId,List<String> ids) { write(actorId,ids,"now()"); }

  // Hanya kunci yang memang sedang menjadi notifikasi vendor ini yang disimpan: id asal (atau milik vendor lain) tidak menambah baris.
  private void write(Long actorId,List<String> ids,String dismissed) {
    VendorAccess.verification(jdbc,actorId,true);
    long vendorId=Objects.requireNonNullElse(VendorAccess.vendorId(jdbc,actorId),0L);
    jdbc.update("""
        insert into notifikasi_admin(user_id,kunci,dibaca_pada,dihapus_pada)
        select ?,n.kunci,now(),%s from (%s) n where n.kunci=any(?::text[])
        on conflict (user_id,kunci) do update set dibaca_pada=coalesce(notifikasi_admin.dibaca_pada,excluded.dibaca_pada),
          dihapus_pada=coalesce(excluded.dihapus_pada,notifikasi_admin.dihapus_pada)
        """.formatted(dismissed,pending(vendorId,actorId)),actorId,ids.stream().distinct().toArray(String[]::new));
  }
}
