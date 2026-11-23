package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class VendorOrdersDtos {
	private VendorOrdersDtos() {}

	record Setup(@NotBlank @Size(max = 150) String name) {
		Setup { name = name == null ? null : name.trim(); }
	}

	record ActionRequest(
			@NotBlank @Pattern(regexp = "proses|batalkan", message = "Aksi tidak valid") String action,
			@Size(max = 1000, message = "Catatan maksimal 1000 karakter") String catatan,
			@JsonProperty("expected_status") @Size(max = 25) String expectedStatus) {
		ActionRequest {
			catatan = catatan == null ? null : catatan.trim();
			expectedStatus = expectedStatus == null || expectedStatus.isBlank() ? null : expectedStatus.trim();
		}
	}

	record VendorInfo(String id, String name, boolean active) {}

	record Summary(
			@JsonProperty("order_id") Long orderId,
			@JsonProperty("kode_pemesanan") String kodePemesanan,
			@JsonProperty("customer_name") String customerName,
			@JsonProperty("customer_email") String customerEmail,
			@JsonProperty("customer_phone") String customerPhone,
			@JsonProperty("equipment_summary") String equipmentSummary,
			@JsonProperty("item_count") int itemCount,
			@JsonProperty("tanggal_mulai_sewa") LocalDate tanggalMulaiSewa,
			@JsonProperty("tanggal_selesai_sewa") LocalDate tanggalSelesaiSewa,
			@JsonProperty("lokasi_acara") String lokasiAcara,
			@JsonProperty("total_biaya_sewa") BigDecimal totalBiayaSewa,
			@JsonProperty("total_dp") BigDecimal totalDp,
			@JsonProperty("status_pesanan") String statusPesanan,
			@JsonProperty("tanggal_pemesanan") Instant tanggalPemesanan,
			@JsonProperty("has_open_claim") boolean hasOpenClaim,
			@JsonProperty("can_process") boolean canProcess,
			@JsonProperty("can_cancel") boolean canCancel,
			@JsonProperty("next_status") String nextStatus,
			@JsonProperty("next_action_label") String nextActionLabel) {}

	record Listing(
			VendorInfo vendor,
			List<Summary> items,
			long total,
			int page,
			int size,
			Map<String, Long> counts) {}

	record OrderItem(
			@JsonProperty("order_detail_id") Long orderDetailId,
			@JsonProperty("item_id") Long itemId,
			@JsonProperty("nama_barang") String namaBarang,
			@JsonProperty("nama_kategori") String namaKategori,
			@JsonProperty("jumlah_sewa") int jumlahSewa,
			@JsonProperty("harga_saat_sewa") BigDecimal hargaSaatSewa,
			BigDecimal subtotal) {}

	record PaymentRecord(
			@JsonProperty("pembayaran_id") Long pembayaranId,
			String jenis,
			String metode,
			BigDecimal jumlah,
			String status,
			@JsonProperty("dibayar_pada") Instant dibayarPada,
			@JsonProperty("diverifikasi_pada") Instant diverifikasiPada,
			@JsonProperty("dibuat_pada") Instant dibuatPada) {}

	record ClaimRecord(
			@JsonProperty("klaim_id") Long klaimId,
			String alasan,
			String status,
			@JsonProperty("diajukan_pada") Instant diajukanPada,
			@JsonProperty("diputuskan_pada") Instant diputuskanPada) {}

	record StatusHistory(
			@JsonProperty("riwayat_id") Long riwayatId,
			@JsonProperty("status_sebelumnya") String statusSebelumnya,
			@JsonProperty("status_baru") String statusBaru,
			@JsonProperty("diubah_oleh") String diubahOleh,
			String catatan,
			@JsonProperty("diubah_pada") Instant diubahPada) {}

	record Detail(
			Summary order,
			@JsonProperty("customer_verification") String customerVerification,
			@JsonProperty("verified_payment_total") BigDecimal verifiedPaymentTotal,
			List<OrderItem> items,
			List<PaymentRecord> payments,
			List<ClaimRecord> claims,
			List<StatusHistory> history) {}
}
