package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorDashboardDtos.*;
import com.vendoria.backend.auth.VendorPayoutDtos.Available;

/** Ringkasan /vendor/dashboard (hanya baca): pesanan, klaim, dana siap cair, rating, dan nilai sewa mingguan milik vendor yang login. */
@Service
class VendorDashboardService {
  private final JdbcTemplate jdbc;
  private final VendorPayoutService payouts;
  VendorDashboardService(JdbcTemplate jdbc,VendorPayoutService payouts) { this.jdbc=jdbc; this.payouts=payouts; }

  @Transactional(readOnly=true)
  Summary summary(Long actorId) {
    String verification=VendorAccess.verification(jdbc,actorId);
    var vendors=jdbc.queryForList("select vendor_id,nama_vendor from vendor where user_id=?",actorId);
    if(vendors.isEmpty()) return new Summary(null,verification,0,0,0,0,0,payouts.available(null),null,0,0,List.of(0L,0L,0L,0L,0L,0L,0L,0L));
    long vendorId=((Number)vendors.getFirst().get("vendor_id")).longValue();

    Map<String,Integer> orders=new HashMap<>();
    jdbc.query("select status_pesanan,count(*) from pemesanan where vendor_id=? group by status_pesanan",rs->{ orders.put(rs.getString(1),rs.getInt(2)); },vendorId);
    int openClaims=jdbc.queryForObject("select count(*) from klaim k join pemesanan p on p.order_id=k.order_id where p.vendor_id=? and k.status in ('diajukan','ditinjau')",Integer.class,vendorId);
    var rating=jdbc.queryForMap("select avg(rating) as rata,count(*) as jumlah from ulasan where vendor_id=?",vendorId);
    BigDecimal avg=(BigDecimal)rating.get("rata");
    // minggu ke-n mundur dari minggu berjalan (n=0); urut dari terlama
    List<Long> weekly=jdbc.query("""
        select coalesce(sum(p.total_biaya_sewa),0) as total
        from generate_series(0,7) s(n)
        left join pemesanan p on p.vendor_id=? and p.status_pesanan='selesai'
          and p.tanggal_selesai_sewa>=(date_trunc('week',current_date)::date-7*s.n)
          and p.tanggal_selesai_sewa<(date_trunc('week',current_date)::date-7*(s.n-1))
        group by s.n order by s.n desc
        """,(rs,i)->rs.getBigDecimal("total").longValue(),vendorId);
    return new Summary((String)vendors.getFirst().get("nama_vendor"),verification,orders.getOrDefault("menunggu_konfirmasi",0),orders.getOrDefault("berjalan",0),
        orders.getOrDefault("dikonfirmasi",0),orders.getOrDefault("dikembalikan",0),openClaims,payouts.available(vendorId),
        avg==null?null:avg.setScale(1,RoundingMode.HALF_UP).doubleValue(),((Number)rating.get("jumlah")).intValue(),orders.getOrDefault("selesai",0),weekly);
  }
}
