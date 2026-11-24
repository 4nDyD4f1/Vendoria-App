package com.vendoria.backend.auth;

import jakarta.validation.constraints.*;

final class AdminReportDtos {
  /** status: Selesai | Diproses | Dibatalkan. Tidak ada biaya platform: DB tidak menyimpannya. */
  record Transaction(String id, String date, String customer, String vendor, long total, String status) {}
  /** amount = dana bersih yang ditransfer (gross - fee - claimDeduction). status: menunggu | diproses | berhasil | gagal | dibatalkan. account = nomor lengkap hanya selama masih perlu ditransfer (menunggu/diproses), selebihnya tersamarkan; bank/account/owner null untuk pencairan lama. */
  record Payout(String id, String order, String vendor, long amount, String status, String reference,
      String requestedAt, String paidAt, String processedBy, String bank, String account, String owner,
      long gross, long fee, double feePercent, long claimDeduction) {}
  /** reference (nomor/bukti transfer bank) wajib saat status berhasil. */
  record PayoutDecision(@NotBlank @Pattern(regexp="diproses|berhasil|gagal|dibatalkan") String status, @Size(max=150) String reference) {
    PayoutDecision { reference=reference==null||reference.isBlank()?null:reference.trim(); }
  }
}
