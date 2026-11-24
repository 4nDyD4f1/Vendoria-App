package com.vendoria.backend.auth;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AdminAccountDtos.*;

@Service
class AdminAccountService {
  // Secret columns are deliberately excluded. KYC is read-only in this module.
  private static final String SELECT="""
      select p.user_id,p.nama,p.email,p.no_telp,p.role,p.status_akun,p.status_verifikasi,p.catatan_admin,
        (p.google_sub is not null or p.two_factor_email) as email_locked,
        v.nama_vendor,v.kota,v.alamat,v.deskripsi,v.status_aktif
      from pengguna p left join vendor v on v.user_id=p.user_id
      """;
  private static final List<String> USER_REFERENCES=List.of(
      "kyc_verifikasi.user_id","kyc_verifikasi.diverifikasi_oleh","pemesanan.user_id","ulasan.user_id","klaim.user_id",
      "cek_barang.diperiksa_oleh","riwayat_status_pesanan.diubah_oleh","pembayaran.diverifikasi_oleh",
      "klaim.diputuskan_oleh","pencairan_dana.diproses_oleh","pengembalian_dana.diproses_oleh");
  private static final List<String> VENDOR_REFERENCES=List.of("item.vendor_id","pemesanan.vendor_id","ulasan.vendor_id","pencairan_dana.vendor_id");
  private final JdbcTemplate jdbc;
  private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder();
  AdminAccountService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  @Transactional(readOnly=true)
  Directory list(Long actorId) {
    admin(actorId,false);
    return new Directory(accounts("customer"),accounts("vendor"));
  }
  @Transactional(readOnly=true)
  Account get(Long actorId,String kind,Long id) { admin(actorId,false); return find(role(kind),id,false); }

