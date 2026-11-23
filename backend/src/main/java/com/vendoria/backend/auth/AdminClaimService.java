package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminClaimDtos.*;

/** Daftar & keputusan klaim (tabel klaim) oleh administrator aktif. */
@Service
class AdminClaimService {
  // Klaim yang masuk ('diajukan') langsung tampil sebagai 'ditinjau' di dashboard admin.
  private static final String SELECT="""
      select k.klaim_id,p.kode_pemesanan,c.nama as customer,v.nama_vendor,k.alasan,k.diajukan_pada::date as tanggal,
        p.total_dp,case when k.status='diajukan' then 'ditinjau' else k.status end as status,
        k.keputusan_admin,a.nama as pemutus,k.diputuskan_pada
      from klaim k
      join pemesanan p on p.order_id=k.order_id
      join vendor v on v.vendor_id=p.vendor_id
      join pengguna c on c.user_id=k.user_id
      left join pengguna a on a.user_id=k.diputuskan_oleh
      """;
  private final JdbcTemplate jdbc;
  AdminClaimService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  // shortcut: tanpa paging server (maks 500 terbaru), filter & halaman di frontend; upgrade bila klaim > 500.
  @Transactional(readOnly=true)
  List<Claim> list(Long actorId) { admin(actorId,false); return jdbc.query(SELECT+"order by k.diajukan_pada desc,k.klaim_id desc limit 500",AdminClaimService::claim); }

  @Transactional
  Claim decide(Long actorId,Long id,Decision decision) {
    admin(actorId,true);
    var rows=jdbc.queryForList("select status from klaim where klaim_id=? for update",String.class,id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Klaim tidak ditemukan");
    if(!List.of("diajukan","ditinjau").contains(rows.getFirst())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Klaim ini sudah diputuskan. Muat ulang daftar");
    String note=decision.note()==null||decision.note().isBlank()?null:decision.note();
    if("ditolak".equals(decision.status()) && note==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Alasan penolakan wajib diisi");
    jdbc.update("update klaim set status=?,keputusan_admin=?,diputuskan_oleh=?,diputuskan_pada=now() where klaim_id=?",decision.status(),note,actorId,id);
    return jdbc.queryForObject(SELECT+"where k.klaim_id=?",AdminClaimService::claim,id);
  }

  private static Claim claim(ResultSet rs,int n) throws SQLException {
    var decided=rs.getTimestamp("diputuskan_pada");
    return new Claim("KLM-"+rs.getLong("klaim_id"),rs.getString("kode_pemesanan"),rs.getString("customer"),rs.getString("nama_vendor"),
        rs.getString("alasan"),rs.getString("tanggal"),rs.getBigDecimal("total_dp").longValue(),rs.getString("status"),
        rs.getString("keputusan_admin"),rs.getString("pemutus"),decided==null?null:decided.toInstant().toString());
  }
  private void admin(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
}
