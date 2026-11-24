package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Locale;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorPayoutDtos.*;

/**
 * Rekening pencairan vendor (rekening_vendor) dan permintaan pencairan dana (pencairan_dana).
 * Satu pencairan = satu pesanan selesai; admin yang memprosesnya.
 * Dana bersih = total sewa - biaya platform (persen app.payout.fee-percent, dibulatkan ke rupiah) - ganti rugi klaim yang disetujui (pengembalian_dana).
 */
@Service
class VendorPayoutService {
  private final JdbcTemplate jdbc;
  private final BigDecimal feePercent;
  /** Pesanan yang bisa dicairkan (satu parameter: vendor_id): selesai, tanpa klaim aktif (ditahan sampai admin memutuskan), belum punya pencairan berlaku, bersih > 0. */
  private final String eligible;
  VendorPayoutService(JdbcTemplate jdbc,@Value("${app.payout.fee-percent:6}") BigDecimal feePercent) {
    if(feePercent.signum()<0 || feePercent.compareTo(BigDecimal.valueOf(100))>0) throw new IllegalArgumentException("app.payout.fee-percent harus 0-100");
    this.jdbc=jdbc; this.feePercent=feePercent;
    String fee="round(p.total_biaya_sewa*"+feePercent.toPlainString()+"/100,0)"; // persen dari konfigurasi, bukan input pengguna
    this.eligible="""
        select p.order_id,p.vendor_id,p.total_biaya_sewa as kotor,%1$s as biaya,c.potongan,p.total_biaya_sewa-%1$s-c.potongan as bersih
        from pemesanan p
        cross join lateral (select coalesce(sum(r.jumlah),0) as potongan from pengembalian_dana r
          where r.order_id=p.order_id and r.klaim_id is not null and r.status in ('menunggu','diproses','berhasil')) c
        where p.vendor_id=? and p.status_pesanan='selesai' and p.total_biaya_sewa>0 and p.total_biaya_sewa-%1$s-c.potongan>0
          and not exists(select 1 from klaim k where k.order_id=p.order_id and k.status in ('diajukan','ditinjau'))
          and not exists(select 1 from pencairan_dana d where d.order_id=p.order_id and d.status in ('menunggu','diproses','berhasil'))
        """.formatted(fee);
  }

  @Transactional(readOnly=true)
  AccountState account(Long actorId) {
    Long vendorId=vendor(actorId,false);
    return vendorId==null?new AccountState(false,null):new AccountState(true,findAccount(vendorId));
  }

