package com.vendoria.backend.auth;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class ProfileDtos {

	private ProfileDtos() {
	}

	record ProfileRequest(
			@NotBlank(message = "Nama wajib diisi") @Size(max = 120) String nama,
			@NotBlank(message = "Email wajib diisi") @Email(message = "Format email tidak valid") @Size(max = 255) String email,
			@JsonProperty("no_telp") @NotBlank(message = "Nomor WhatsApp wajib diisi")
			@Pattern(regexp = "\\+?[0-9]{8,15}", message = "Gunakan 8-15 digit angka, boleh diawali +") String noTelp) {

		ProfileRequest {
			nama = nama == null ? null : nama.trim();
			email = email == null ? null : AuthService.normalize(email);
			noTelp = noTelp == null ? null : noTelp.replaceAll("[\\s()-]", "");
		}
	}
}
