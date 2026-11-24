package com.vendoria.backend.auth;

import java.util.List;

final class AdminDashboardDtos {
  /** gmv30 = nilai sewa pesanan 30 hari terakhir (tanpa yang dibatalkan); escrow = DP terverifikasi dari pesanan yang belum selesai/dibatalkan. */
  record Summary(long gmv30, long escrow, List<Week> weekly, List<Recent> recent, Health health) {}
  /** label: M-7 .. M-1, Ini (minggu berjalan). total = nilai sewa (Rp). */
  record Week(String label, long total, int count) {}
  record Recent(String id, String customer, String vendor, long total, String status) {}
  /** Nilai null = belum ada data untuk dihitung. disputeRate dalam persen. */
  record Health(Double disputeRate, Double depositReleaseHours, Double rating, int reviews) {}
}
