package com.vendoria.backend.auth;

final class AdminReportDtos {
  /** status: Selesai | Diproses | Dibatalkan. Tidak ada biaya platform: DB tidak menyimpannya. */
  record Transaction(String id, String date, String customer, String vendor, long total, String status) {}
  /** status: menunggu | diproses | berhasil | gagal | dibatalkan. DB tidak menyimpan rekening tujuan vendor. */
  record Payout(String id, String order, String vendor, long amount, String status, String reference,
      String requestedAt, String paidAt, String processedBy) {}
}
