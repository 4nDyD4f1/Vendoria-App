package com.vendoria.backend.auth;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vendoria.backend.auth.AuthDtos.ForgotRequest;
import com.vendoria.backend.auth.AuthDtos.MessageResponse;
import com.vendoria.backend.auth.AuthDtos.ResetRequest;
import com.vendoria.backend.auth.AuthDtos.ResetTokenResponse;
import com.vendoria.backend.auth.AuthDtos.VerifyOtpRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
class PasswordResetController {

	private final PasswordResetService service;
	private final AuthThrottle throttle;

	PasswordResetController(PasswordResetService service, AuthThrottle throttle) {
		this.service = service;
		this.throttle = throttle;
	}

	@PostMapping("/forgot-password")
	MessageResponse forgotPassword(@Valid @RequestBody ForgotRequest req, HttpServletRequest http) {
		throttle.checkIp(http.getRemoteAddr());
		service.requestOtp(req.email());
		return new MessageResponse("Jika email terdaftar, kode verifikasi sudah dikirim");
	}

	@PostMapping("/verify-otp")
	ResetTokenResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest req, HttpServletRequest http) {
		throttle.checkIp(http.getRemoteAddr());
		return new ResetTokenResponse(service.verifyOtp(req.email(), req.otp()));
	}

	@PostMapping("/reset-password")
	MessageResponse resetPassword(@Valid @RequestBody ResetRequest req, HttpServletRequest http) {
		throttle.checkIp(http.getRemoteAddr());
		service.resetPassword(req.resetToken(), req.password());
		return new MessageResponse("Kata sandi berhasil diubah");
	}
}
