package com.vendoria.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/** Pemeriksaan akun vendor aktif untuk dashboard dan notifikasi vendor. */
final class VendorAccess {
  private VendorAccess() {}

  /** Memastikan sesi milik vendor aktif (mengunci barisnya bila lock) dan mengembalikan status_verifikasi akun. */
  static String verification(JdbcTemplate jdbc,Long id,boolean lock) {
    if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var users=jdbc.queryForList("select role,status_akun,status_verifikasi from pengguna where user_id=?"+(lock?" for update":""),id);
    if(users.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    if(!"vendor".equals(users.getFirst().get("role")) || !Pengguna.AKTIF.equals(users.getFirst().get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk akun vendor aktif");
    return (String)users.getFirst().get("status_verifikasi");
  }
  static String verification(JdbcTemplate jdbc,Long id) { return verification(jdbc,id,false); }

  /** vendor_id akun ini; null bila profil bisnis belum dibuat. */
  static Long vendorId(JdbcTemplate jdbc,Long userId) {
    var rows=jdbc.queryForList("select vendor_id from vendor where user_id=?",Long.class,userId);
    return rows.isEmpty()?null:rows.getFirst();
  }
}
