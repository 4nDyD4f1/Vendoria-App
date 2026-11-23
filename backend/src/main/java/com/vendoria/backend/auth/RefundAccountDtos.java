package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import jakarta.validation.constraints.*;

final class RefundAccountDtos {
  record Input(@NotBlank @Pattern(regexp="BCA|Mandiri|BRI|BNI",message="Pilih BCA, Mandiri, BRI, atau BNI") String bank,
      @NotBlank @Pattern(regexp="[0-9]{8,20}",message="Nomor rekening 8-20 digit angka") String number,
      @NotBlank @Size(max=120) String owner) {
    Input { number=number==null?null:number.replaceAll("[\\s-]",""); owner=owner==null?null:owner.trim(); }
    @Override public String toString() { return "RefundAccountInput[REDACTED]"; }
  }
  /** Nomor lengkap tidak pernah dikirim kembali ke browser; hanya bentuk tersamarkan. */
  record Account(String id, String bank, String masked, String owner, boolean primary) {}
  record Refund(String id, String orderCode, BigDecimal amount, String status, String reason, OffsetDateTime requestedAt, OffsetDateTime refundedAt) {}
}
