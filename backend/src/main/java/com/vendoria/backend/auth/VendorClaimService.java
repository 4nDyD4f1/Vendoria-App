package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorClaimDtos.*;

/** Klaim atas pesanan milik vendor (tabel klaim): lihat dan majukan status. Keputusan setuju/tolak tetap milik admin. */
@Service
class VendorClaimService {
  // Hanya maju, tidak pernah mundur. 'ditinjau' tidak punya langkah vendor: tinggal menunggu keputusan admin (AdminClaimService).
  private static final Map<String,String> NEXT=Map.of("diajukan","ditinjau","disetujui","selesai","ditolak","selesai");
  private static final String SELECT="""
      select k.klaim_id,p.kode_pemesanan,c.nama as customer,k.alasan,k.diajukan_pada::date as tanggal,p.total_dp,k.status,k.keputusan_admin,k.diputuskan_pada,
      (select sum(r.jumlah) from pengembalian_dana r where r.klaim_id=k.klaim_id) as ganti_rugi
      from klaim k
      join pemesanan p on p.order_id=k.order_id
      join pengguna c on c.user_id=k.user_id
      """;
  private final JdbcTemplate jdbc;
  VendorClaimService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  // shortcut: tanpa paging server (maks 500 terbaru), filter & halaman di frontend; upgrade bila klaim vendor > 500.
  @Transactional(readOnly=true)
  List<Claim> list(Long actorId) {
    Long vendorId=vendor(actorId,false);
    if(vendorId==null) return List.of();
    return jdbc.query(SELECT+"where p.vendor_id=? order by k.diajukan_pada desc,k.klaim_id desc limit 500",VendorClaimService::claim,vendorId);
  }

  @Transactional
  Claim process(Long actorId,Long id,Advance input) {
    Long vendorId=vendor(actorId,true);
    var rows=vendorId==null?List.<String>of():jdbc.queryForList(
        "select k.status from klaim k join pemesanan p on p.order_id=k.order_id where k.klaim_id=? and p.vendor_id=? for update of k",String.class,id,vendorId);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Klaim tidak ditemukan");
    String current=rows.getFirst();
    if(!current.equals(input.from())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Status klaim sudah berubah. Muat ulang daftar");
    String next=NEXT.get(current);
    if(next==null) throw new ResponseStatusException(HttpStatus.CONFLICT,
        "ditinjau".equals(current)?"Klaim sedang menunggu keputusan admin":"Klaim sudah selesai");
    jdbc.update("update klaim set status=? where klaim_id=?",next,id);
    return jdbc.queryForObject(SELECT+"where k.klaim_id=?",VendorClaimService::claim,id);
  }

  private static Claim claim(ResultSet rs,int n) throws SQLException {
    var decided=rs.getTimestamp("diputuskan_pada");
    String status=rs.getString("status");
    return new Claim("KLM-"+rs.getLong("klaim_id"),rs.getString("kode_pemesanan"),rs.getString("customer"),rs.getString("alasan"),rs.getString("tanggal"),
        rs.getBigDecimal("total_dp").longValue(),status,rs.getString("keputusan_admin"),decided==null?null:decided.toInstant().toString(),NEXT.get(status),
        rs.getBigDecimal("ganti_rugi")==null?null:rs.getBigDecimal("ganti_rugi").longValue());
  }
  /** vendor_id akun vendor aktif; null bila profil bisnis belum dibuat. */
  private Long vendor(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var users=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(users.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"vendor".equals(users.getFirst().get("role")) || !Pengguna.AKTIF.equals(users.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya akun vendor aktif yang dapat mengelola klaim");
    var vendors=jdbc.queryForList("select vendor_id from vendor where user_id=?",Long.class,id);
    return vendors.isEmpty()?null:vendors.getFirst();
  }
}
