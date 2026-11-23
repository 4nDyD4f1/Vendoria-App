package com.vendoria.backend.auth;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.RefundAccountDtos.*;

/**
 * Rekening tujuan refund customer (tab "Rekening Refund" di /akun) dan riwayat refund-nya.
 * "Tervalidasi" berarti nama pemilik sama dengan nama akun; belum ada pengecekan ke bank.
 */
@Service
class RefundAccountService {
  static final int MAX=5;
  private final JdbcTemplate jdbc;
  RefundAccountService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  @Transactional
  List<Account> list(Long userId) {
    CustomerGuard.lock(jdbc,userId);
    return jdbc.query("select rekening_id,bank,nomor_rekening,nama_pemilik,utama from rekening_refund where user_id=? order by utama desc,rekening_id",
        (rs,n)->account(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getBoolean(5)),userId);
  }

  @Transactional
  Account create(Long userId,Input input) {
    String name=CustomerGuard.lock(jdbc,userId);
    if(!normalize(name).equals(normalize(input.owner()))) throw bad("Nama pemilik harus sama dengan nama akun Anda ("+name+")");
    int count=jdbc.queryForObject("select count(*) from rekening_refund where user_id=?",Integer.class,userId);
    if(count>=MAX) throw bad("Maksimal "+MAX+" rekening refund");
    if(Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from rekening_refund where user_id=? and bank=? and nomor_rekening=?)",Boolean.class,userId,input.bank(),input.number()))) throw duplicate();
    try {
      long id=jdbc.queryForObject("insert into rekening_refund(user_id,bank,nomor_rekening,nama_pemilik,utama) values (?,?,?,?,?) returning rekening_id",
          Long.class,userId,input.bank(),input.number(),input.owner(),count==0);
      return account(id,input.bank(),input.number(),input.owner(),count==0);
    } catch(DataIntegrityViolationException e) { throw duplicate(); } // balapan dua permintaan: batas unik DB tetap menang
  }

  @Transactional(readOnly=true)
  List<Refund> history(Long userId) {
    if(userId==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    return jdbc.query("""
        select r.pengembalian_id,p.kode_pemesanan,r.jumlah,r.status,r.alasan,r.diajukan_pada,r.dikembalikan_pada
        from pengembalian_dana r join pemesanan p on p.order_id=r.order_id
        where p.user_id=? order by r.diajukan_pada desc,r.pengembalian_id desc
        """,(rs,n)->new Refund(rs.getString(1),rs.getString(2),rs.getBigDecimal(3),rs.getString(4),rs.getString(5),
            rs.getObject(6,OffsetDateTime.class),rs.getObject(7,OffsetDateTime.class)),userId);
  }

  /** 8830-•••••-7992: 4 digit awal dan 4 digit akhir. */
  static String mask(String number) { return number.substring(0,4)+"-"+"•".repeat(number.length()-8)+"-"+number.substring(number.length()-4); }
  private static Account account(long id,String bank,String number,String owner,boolean primary) { return new Account(String.valueOf(id),bank,mask(number),owner,primary); }
  private static String normalize(String name) { return name.trim().replaceAll("\\s+"," ").toLowerCase(Locale.ROOT); }
  private static ResponseStatusException duplicate() { return new ResponseStatusException(HttpStatus.CONFLICT,"Rekening ini sudah terdaftar"); }
  private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
