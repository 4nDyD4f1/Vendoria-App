package com.vendoria.backend.auth;

import java.util.List;
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
  private static String pending(long vendorId) {
    return """
        select 'pesanan:'||p.order_id||':konfirmasi' as kunci,'Pesanan baru perlu dikonfirmasi' as judul,
          c.nama||' memesan pesanan '||p.kode_pemesanan||'.' as isi,p.tanggal_pemesanan as waktu,'/vendor/pesanan/'||p.order_id as tautan
        from pemesanan p join pengguna c on c.user_id=p.user_id where p.vendor_id=%1$d and p.status_pesanan='menunggu_konfirmasi'
        union all
        select 'pesanan:'||p.order_id||':serah','Serah terima pesanan terkonfirmasi',
          'Siapkan perlengkapan pesanan '||p.kode_pemesanan||' untuk '||c.nama||'.',
          coalesce((select max(h.diubah_pada) from riwayat_status_pesanan h where h.order_id=p.order_id and h.status_baru='dikonfirmasi'),p.tanggal_pemesanan),
          '/vendor/serah-terima/'||p.order_id
        from pemesanan p join pengguna c on c.user_id=p.user_id where p.vendor_id=%1$d and p.status_pesanan='dikonfirmasi'
        union all
        select 'pesanan:'||p.order_id||':inspeksi','Pengembalian perlu diperiksa',
          'Pesanan '||p.kode_pemesanan||' sudah dikembalikan. Periksa kondisi alat lalu selesaikan pesanan.',
          coalesce((select max(h.diubah_pada) from riwayat_status_pesanan h where h.order_id=p.order_id and h.status_baru='dikembalikan'),p.tanggal_pemesanan),
          '/vendor/serah-terima/'||p.order_id
        from pemesanan p where p.vendor_id=%1$d and p.status_pesanan='dikembalikan'
        union all
        select 'klaim:'||k.klaim_id||':buka','Klaim perlu ditanggapi',
          'Klaim KLM-'||k.klaim_id||' pada pesanan '||p.kode_pemesanan||' menunggu keputusan admin.',k.diajukan_pada,'/vendor/klaim/KLM-'||k.klaim_id
        from klaim k join pemesanan p on p.order_id=k.order_id where p.vendor_id=%1$d and k.status in ('diajukan','ditinjau')
        union all
        select 'klaim:'||k.klaim_id||':putusan','Klaim diputuskan: '||initcap(k.status),
          'Klaim KLM-'||k.klaim_id||' pada pesanan '||p.kode_pemesanan||' sudah diputuskan admin. Tandai selesai di halaman Klaim.',
          coalesce(k.diputuskan_pada,k.diajukan_pada),'/vendor/klaim/KLM-'||k.klaim_id
        from klaim k join pemesanan p on p.order_id=k.order_id where p.vendor_id=%1$d and k.status in ('disetujui','ditolak')
        union all
        select 'pencairan:'||d.pencairan_id||':diproses','Pencairan dana sedang diproses',
          'Pencairan PCR-'||d.pencairan_id||' untuk pesanan '||p.kode_pemesanan||' sedang diproses admin.',d.diajukan_pada,'/vendor/pencairan/PCR-'||d.pencairan_id
        from pencairan_dana d join pemesanan p on p.order_id=d.order_id where d.vendor_id=%1$d and d.status='diproses'
        union all
        select 'pencairan:'||d.pencairan_id||':berhasil','Pencairan dana berhasil',
          'Pencairan PCR-'||d.pencairan_id||' untuk pesanan '||p.kode_pemesanan||' sudah ditransfer ke rekening Anda.',
          coalesce(d.dicairkan_pada,d.diajukan_pada),'/vendor/pencairan/PCR-'||d.pencairan_id
        from pencairan_dana d join pemesanan p on p.order_id=d.order_id
        where d.vendor_id=%1$d and d.status='berhasil' and coalesce(d.dicairkan_pada,d.diajukan_pada)>=now()-interval '7 days'
        union all
        select 'pencairan:'||d.pencairan_id||':gagal','Pencairan dana gagal',
          'Pencairan PCR-'||d.pencairan_id||' gagal diproses. Ajukan ulang dari halaman Pencairan.',d.diajukan_pada,'/vendor/pencairan/PCR-'||d.pencairan_id
        from pencairan_dana d where d.vendor_id=%1$d and d.status='gagal' and d.diajukan_pada>=now()-interval '14 days'
        """.formatted(vendorId);
  }

  // shortcut: 50 notifikasi terbaru saja; yang lebih lama tampil setelah yang baru ditangani. Upgrade bila antrean rutin > 50.
  @Transactional(readOnly=true)
  List<Notification> list(Long actorId) {
    VendorAccess.verification(jdbc,actorId);
    Long vendorId=VendorAccess.vendorId(jdbc,actorId);
    if(vendorId==null) return List.of();
    return jdbc.query("""
        select n.*,s.dibaca_pada from (%s) n
        left join notifikasi_admin s on s.user_id=? and s.kunci=n.kunci
        where s.dihapus_pada is null order by n.waktu desc,n.kunci limit 50
        """.formatted(pending(vendorId)),(rs,i)->new Notification(rs.getString("kunci"),rs.getString("judul"),rs.getString("isi"),
        rs.getTimestamp("waktu").toInstant().toString(),rs.getString("tautan"),rs.getTimestamp("dibaca_pada")!=null),actorId);
  }

  @Transactional
  void markRead(Long actorId,List<String> ids) { write(actorId,ids,"null"); }

  @Transactional
  void dismiss(Long actorId,List<String> ids) { write(actorId,ids,"now()"); }

  // Hanya kunci yang memang sedang menjadi notifikasi vendor ini yang disimpan: id asal (atau milik vendor lain) tidak menambah baris.
  private void write(Long actorId,List<String> ids,String dismissed) {
    VendorAccess.verification(jdbc,actorId,true);
    Long vendorId=VendorAccess.vendorId(jdbc,actorId);
    if(vendorId==null) return;
    jdbc.update("""
        insert into notifikasi_admin(user_id,kunci,dibaca_pada,dihapus_pada)
        select ?,n.kunci,now(),%s from (%s) n where n.kunci=any(?::text[])
        on conflict (user_id,kunci) do update set dibaca_pada=coalesce(notifikasi_admin.dibaca_pada,excluded.dibaca_pada),
          dihapus_pada=coalesce(excluded.dihapus_pada,notifikasi_admin.dihapus_pada)
        """.formatted(dismissed,pending(vendorId)),actorId,ids.stream().distinct().toArray(String[]::new));
  }
}
