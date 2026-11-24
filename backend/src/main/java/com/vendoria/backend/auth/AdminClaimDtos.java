package com.vendoria.backend.auth;

import jakarta.validation.constraints.*;

final class AdminClaimDtos {
  /** status: ditinjau | disetujui | ditolak | selesai ("diajukan" selalu tampil sebagai "ditinjau"). amount = DP pesanan; compensation = ganti rugi yang disetujui (null bila belum/ditolak). */
  record Claim(String id, String order, String customer, String vendor, String reason, String date, long amount,
      String status, String note, String decidedBy, String decidedAt, Long compensation) {}
  /** amount (Rp) = ganti rugi untuk customer, wajib saat disetujui; dipotong dari pencairan vendor atas pesanan itu. */
  record Decision(@NotBlank @Pattern(regexp="disetujui|ditolak") String status, @Size(max=2000) String note, @Positive Long amount) {
    Decision { note=note==null?null:note.trim(); }
  }
}
