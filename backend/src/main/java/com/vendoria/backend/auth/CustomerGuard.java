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

  /** KYC decisions use the same user-row lock, so verification cannot change during checkout/payment. */
  static void lockVerified(JdbcTemplate jdbc, Long userId) {
    lock(jdbc, userId);
    String status = jdbc.queryForObject("select status_verifikasi from pengguna where user_id=?", String.class, userId);
    if (!"terverifikasi".equals(status)) throw new KycRequiredException(status == null ? "belum_diverifikasi" : status);
  }
}
