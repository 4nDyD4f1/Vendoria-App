package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminDashboardDtos.*;

/** Ringkasan dashboard admin (hanya baca) dari pemesanan, pembayaran, klaim, pengembalian_dana, dan ulasan. */
@Service
class AdminDashboardService {
  private final JdbcTemplate jdbc;
  AdminDashboardService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  @Transactional(readOnly=true)
  Summary summary(Long actorId) {
    admin(actorId);
    long gmv=money("select coalesce(sum(total_biaya_sewa),0) from pemesanan where status_pesanan<>'dibatalkan' and tanggal_pemesanan>=now()-interval '30 days'");
    long escrow=money("""
        select coalesce((select sum(b.jumlah) from pembayaran b join pemesanan p on p.order_id=b.order_id
            where b.status='terverifikasi' and p.status_pesanan not in ('selesai','dibatalkan')),0)
          - coalesce((select sum(r.jumlah) from pengembalian_dana r join pemesanan p on p.order_id=r.order_id
            where r.status='berhasil' and p.status_pesanan not in ('selesai','dibatalkan')),0)
        """);
    // minggu ke-n mundur dari minggu berjalan (n=0); urut dari terlama
    List<Week> weekly=new ArrayList<>(jdbc.query("""
        select s.n,coalesce(sum(p.total_biaya_sewa),0) as total,count(p.order_id) as jumlah
        from generate_series(0,7) s(n)
        left join pemesanan p on p.status_pesanan<>'dibatalkan'
          and p.tanggal_pemesanan>=date_trunc('week',now())-make_interval(weeks=>s.n)
          and p.tanggal_pemesanan<date_trunc('week',now())-make_interval(weeks=>s.n-1)
        group by s.n order by s.n desc
        """,(rs,i)->new Week(rs.getInt("n")==0?"Ini":"M-"+rs.getInt("n"),rs.getBigDecimal("total").longValue(),rs.getInt("jumlah"))));
    List<Recent> recent=jdbc.query("""
        select p.kode_pemesanan,c.nama as customer,v.nama_vendor,p.total_biaya_sewa,
          case p.status_pesanan when 'menunggu_pembayaran' then 'Menunggu Pembayaran' when 'menunggu_konfirmasi' then 'Menunggu Konfirmasi'
            when 'dikonfirmasi' then 'Terkonfirmasi' when 'berjalan' then 'Sedang Disewa' when 'dikembalikan' then 'Dikembalikan'
            when 'selesai' then 'Selesai' else 'Dibatalkan' end as status
        from pemesanan p join pengguna c on c.user_id=p.user_id join vendor v on v.vendor_id=p.vendor_id
        order by p.tanggal_pemesanan desc,p.order_id desc limit 6
        """,(rs,i)->new Recent(rs.getString("kode_pemesanan"),rs.getString("customer"),rs.getString("nama_vendor"),rs.getBigDecimal("total_biaya_sewa").longValue(),rs.getString("status")));
    return new Summary(gmv,escrow,weekly,recent,health());
  }

  private Health health() {
    Double dispute=jdbc.queryForObject("""
        select case when o.total=0 then null else round(100.0*k.total/o.total,1)::float8 end
        from (select count(*) total from pemesanan where status_pesanan<>'dibatalkan') o,(select count(*) total from klaim) k
        """,Double.class);
    Double release=jdbc.queryForObject("""
        select round((extract(epoch from avg(dikembalikan_pada-diajukan_pada))/3600)::numeric,1)::float8
        from pengembalian_dana where status='berhasil' and dikembalikan_pada is not null
        """,Double.class);
    var rating=jdbc.queryForMap("select avg(rating) as rata,count(*) as jumlah from ulasan");
    BigDecimal avg=(BigDecimal)rating.get("rata");
    return new Health(dispute,release,avg==null?null:avg.setScale(1,RoundingMode.HALF_UP).doubleValue(),((Number)rating.get("jumlah")).intValue());
  }
  private long money(String sql) { return jdbc.queryForObject(sql,BigDecimal.class).longValue(); }
  private void admin(Long id) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?",id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
}
