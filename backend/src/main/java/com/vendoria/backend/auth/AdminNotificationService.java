package com.vendoria.backend.auth;

import java.sql.Timestamp;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminNotificationDtos.*;

/** Notifikasi admin = antrean yang menunggu tindakan (KYC, klaim, pencairan); tabel notifikasi_admin hanya menyimpan status baca/hapus per admin. */
@Service
class AdminNotificationService {
  // Notifikasi hilang sendiri begitu antreannya diputuskan.
  private static final String PENDING="""
      select 'kyc:'||k.kyc_id as kunci,'Pengajuan KYC baru' as judul,u.nama||' ('||u.role||') menunggu verifikasi identitas.' as isi,
        k.diajukan_pada as waktu,'/admin/kyc/KYC-'||k.kyc_id as tautan
      from kyc_verifikasi k join pengguna u on u.user_id=k.user_id where k.status='menunggu'
      union all
      select 'klaim:'||k.klaim_id,'Klaim perlu ditinjau','Klaim KLM-'||k.klaim_id||' pada pesanan '||p.kode_pemesanan||' menunggu keputusan admin.',
        k.diajukan_pada,'/admin/klaim/KLM-'||k.klaim_id
      from klaim k join pemesanan p on p.order_id=k.order_id where k.status in ('diajukan','ditinjau')
      union all
      select 'pencairan:'||d.pencairan_id,'Pencairan dana menunggu','Vendor '||v.nama_vendor||' mengajukan pencairan PCR-'||d.pencairan_id||'.',
        d.diajukan_pada,'/admin/laporan/pencairan/PCR-'||d.pencairan_id
      from pencairan_dana d join vendor v on v.vendor_id=d.vendor_id where d.status='menunggu'
      """;
  private final JdbcTemplate jdbc;
  AdminNotificationService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  // shortcut: 50 notifikasi terbaru saja; yang lebih lama tampil setelah yang baru ditangani. Upgrade bila antrean rutin > 50.
  @Transactional(readOnly=true)
  List<Notification> list(Long actorId) {
    admin(actorId,false);
    return jdbc.query("""
        select n.*,s.dibaca_pada from (%s) n
        left join notifikasi_admin s on s.user_id=? and s.kunci=n.kunci
        where s.dihapus_pada is null order by n.waktu desc,n.kunci limit 50
        """.formatted(PENDING),(rs,i)->new Notification(rs.getString("kunci"),rs.getString("judul"),rs.getString("isi"),
        rs.getTimestamp("waktu").toInstant().toString(),rs.getString("tautan"),rs.getTimestamp("dibaca_pada")!=null),actorId);
  }

  @Transactional
  void markRead(Long actorId,List<String> ids) { write(actorId,ids,"now()","null"); }

  @Transactional
  void dismiss(Long actorId,List<String> ids) { write(actorId,ids,"now()","now()"); }

  // Hanya kunci yang memang sedang menjadi notifikasi yang disimpan: id asal tidak menambah baris.
  private void write(Long actorId,List<String> ids,String read,String dismissed) {
    admin(actorId,true);
    jdbc.update("""
        insert into notifikasi_admin(user_id,kunci,dibaca_pada,dihapus_pada)
        select ?,n.kunci,%s,%s from (%s) n where n.kunci=any(?::text[])
        on conflict (user_id,kunci) do update set dibaca_pada=coalesce(notifikasi_admin.dibaca_pada,excluded.dibaca_pada),
          dihapus_pada=coalesce(excluded.dihapus_pada,notifikasi_admin.dihapus_pada)
        """.formatted(read,dismissed,PENDING),actorId,ids.stream().distinct().toArray(String[]::new));
  }

  private void admin(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
}
