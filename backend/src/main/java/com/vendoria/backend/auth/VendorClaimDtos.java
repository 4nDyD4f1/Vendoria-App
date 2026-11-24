package com.vendoria.backend.auth;

import jakarta.validation.constraints.*;

final class VendorClaimDtos {
  /** status: diajukan | ditinjau | disetujui | ditolak | selesai. next = status berikutnya yang boleh diset vendor (null = tidak ada). amount = DP pesanan. */
  record Claim(String id, String order, String customer, String reason, String date, long amount,
      String status, String note, String decidedAt, String next) {}
  /** from = status yang dilihat vendor; ditolak bila sudah berubah (mis. admin baru memutuskan). */
  record Advance(@NotBlank @Pattern(regexp="diajukan|ditinjau|disetujui|ditolak|selesai") String from) {}
}
