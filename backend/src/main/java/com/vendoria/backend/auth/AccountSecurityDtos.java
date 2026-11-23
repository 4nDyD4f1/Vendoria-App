package com.vendoria.backend.auth;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class AccountSecurityDtos {
	private AccountSecurityDtos() {}

	record SecurityResponse(@JsonProperty("password_dibuat") Boolean passwordDibuat,
			@JsonProperty("two_factor_email") boolean twoFactorEmail, String email) {
		static SecurityResponse from(Pengguna user) {
			return new SecurityResponse(user.getPasswordDibuat(), user.isTwoFactorEmail(), user.getEmail());
		}
	}

	record PasswordRequest(
			@JsonProperty("current_password") @Size(max = 72) String currentPassword,
			@NotBlank @Size(min = 8, max = 72) String password,
			@JsonProperty("confirm_password") @NotBlank @Size(min = 8, max = 72) String confirmPassword) {
		@Override public String toString() { return "PasswordRequest[REDACTED]"; }
	}

	record TwoFactorRequest(@NotNull Boolean enabled) {}
	record OtpRequest(@NotBlank @Pattern(regexp = "[0-9]{6}") String otp) {
		@Override public String toString() { return "OtpRequest[REDACTED]"; }
	}

	record OtpResponse(@JsonProperty("two_factor_required") boolean twoFactorRequired, String email,
			String purpose, @JsonProperty("expires_at") Instant expiresAt,
			@JsonProperty("resend_after") Instant resendAfter) {}

	record VerifiedResponse(AuthDtos.UserResponse user, String redirect) {}
}
