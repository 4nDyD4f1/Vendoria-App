package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminReportDtos.*;

/** Laporan transaksi (pemesanan) dan pencairan dana (pencairan_dana), hanya baca, untuk administrator aktif. */
@Service
class AdminReportService {
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
    return jdbc.query("""
        select d.pencairan_id,p.kode_pemesanan,v.nama_vendor,d.jumlah,d.status,d.referensi_transfer,d.diajukan_pada,d.dicairkan_pada,a.nama as pemroses
        from pencairan_dana d join pemesanan p on p.order_id=d.order_id join vendor v on v.vendor_id=d.vendor_id
        left join pengguna a on a.user_id=d.diproses_oleh
        order by d.diajukan_pada desc,d.pencairan_id desc limit 1000
        """,AdminReportService::payout);
  }

  private static Payout payout(ResultSet rs,int n) throws SQLException {
    return new Payout("PCR-"+rs.getLong("pencairan_id"),rs.getString("kode_pemesanan"),rs.getString("nama_vendor"),rs.getBigDecimal("jumlah").longValue(),
        rs.getString("status"),rs.getString("referensi_transfer"),iso(rs.getTimestamp("diajukan_pada")),iso(rs.getTimestamp("dicairkan_pada")),rs.getString("pemroses"));
  }
  private static String iso(Timestamp t) { return t==null?null:t.toInstant().toString(); }
  private void admin(Long id) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?",id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
}
