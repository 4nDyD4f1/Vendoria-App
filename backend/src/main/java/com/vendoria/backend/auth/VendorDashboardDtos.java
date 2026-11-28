package com.vendoria.backend.auth;

import java.util.List;
import jakarta.validation.constraints.*;
import com.vendoria.backend.auth.VendorPayoutDtos.Available;

final class VendorDashboardDtos {
  /**
   * business = nama bisnis (null bila profil bisnis belum dibuat). verification = pengguna.status_verifikasi.
   * newOrders = menunggu_konfirmasi, ongoing = berjalan, toHandover = dikonfirmasi, toInspect = dikembalikan, openClaims = klaim diajukan/ditinjau.
   * payout = dana siap dicairkan (sama dengan halaman Pencairan). rating = rata-rata ulasan (null bila belum ada).
   * weekly = nilai sewa pesanan selesai per minggu (menurut tanggal selesai sewa), 8 minggu, yang terlama lebih dulu.
   */
  record Summary(String business, String verification, int newOrders, int ongoing, int toHandover, int toInspect, int openClaims,
      Available payout, Double rating, int reviews, int completed, List<Long> weekly) {}

  /** id = kunci ('pesanan:12:konfirmasi', 'klaim:3:buka', 'pencairan:7:berhasil'); path = halaman vendor tujuan; createdAt = ISO. */
  record Notification(String id, String title, String body, String createdAt, String path, boolean read) {}
  record Ids(@NotEmpty @Size(max=100) List<@NotBlank @Pattern(regexp="(pesanan|klaim|pencairan|kyc):[0-9]{1,18}:[a-z]{3,10}") String> ids) {}
}
