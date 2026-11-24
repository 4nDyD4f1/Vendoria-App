package com.vendoria.backend.auth;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerNotificationDtos.*;

@Service
class CustomerNotificationService {
    // All event sources are restricted to the session's owner before joining read state.
    // Short, customer-specific keys fit the existing varchar(40) and cannot overlap vendor/admin keys.
    private static final String EVENTS = """
        with own_orders as (select * from pemesanan where user_id=?), events as (
          select 'c:o:'||p.order_id||':'||case p.status_pesanan
            when 'menunggu_pembayaran' then 'pay' when 'menunggu_konfirmasi' then 'review'
            when 'dikonfirmasi' then 'confirmed' when 'berjalan' then 'ongoing'
            when 'dikembalikan' then 'returned' when 'selesai' then 'done' else 'cancel' end as id,
            'order' as kind,case p.status_pesanan
              when 'menunggu_pembayaran' then 'Menunggu pembayaran' when 'menunggu_konfirmasi' then 'Pesanan menunggu konfirmasi'
              when 'dikonfirmasi' then 'Pesanan dikonfirmasi' when 'berjalan' then 'Penyewaan sedang berlangsung'
              when 'dikembalikan' then 'Alat telah dikembalikan' when 'selesai' then 'Pesanan selesai' else 'Pesanan dibatalkan' end as title,
            'Pesanan '||p.kode_pemesanan||case p.status_pesanan
              when 'menunggu_pembayaran' then ' menunggu pembayaran Anda.' when 'menunggu_konfirmasi' then ' sedang menunggu konfirmasi vendor.'
              when 'dikonfirmasi' then ' telah dikonfirmasi oleh vendor.' when 'berjalan' then ' sedang dalam masa penyewaan.'
              when 'dikembalikan' then ' telah dikembalikan dan menunggu pemeriksaan vendor.' when 'selesai' then ' telah diselesaikan.' else ' telah dibatalkan.' end as body,
            coalesce((select max(h.diubah_pada) from riwayat_status_pesanan h where h.order_id=p.order_id and h.status_baru=p.status_pesanan),p.tanggal_pemesanan) as occurred
          from own_orders p
          union all
          select 'c:k:'||k.kyc_id||':'||case k.status when 'menunggu' then 'pending' when 'terverifikasi' then 'verified' else 'rejected' end,
            'kyc',case k.status when 'menunggu' then 'Pengajuan KYC diterima' when 'terverifikasi' then 'KYC terverifikasi' else 'Pengajuan KYC ditolak' end,
            case k.status when 'menunggu' then 'Dokumen Anda sedang menunggu pemeriksaan admin.'
              when 'terverifikasi' then 'Identitas Anda telah berhasil diverifikasi.' else 'Pengajuan Anda perlu diperbaiki. Periksa detail di menu Verifikasi KYC pada profil.' end,
            coalesce(k.diputuskan_pada,k.diajukan_pada)
          from kyc_verifikasi k where k.user_id=? and k.kyc_id=(select k2.kyc_id from kyc_verifikasi k2 where k2.user_id=k.user_id order by k2.diajukan_pada desc,k2.kyc_id desc limit 1)
          union all
          select 'c:p:'||b.pembayaran_id||':'||case b.status when 'menunggu' then 'pending' when 'terverifikasi' then 'verified' when 'ditolak' then 'rejected' else 'failed' end,
            'payment',case b.status when 'menunggu' then 'Pembayaran sedang diperiksa' when 'terverifikasi' then 'Pembayaran terverifikasi' when 'ditolak' then 'Pembayaran ditolak' else 'Pembayaran gagal' end,
            'Pembayaran '||b.jenis||' untuk pesanan '||p.kode_pemesanan||case b.status
              when 'menunggu' then ' menunggu verifikasi.' when 'terverifikasi' then ' telah diverifikasi.' when 'ditolak' then ' ditolak. Periksa kembali bukti pembayaran Anda.' else ' gagal diproses.' end,
            coalesce(b.diverifikasi_pada,b.dibayar_pada,b.dibuat_pada)
          from pembayaran b join own_orders p on p.order_id=b.order_id
          union all
          select 'c:r:'||r.pengembalian_id||':'||case r.status when 'menunggu' then 'pending' when 'diproses' then 'processing' when 'berhasil' then 'success' when 'gagal' then 'failed' else 'cancelled' end,
            'refund','Pengembalian dana: '||initcap(r.status),
            'Pengembalian dana untuk pesanan '||p.kode_pemesanan||' berstatus '||r.status||'.',coalesce(r.dikembalikan_pada,r.diajukan_pada)
          from pengembalian_dana r join own_orders p on p.order_id=r.order_id
          union all
          select 'c:c:'||k.klaim_id||':'||case k.status when 'diajukan' then 'open' when 'ditinjau' then 'review' when 'disetujui' then 'approved' when 'ditolak' then 'rejected' else 'closed' end,
            'claim','Klaim pesanan: '||initcap(k.status),
            'Klaim pada pesanan '||p.kode_pemesanan||' berstatus '||k.status||'.',coalesce(k.diputuskan_pada,k.diajukan_pada)
          from klaim k join own_orders p on p.order_id=k.order_id
        )
        """;
    private final JdbcTemplate jdbc;
    CustomerNotificationService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    Listing list(Long actorId) {
        actor(actorId,false);
        String visible=" from events n left join notifikasi_admin s on s.user_id=? and s.kunci=n.id where s.dihapus_pada is null";
        var counts=jdbc.queryForMap(EVENTS+"select count(*) as total,count(*) filter(where s.dibaca_pada is null) as unread"+visible,actorId,actorId,actorId);
        var items=jdbc.query(EVENTS+"select n.*,s.dibaca_pada"+visible+" order by n.occurred desc,n.id limit 50",(rs,n)->new Notification(
            rs.getString("id"),rs.getString("kind"),rs.getString("title"),rs.getString("body"),
            rs.getTimestamp("occurred").toInstant().toString(),rs.getTimestamp("dibaca_pada")!=null),actorId,actorId,actorId);
        return new Listing(items,((Number)counts.get("unread")).longValue(),((Number)counts.get("total")).longValue());
    }
    @Transactional
    void read(Long actorId,List<String> ids) { write(actorId,ids); }
    @Transactional
    void readAll(Long actorId) { write(actorId,null); }
    private void write(Long actorId,List<String> ids) {
        actor(actorId,true);
        String query=EVENTS+"insert into notifikasi_admin(user_id,kunci,dibaca_pada) select ?,n.id,now() from events n"
            +(ids==null?"":" where n.id=any(?::text[])")
            +" on conflict(user_id,kunci) do update set dibaca_pada=coalesce(notifikasi_admin.dibaca_pada,excluded.dibaca_pada)";
        if(ids==null) jdbc.update(query,actorId,actorId,actorId);
        else jdbc.update(query,actorId,actorId,actorId,ids.stream().distinct().toArray(String[]::new));
    }
    private void actor(Long actorId,boolean lock) {
        if(actorId==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
        var users=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),actorId);
        if(users.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
        if(!"customer".equals(users.getFirst().get("role")) || !Pengguna.AKTIF.equals(users.getFirst().get("status_akun")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Notifikasi hanya untuk akun customer aktif");
    }
}
