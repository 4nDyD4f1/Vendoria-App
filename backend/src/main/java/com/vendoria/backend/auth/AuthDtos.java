package com.vendoria.backend.auth;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class AuthDtos {

	private AuthDtos() {
	}

	record RegisterRequest(
			@NotBlank @Pattern(regexp = "customer|vendor", message = "harus 'customer' atau 'vendor'") String role,
			@NotBlank @Size(max = 120) String nama,
			@NotBlank @Email @Size(max = 255) String email,
			@JsonProperty("no_telp") @NotBlank @Pattern(regexp = "\\+?[0-9]{8,15}", message = "harus 8-15 digit angka, boleh diawali +") String noTelp,
			// batas 72 = batas BCrypt
			@NotBlank @Size(min = 8, max = 72) String password) {
	}

	record LoginRequest(@NotBlank String email, @NotBlank String password) {
	}

	record ForgotRequest(@NotBlank @Email @Size(max = 255) String email) {
	}

	record VerifyOtpRequest(
			@NotBlank @Email @Size(max = 255) String email,
			@NotBlank @Pattern(regexp = "\\d{6}", message = "harus 6 digit angka") String otp) {
	}

	record ResetRequest(
			@JsonProperty("reset_token") @NotBlank @Size(max = 100) String resetToken,
			@NotBlank @Size(min = 8, max = 72) String password) {
	}

	// password: wajib saat menambah, kosong (null) saat mengedit = kata sandi tidak diubah
	record AdministratorRequest(
			@NotBlank @Size(max = 120) String nama,
			@NotBlank @Email @Size(max = 255) String email,
			@NotBlank @Pattern(regexp = "Aktif|Nonaktif", message = "harus Aktif atau Nonaktif") String status,
			@Size(max = 2000) String catatan,
			@Size(min = 8, max = 72) String password) {
	}

	record AdministratorResponse(
			@JsonProperty("user_id") Long userId,
			String nama,
			String email,
			String status,
			String catatan,
			@JsonProperty("created_at") Instant createdAt) {

		static AdministratorResponse from(Pengguna p) {
			return new AdministratorResponse(p.getUserId(), p.getNama(), p.getEmail(),
					p.getStatusAkun(), p.getCatatanAdmin(), p.getCreatedAt());
		}
	}

	record MessageResponse(String message) {
	}

	record ResetTokenResponse(@JsonProperty("reset_token") String resetToken) {
	}

	record UserResponse(
			@JsonProperty("user_id") Long userId,
			String nama,
			String email,
			@JsonProperty("no_telp") String noTelp,
			String role,
			@JsonProperty("status_verifikasi") String statusVerifikasi,
			@JsonProperty("foto_profil") String fotoProfil,
			@JsonProperty("created_at") Instant createdAt,
			// true bila akun tertaut Google (google_sub terisi): email dikelola Google, tak boleh diubah di sini
			@JsonProperty("akun_google") boolean akunGoogle) {

		static UserResponse from(Pengguna p) {
			return new UserResponse(p.getUserId(), p.getNama(), p.getEmail(), p.getNoTelp(), p.getRole(),
					p.getStatusVerifikasi(), p.getFotoProfil(), p.getCreatedAt(),
					p.getGoogleSub() != null);
		}
	}
}
