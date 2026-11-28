package com.vendoria.backend.auth;

import jakarta.validation.constraints.*;

final class AdminClaimDtos {
  /** status: ditinjau | disetujui | ditolak | selesai ("diajukan" selalu tampil sebagai "ditinjau"). amount = DP pesanan; compensation = deposit untuk vendor (kerusakan) atau pengembalian ke customer (laporan customer). */
  record Claim(String id, String order, String customer, String vendor, String reason, String date, long amount,
      String status, String note, String decidedBy, String decidedAt, Long compensation,
      String type, String item, Integer units, String response, String photoUrl, String responsePhotoUrl, boolean awaitingReturn, long orderId) {}
  /** units: koreksi jumlah unit (kurang/rusak); amount: nominal pengembalian (hanya jenis lainnya). */
  record Decision(@NotBlank @Pattern(regexp="disetujui|ditolak") String status, @Size(max=2000) String note, @Positive Integer units, @Positive Long amount) {
    Decision { note=note==null?null:note.trim(); }
  }
}
