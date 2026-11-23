package com.vendoria.backend.auth;

import org.springframework.web.bind.annotation.*;

import com.vendoria.backend.auth.AccountSecurityDtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
class AccountSecurityController {
	private final AccountSecurityService service;
	private final EmailOtpService otps;
	private final AuthThrottle throttle;

	AccountSecurityController(AccountSecurityService service, EmailOtpService otps, AuthThrottle throttle) {
		this.service = service;
		this.otps = otps;
		this.throttle = throttle;
	}

	@GetMapping("/api/account/security")
	SecurityResponse get(HttpServletRequest request) { return service.get(request.getSession(false)); }

	@PutMapping("/api/account/security/password")
	Object password(@Valid @RequestBody PasswordRequest body, HttpServletRequest request) {
		throttle.checkIp(request.getRemoteAddr());
		return service.password(request.getSession(false), body);
	}

	@PostMapping("/api/account/security/two-factor")
	OtpResponse configure(@Valid @RequestBody TwoFactorRequest body, HttpServletRequest request) {
		throttle.checkIp(request.getRemoteAddr());
		return service.configure(request.getSession(false), body.enabled());
	}

	@GetMapping("/api/auth/two-factor")
	OtpResponse pending(HttpServletRequest request) { return otps.status(request.getSession(false)); }

	@PostMapping("/api/auth/two-factor/resend")
	OtpResponse resend(HttpServletRequest request) {
		throttle.checkIp(request.getRemoteAddr());
		return otps.resend(request.getSession(false));
	}

	@PostMapping("/api/auth/two-factor/verify")
	VerifiedResponse verify(@Valid @RequestBody OtpRequest body, HttpServletRequest request) {
		throttle.checkIp(request.getRemoteAddr());
		return service.verify(request, body.otp());
	}
}