  @Transactional
  Account save(Long actorId,String kind,Long id,Input input) {
    admin(actorId,true); String role=role(kind);
    Account previous=id==null?null:find(role,id,true);
    validate(role,id,input);
    if(previous!=null && previous.emailLocked() && !previous.email().equalsIgnoreCase(input.email()))
      throw bad("Email akun Google atau akun dengan 2FA aktif tidak dapat diubah melalui halaman ini");
    if(Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from pengguna where lower(email)=? and (?::bigint is null or user_id<>?))",Boolean.class,input.email(),id,id))) throw duplicate();
    String hash=input.password()==null?null:encoder.encode(input.password());
    try {
      if(id==null) id=jdbc.queryForObject("""
          insert into pengguna(nama,email,no_telp,password_hash,role,status_akun,catatan_admin,password_dibuat)
          values (?,?,?,?,?,?,?,true) returning user_id
          """,Long.class,"vendor".equals(role)?input.owner():input.name(),input.email(),input.phone(),hash,role,input.status(),input.notes());
      else {
        List<Object> args=new ArrayList<>(Arrays.asList("vendor".equals(role)?input.owner():input.name(),input.email(),input.phone(),input.status(),input.notes()));
        String sql="update pengguna set nama=?,email=?,no_telp=?,status_akun=?,catatan_admin=?,updated_at=now()";
        if(hash!=null) { sql+=",password_hash=?,password_dibuat=true"; args.add(hash); }
        args.add(id); args.add(role); jdbc.update(sql+" where user_id=? and role=?",args.toArray());
      }
      if("vendor".equals(role)) jdbc.update("""
          insert into vendor(user_id,nama_vendor,kota,alamat,deskripsi) values (?,?,?,?,?)
          on conflict(user_id) do update set nama_vendor=excluded.nama_vendor,kota=excluded.kota,
            alamat=excluded.alamat,deskripsi=excluded.deskripsi
          """,id,input.name(),input.city(),input.address(),input.description());
      if("vendor".equals(role)) VendorBusinessPolicy.sync(jdbc,id);
    } catch(DataIntegrityViolationException e) { throw duplicate(); }
    return find(role,id,false);
  }
  @Transactional
  void delete(Long actorId,String kind,List<Long> ids) {
    admin(actorId,true); String role=role(kind); List<Long> targets=ids.stream().distinct().sorted().toList();
    for(Long id:targets) {
      find(role,id,true);
      if(referenced(USER_REFERENCES,id)) throw linked();
      for(Long vendorId:jdbc.queryForList("select vendor_id from vendor where user_id=? for update",Long.class,id))
        if(referenced(VENDOR_REFERENCES,vendorId)) throw linked();
    }
    try {
      for(Long id:targets) {
        jdbc.update("delete from vendor where user_id=?",id);
        jdbc.update("delete from pengguna where user_id=? and role=?",id,role);
      }
    } catch(DataIntegrityViolationException e) { throw linked(); }
  }
  private boolean referenced(List<String> references,Long id) {
    // Identifiers are fixed application constants; every value is a bound parameter.
    for(String reference:references) {
      String[] names=reference.split("\\.");
      if(Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from "+names[0]+" where "+names[1]+"=?)",Boolean.class,id))) return true;
    }
    return false;
  }
  private List<Account> accounts(String role) { return jdbc.query(SELECT+"where p.role=? order by p.user_id desc",this::account,role); }
  private Account find(String role,Long id,boolean lock) {
    if(lock && jdbc.queryForList("select user_id from pengguna where user_id=? and role=? for update",Long.class,id,role).isEmpty()) throw missing();
    var rows=jdbc.query(SELECT+"where p.user_id=? and p.role=?",this::account,id,role);
    if(rows.isEmpty()) throw missing(); return rows.getFirst();
  }
  private Account account(ResultSet rs,int number) throws SQLException {
    boolean vendor="vendor".equals(rs.getString("role")); String name=vendor?rs.getString("nama_vendor"):rs.getString("nama");
    if(name==null) name=rs.getString("nama");
    return new Account(rs.getString("user_id"),name,vendor?rs.getString("nama"):null,rs.getString("email"),rs.getString("no_telp"),
        vendor?rs.getString("kota"):null,vendor?rs.getString("alamat"):null,vendor?rs.getString("deskripsi"):null,
        rs.getString("status_akun"),vendor?(rs.getBoolean("status_aktif")?"Aktif":"Nonaktif"):null,
        verification(rs.getString("status_verifikasi")),rs.getString("catatan_admin"),rs.getBoolean("email_locked"));
  }
  private void admin(Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select role,status_akun from pengguna where user_id=?"+(lock?" for update":""),id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"admin".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk administrator aktif");
  }
  private static void validate(String role,Long id,Input input) {
    if(id==null && input.password()==null) throw bad("Kata sandi wajib diisi untuk akun baru");
    if(input.password()!=null && (input.password().length()<8 || input.password().length()>72 || input.password().getBytes(StandardCharsets.UTF_8).length>72))
      throw bad("Kata sandi minimal 8 karakter dan maksimal 72 byte UTF-8");
    if("customer".equals(role)) {
      if(input.name().length()>120) throw bad("Nama customer maksimal 120 karakter");
      if(nonblank(input.owner())||nonblank(input.city())||nonblank(input.address())||nonblank(input.description())||input.businessStatus()!=null)
        throw bad("Data bisnis hanya tersedia untuk akun vendor");
    } else if(!nonblank(input.owner())) throw bad("Nama pemilik vendor wajib diisi");
  }
  private static boolean nonblank(String text) { return text!=null&&!text.isBlank(); }
  private static String role(String kind) {
    if(!Set.of("customer","vendor").contains(kind)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Jenis pengguna tidak tersedia");
    return kind;
  }
  private static String verification(String state) {
    return switch(state) { case "terverifikasi"->"Terverifikasi"; case "menunggu"->"Menunggu"; case "ditolak"->"Ditolak"; default->"Belum diverifikasi"; };
  }
  private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
  private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Pengguna tidak ditemukan"); }
  private static ResponseStatusException duplicate() { return new ResponseStatusException(HttpStatus.CONFLICT,"Email sudah terdaftar atau data akun tidak valid"); }
  private static ResponseStatusException linked() { return new ResponseStatusException(HttpStatus.CONFLICT,"Pengguna masih memiliki data terkait (KYC, alat, atau transaksi). Ubah status akun menjadi Nonaktif untuk mempertahankan riwayat"); }
}
