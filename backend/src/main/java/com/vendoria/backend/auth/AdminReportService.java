package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminReportDtos.*;

/** Laporan transaksi (pemesanan) dan pencairan dana (pencairan_dana), hanya baca, untuk administrator aktif. */
@Service
class AdminReportService {
  // Hanya maju: menunggu -> diproses -> berhasil/gagal; menunggu/diproses boleh dibatalkan. berhasil, gagal, dibatalkan = akhir.
  private static final Map<String,Set<String>> PAYOUT_NEXT=Map.of("menunggu",Set.of("diproses","dibatalkan"),"diproses",Set.of("berhasil","gagal","dibatalkan"));
  private static final String PAYOUT_SELECT="""
      select d.pencairan_id,p.kode_pemesanan,v.nama_vendor,d.jumlah,d.status,d.referensi_transfer,d.diajukan_pada,d.dicairkan_pada,a.nama as pemroses,
        d.bank,d.nomor_rekening,d.nama_pemilik,coalesce(d.jumlah_kotor,d.jumlah) as kotor,d.biaya_platform,d.persen_biaya,d.potongan_klaim
      from pencairan_dana d join pemesanan p on p.order_id=d.order_id join vendor v on v.vendor_id=d.vendor_id
      left join pengguna a on a.user_id=d.diproses_oleh
      """;
  private final JdbcTemplate jdbc;
  AdminReportService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  // shortcut: maks 5000 baris terbaru per periode, filter status/pencarian di frontend; upgrade bila periode > 5000 transaksi.
  @Transactional(readOnly=true)
  List<Transaction> transactions(Long actorId,LocalDate start,LocalDate end) {
    admin(actorId);
    if(start!=null && end!=null && end.isBefore(start)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tanggal akhir harus sama atau setelah tanggal mulai");
    return jdbc.query("""
        select p.kode_pemesanan,p.tanggal_pemesanan::date as tanggal,c.nama as customer,v.nama_vendor,p.total_biaya_sewa,
          case p.status_pesanan when 'selesai' then 'Selesai' when 'dibatalkan' then 'Dibatalkan' else 'Diproses' end as status
        from pemesanan p join pengguna c on c.user_id=p.user_id join vendor v on v.vendor_id=p.vendor_id
        where (?::date is null or p.tanggal_pemesanan::date>=?) and (?::date is null or p.tanggal_pemesanan::date<=?)
        order by p.tanggal_pemesanan desc,p.order_id desc limit 5000
        """,(rs,n)->new Transaction(rs.getString("kode_pemesanan"),rs.getString("tanggal"),rs.getString("customer"),rs.getString("nama_vendor"),
            rs.getBigDecimal("total_biaya_sewa").longValue(),rs.getString("status")),start,start,end,end);
  }

  // shortcut: maks 1000 pencairan terbaru tanpa paging server; upgrade bila pencairan > 1000.
  @Transactional(readOnly=true)
  List<Payout> payouts(Long actorId) {
    admin(actorId);
    return jdbc.query(PAYOUT_SELECT+"order by d.diajukan_pada desc,d.pencairan_id desc limit 1000",AdminReportService::payout);
  }

  @Transactional
  Payout decidePayout(Long actorId,Long id,PayoutDecision decision) {
    adminForUpdate(actorId);
    var rows=jdbc.queryForList("select status from pencairan_dana where pencairan_id=? for update",String.class,id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Pencairan tidak ditemukan");
    if(!PAYOUT_NEXT.getOrDefault(rows.getFirst(),Set.of()).contains(decision.status()))
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Status pencairan tidak bisa diubah dari "+rows.getFirst()+" ke "+decision.status()+". Muat ulang daftar");
    boolean paid="berhasil".equals(decision.status());
    if(paid && decision.reference()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Referensi transfer wajib diisi saat menandai berhasil");
    if(paid && Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from pencairan_dana where referensi_transfer=? and pencairan_id<>?)",Boolean.class,decision.reference(),id)))
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Referensi transfer sudah dipakai pencairan lain");
    try { // balapan dua admin: batas unik DB tetap menang
      jdbc.update("update pencairan_dana set status=?,referensi_transfer=coalesce(?,referensi_transfer),diproses_oleh=?,dicairkan_pada=case when ? then now() else dicairkan_pada end where pencairan_id=?",
          decision.status(),paid?decision.reference():null,actorId,paid,id);
    } catch(DataIntegrityViolationException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Referensi transfer sudah dipakai pencairan lain"); }
    return jdbc.queryForObject(PAYOUT_SELECT+"where d.pencairan_id=?",AdminReportService::payout,id);
  }

  private static Payout payout(ResultSet rs,int n) throws SQLException {
    String status=rs.getString("status"),number=rs.getString("nomor_rekening");
    boolean pending="menunggu".equals(status)||"diproses".equals(status); // nomor lengkap hanya selama masih harus ditransfer
    return new Payout("PCR-"+rs.getLong("pencairan_id"),rs.getString("kode_pemesanan"),rs.getString("nama_vendor"),rs.getBigDecimal("jumlah").longValue(),
        status,rs.getString("referensi_transfer"),iso(rs.getTimestamp("diajukan_pada")),iso(rs.getTimestamp("dicairkan_pada")),rs.getString("pemroses"),
        rs.getString("bank"),number==null?null:pending?number:RefundAccountService.mask(number),rs.getString("nama_pemilik"),
        rs.getBigDecimal("kotor").longValue(),rs.getBigDecimal("biaya_platform").longValue(),rs.getBigDecimal("persen_biaya").doubleValue(),rs.getBigDecimal("potongan_klaim").longValue());
  }
  private static String iso(Timestamp t) { return t==null?null:t.toInstant().toString(); }
  private void admin(Long id) { check(id,false); }
  private void adminForUpdate(Long id) { check(id,true); }
  private void check(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
}