  /** Mengganti rekening tidak mengubah pencairan yang sudah diajukan (rekening tujuan disalin saat diajukan). */
  @Transactional
  AccountState saveAccount(Long actorId,AccountInput input) {
    Long vendorId=vendor(actorId,true);
    if(vendorId==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Simpan profil bisnis lebih dulu sebelum menautkan rekening");
    var names=jdbc.queryForList("select u.nama as pemilik,v.nama_vendor as bisnis from vendor v join pengguna u on u.user_id=v.user_id where v.vendor_id=?",vendorId).getFirst();
    if(!normalize(input.owner()).equals(normalize((String)names.get("pemilik"))) && !normalize(input.owner()).equals(normalize((String)names.get("bisnis"))))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Nama pemilik rekening harus sama dengan nama akun ("+names.get("pemilik")+") atau nama bisnis ("+names.get("bisnis")+")");
    jdbc.update("""
        insert into rekening_vendor(vendor_id,bank,nomor_rekening,nama_pemilik) values (?,?,?,?)
        on conflict (vendor_id) do update set bank=excluded.bank,nomor_rekening=excluded.nomor_rekening,nama_pemilik=excluded.nama_pemilik,updated_at=now()
        """,vendorId,input.bank(),input.number(),input.owner());
    return new AccountState(true,findAccount(vendorId));
  }

  // shortcut: maks 500 pencairan terbaru tanpa paging server, filter di frontend; upgrade bila pencairan vendor > 500.
  @Transactional(readOnly=true)
  Listing list(Long actorId) {
    VendorBusinessPolicy.requireReady(jdbc,actorId,false);
    Long vendorId=vendor(actorId,false);
    if(vendorId==null) return new Listing(new AccountState(false,null),available(null),List.of());
    List<Payout> items=jdbc.query("""
        select d.pencairan_id,p.kode_pemesanan,d.jumlah,d.status,d.bank,d.nomor_rekening,d.nama_pemilik,d.referensi_transfer,d.diajukan_pada,d.dicairkan_pada,
          coalesce(d.jumlah_kotor,d.jumlah) as kotor,d.biaya_platform,d.persen_biaya,d.potongan_klaim
        from pencairan_dana d join pemesanan p on p.order_id=d.order_id
        where d.vendor_id=? order by d.diajukan_pada desc,d.pencairan_id desc limit 500
        """,VendorPayoutService::payout,vendorId);
    return new Listing(new AccountState(true,findAccount(vendorId)),available(vendorId),items);
  }

  Available available(Long vendorId) {
    if(vendorId==null) return new Available(0,0,0,0,0,feePercent.doubleValue());
    var sum=jdbc.queryForMap("select coalesce(sum(kotor),0) as kotor,coalesce(sum(biaya),0) as biaya,coalesce(sum(potongan),0) as potongan,coalesce(sum(bersih),0) as bersih,count(*) as jumlah from ("+eligible+") e",vendorId);
    return new Available(((Number)sum.get("bersih")).longValue(),((Number)sum.get("jumlah")).intValue(),((Number)sum.get("kotor")).longValue(),
        ((Number)sum.get("biaya")).longValue(),((Number)sum.get("potongan")).longValue(),feePercent.doubleValue());
  }

  /** Cairkan dana: ajukan pencairan untuk seluruh pesanan yang memenuhi syarat sekaligus. */
  @Transactional
  Requested request(Long actorId) {
    VendorBusinessPolicy.requireReady(jdbc,actorId,true);
    Long vendorId=vendor(actorId,true);
    if(vendorId==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Simpan profil bisnis lebih dulu");
    jdbc.queryForObject("select vendor_id from vendor where vendor_id=? for update",Long.class,vendorId); // serialkan permintaan ganda vendor yang sama
    var bank=jdbc.queryForList("select bank,nomor_rekening,nama_pemilik from rekening_vendor where vendor_id=?",vendorId);
    if(bank.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Tautkan rekening pencairan di Profil bisnis terlebih dahulu");
    var row=bank.getFirst();
    long amount=available(vendorId).amount();
    try {
      int orders=jdbc.update("""
          insert into pencairan_dana(order_id,vendor_id,jumlah,jumlah_kotor,biaya_platform,persen_biaya,potongan_klaim,bank,nomor_rekening,nama_pemilik)
          select e.order_id,e.vendor_id,e.bersih,e.kotor,e.biaya,?,e.potongan,?,?,? from ("""+eligible+") e",
          feePercent,row.get("bank"),row.get("nomor_rekening"),row.get("nama_pemilik"),vendorId);
      if(orders==0) throw new ResponseStatusException(HttpStatus.CONFLICT,"Belum ada dana yang bisa dicairkan");
      return new Requested(orders,amount);
    } catch(DataIntegrityViolationException e) { // batas unik DB menang bila ada balapan di luar kunci vendor
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Pencairan untuk pesanan ini sudah diajukan. Muat ulang halaman");
    }
  }

  private Account findAccount(long vendorId) {
    var rows=jdbc.query("select bank,nomor_rekening,nama_pemilik from rekening_vendor where vendor_id=?",
        (rs,n)->new Account(rs.getString(1),mask(rs.getString(2)),rs.getString(3)),vendorId);
    return rows.isEmpty()?null:rows.getFirst();
  }
  private static Payout payout(ResultSet rs,int n) throws SQLException {
    String number=rs.getString("nomor_rekening");
    return new Payout("PCR-"+rs.getLong("pencairan_id"),rs.getString("kode_pemesanan"),rs.getBigDecimal("jumlah").longValue(),rs.getString("status"),
        rs.getString("bank"),number==null?null:mask(number),rs.getString("nama_pemilik"),rs.getString("referensi_transfer"),iso(rs.getTimestamp("diajukan_pada")),iso(rs.getTimestamp("dicairkan_pada")),
        rs.getBigDecimal("kotor").longValue(),rs.getBigDecimal("biaya_platform").longValue(),rs.getBigDecimal("persen_biaya").doubleValue(),rs.getBigDecimal("potongan_klaim").longValue());
  }
  private static String iso(Timestamp t) { return t==null?null:t.toInstant().toString(); }
  /** 8830-•••••-7992: 4 digit awal dan 4 digit akhir. */
  static String mask(String number) { return RefundAccountService.mask(number); }
  private static String normalize(String name) { return name.trim().replaceAll("\\s+"," ").toLowerCase(Locale.ROOT); }

  /** vendor_id akun vendor aktif; null bila profil bisnis belum dibuat. */
  private Long vendor(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var users=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(users.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"vendor".equals(users.getFirst().get("role")) || !Pengguna.AKTIF.equals(users.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya akun vendor aktif yang dapat mengelola pencairan");
    var vendors=jdbc.queryForList("select vendor_id from vendor where user_id=?",Long.class,id);
    return vendors.isEmpty()?null:vendors.getFirst();
  }
}
