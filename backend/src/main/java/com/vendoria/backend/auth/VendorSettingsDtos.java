package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class VendorSettingsDtos {
	private VendorSettingsDtos() {}

	record OwnerRequest(
			@NotBlank(message = "Nama lengkap wajib diisi") @Size(max = 120) String nama,
			@NotBlank(message = "Email wajib diisi") @Email(message = "Format email tidak valid") @Size(max = 255) String email,
			@JsonProperty("no_telp") @NotBlank(message = "Nomor WhatsApp wajib diisi")
			@Pattern(regexp = "\\+?[0-9]{8,15}", message = "Gunakan 8-15 digit angka, boleh diawali +") String noTelp,
			@JsonProperty("nama_vendor") @Size(max = 150, message = "Nama bisnis maksimal 150 karakter") String namaVendor) {
		OwnerRequest {
			nama = trim(nama);
			email = email == null ? null : AuthService.normalize(email);
			noTelp = noTelp == null ? null : noTelp.replaceAll("[\\s()-]", "");
			namaVendor = blank(trim(namaVendor));
		}
	}

	record BusinessRequest(
			@JsonProperty("nama_vendor") @NotBlank(message = "Nama bisnis wajib diisi") @Size(max = 150) String namaVendor,
			@Size(max = 100, message = "Kota maksimal 100 karakter") String kota,
			@Size(max = 2000, message = "Alamat maksimal 2000 karakter") String alamat,
			@Size(max = 10000, message = "Deskripsi maksimal 10000 karakter") String deskripsi) {
		BusinessRequest {
			namaVendor = trim(namaVendor);
			kota = blank(trim(kota));
			alamat = blank(trim(alamat));
			deskripsi = blank(trim(deskripsi));
		}
	}

	record OwnerProfile(
			@JsonProperty("user_id") Long userId,
			String nama,
			String email,
			@JsonProperty("no_telp") String noTelp,
			@JsonProperty("status_verifikasi") String statusVerifikasi,
			@JsonProperty("foto_profil") String fotoProfil,
			@JsonProperty("akun_google") boolean akunGoogle,
			@JsonProperty("two_factor_email") boolean twoFactorEmail,
			@JsonProperty("email_locked") boolean emailLocked,
			@JsonProperty("created_at") Instant createdAt) {}

	record BusinessProfile(
			@JsonProperty("vendor_id") Long vendorId,
			@JsonProperty("nama_vendor") String namaVendor,
			String kota,
			String alamat,
			String deskripsi,
			BigDecimal rating,
			@JsonProperty("status_aktif") boolean statusAktif,
			@JsonProperty("created_at") Instant createdAt) {}

	record SettingsResponse(OwnerProfile owner, BusinessProfile business) {}

	private static String trim(String value) {
		return value == null ? null : value.trim();
	}

	private static String blank(String value) {
		return value == null || value.isBlank() ? null : value;
	}
}
