package com.vendoria.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/** Data /akun hanya milik customer aktif yang sedang login; baris pengguna dikunci agar batas jumlah dan "utama" aman dari balapan. */
final class CustomerGuard {
  private CustomerGuard() {}
  /** Mengembalikan nama akun. */
  static String lock(JdbcTemplate jdbc,Long userId) {
    if(userId==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Belum login");
    var rows=jdbc.queryForList("select nama,role,status_akun from pengguna where user_id=? for update",userId);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesi tidak valid");
    var row=rows.getFirst();
    if(!"customer".equals(row.get("role")) || !Pengguna.AKTIF.equals(row.get("status_akun")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Hanya untuk akun customer aktif");
    return (String)row.get("nama");
  }
}
