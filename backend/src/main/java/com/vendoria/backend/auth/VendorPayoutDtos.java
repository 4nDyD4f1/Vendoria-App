package com.vendoria.backend.auth;

import java.util.List;
import jakarta.validation.constraints.*;

final class VendorPayoutDtos {
  record AccountInput(@NotBlank @Pattern(regexp="BCA|Mandiri|BRI|BNI",message="Pilih BCA, Mandiri, BRI, atau BNI") String bank,
      @NotBlank @Pattern(regexp="[0-9]{8,20}",message="Nomor rekening 8-20 digit angka") String number,
      @NotBlank @Size(max=120) String owner) {
    AccountInput { number=number==null?null:number.replaceAll("[\\s-]",""); owner=owner==null?null:owner.trim(); }
    @Override public String toString() { return "VendorPayoutAccountInput[REDACTED]"; }
  }
  /** Nomor lengkap tidak pernah dikirim kembali ke browser; hanya bentuk tersamarkan. */
  record Account(String bank, String masked, String owner) {}
  /** business=false: profil bisnis (baris vendor) belum dibuat, rekening belum bisa ditautkan. */
  record AccountState(boolean business, Account account) {}

  /** amount = dana bersih yang ditransfer. status: menunggu | diproses | berhasil | gagal | dibatalkan. bank/account/owner null untuk pencairan lama. */
  record Payout(String id, String order, long amount, String status, String bank, String account, String owner,
      String reference, String requestedAt, String paidAt, long gross, long fee, double feePercent, long claimDeduction) {}
  /** Dana yang bisa diajukan: pesanan selesai, tanpa klaim aktif, belum punya pencairan berlaku. amount = bersih (gross - fee - claimDeduction); pesanan yang bersihnya <= 0 tidak ikut. */
  record Available(long amount, int orders, long gross, long fee, long claimDeduction, double feePercent) {}
  record Listing(AccountState account, Available available, List<Payout> items) {}
  record Requested(int orders, long amount) {}
}
