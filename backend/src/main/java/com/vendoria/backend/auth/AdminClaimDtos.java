package com.vendoria.backend.auth;

import jakarta.validation.constraints.*;

final class AdminClaimDtos {
  /** status: ditinjau | disetujui | ditolak | selesai ("diajukan" selalu tampil sebagai "ditinjau"). amount = DP pesanan. */
  record Claim(String id, String order, String customer, String vendor, String reason, String date, long amount,
      String status, String note, String decidedBy, String decidedAt) {}
  record Decision(@NotBlank @Pattern(regexp="disetujui|ditolak") String status, @Size(max=2000) String note) {
    Decision { note=note==null?null:note.trim(); }
  }
}
