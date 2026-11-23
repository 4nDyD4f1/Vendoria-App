package com.vendoria.backend.auth;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class KycDtos {
	private KycDtos() {}

	record Identity(@NotBlank @Size(max = 120) String nama,
			@NotBlank @Pattern(regexp = "[0-9]{16}", message = "NIK harus 16 digit") String nik,
			@JsonProperty("tempat_lahir") @NotBlank @Size(max = 120) String tempatLahir,
			@JsonProperty("tanggal_lahir") @NotBlank @Size(max = 10) String tanggalLahir,
			@NotBlank @Size(max = 2000) String alamat, boolean consent) {
		Identity {
			nama = nama == null ? null : nama.trim();
			tempatLahir = tempatLahir == null ? null : tempatLahir.trim();
			alamat = alamat == null ? null : alamat.trim();
		}
		@Override public String toString() { return "Identity[REDACTED]"; }
	}

	record Decision(@NotBlank @Pattern(regexp = "terverifikasi|ditolak") String status,
			@JsonProperty("catatan_admin") @Size(max = 2000) String catatanAdmin) {}

	record Summary(@JsonProperty("kyc_id") Long kycId, @JsonProperty("user_id") Long userId,
			String nama, String email, @JsonProperty("no_telp") String noTelp, String role, String status,
			@JsonProperty("diajukan_pada") Instant diajukanPada, @JsonProperty("diputuskan_pada") Instant diputuskanPada) {}

	record Detail(Summary submission, Identity identity, @JsonProperty("catatan_admin") String catatanAdmin,
			@JsonProperty("nama_pemeriksa") String namaPemeriksa, @JsonProperty("documents_available") boolean documentsAvailable,
			@JsonProperty("ktp_url") String ktpUrl, @JsonProperty("selfie_url") String selfieUrl) {}

	record Mine(@JsonProperty("status_verifikasi") String statusVerifikasi, Detail latest) {}
	record Listing(List<Summary> items, long total, int page, int size, Map<String, Long> counts) {}
	// Metadata identitas disimpan terenkripsi bersama dokumen privat; tidak memerlukan kolom baru.
	record StoredIdentity(Identity identity, String consentAt) {
		@Override public String toString() { return "StoredIdentity[REDACTED]"; }
	}
}
