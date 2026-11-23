package com.vendoria.backend.auth;

import java.nio.charset.StandardCharsets;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AccountSecurityDtos.*;
import com.vendoria.backend.auth.EmailOtpService.Purpose;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Service
class AccountSecurityService {
	private final PenggunaRepository repo;
	private final EmailOtpService otps;
	private final AuthThrottle throttle;
	private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

	AccountSecurityService(PenggunaRepository repo, EmailOtpService otps, AuthThrottle throttle) {
		this.repo = repo;
		this.otps = otps;
		this.throttle = throttle;
	}

	SecurityResponse get(HttpSession session) { return SecurityResponse.from(current(userId(session))); }

	Object password(HttpSession session, PasswordRequest req) {
		Pengguna user = current(userId(session));
		if (!req.password().equals(req.confirmPassword()))
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Konfirmasi password tidak sama");
		if (req.password().getBytes(StandardCharsets.UTF_8).length > 72)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password maksimal 72 byte");
		if (Boolean.TRUE.equals(user.getPasswordDibuat())) {
			throttle.checkAccount(user.getEmail());
			if (req.currentPassword() == null || !encoder.matches(req.currentPassword(), user.getPasswordHash())) {
				throttle.recordFailure(user.getEmail());
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password saat ini salah");
			}
			changePassword(user, encoder.encode(req.password()));
			throttle.recordSuccess(user.getEmail());
			return SecurityResponse.from(current(user.getUserId()));
		}
		// Akun Google baru/tidak diketahui: bukti kepemilikan email sebelum menetapkan password.
		return otps.start(session, user, Purpose.PASSWORD, encoder.encode(req.password()));
	}

	OtpResponse configure(HttpSession session, boolean enabled) {
		Pengguna user = current(userId(session));
		if (user.isTwoFactorEmail() == enabled)
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Pengaturan sudah berubah. Muat ulang halaman");
		return otps.start(session, user, enabled ? Purpose.ENABLE : Purpose.DISABLE, null);
	}

	Object startLogin(Long id, HttpServletRequest request) {
		Pengguna user = current(id);
		HttpSession old = request.getSession(false);
		if (old != null) old.invalidate();
		if (user.isTwoFactorEmail()) {
			HttpSession pending = request.getSession(true);
			pending.setMaxInactiveInterval(600);
			return otps.start(pending, user, Purpose.LOGIN, null);
		}
		return establishSession(user, request);
	}

	VerifiedResponse verify(HttpServletRequest request, String code) {
		HttpSession session = request.getSession(false);
		var challenge = otps.verify(session, code);
		Pengguna user = current(challenge.userId());
		if (!Objects.equals(EmailOtpService.fingerprint(user), challenge.fingerprint())) throw EmailOtpService.invalid();
		if (challenge.purpose() == Purpose.LOGIN) {
			return new VerifiedResponse(establishSession(user, request), destination(user.getRole()));
		}
		if (!Objects.equals(userId(session), user.getUserId())) throw EmailOtpService.invalid();
		if (challenge.purpose() == Purpose.PASSWORD) changePassword(user, challenge.newPasswordHash());
		else if (repo.updateTwoFactor(user.getUserId(), user.getPasswordHash(), AuthService.normalize(user.getEmail()),
				challenge.purpose() == Purpose.ENABLE) != 1) throw EmailOtpService.invalid();
		return new VerifiedResponse(null, "vendor".equals(user.getRole()) ? "/vendor/keamanan" : "/akun/keamanan");
	}

	private AuthDtos.UserResponse establishSession(Pengguna user, HttpServletRequest request) {
		HttpSession old = request.getSession(false);
		if (old != null) old.invalidate();
		HttpSession session = request.getSession(true);
		session.setMaxInactiveInterval(30 * 24 * 60 * 60);
		session.setAttribute(AuthController.SESSION_USER_ID, user.getUserId());
		return AuthDtos.UserResponse.from(user);
	}

	private void changePassword(Pengguna user, String hash) {
		if (repo.changeOwnPassword(user.getUserId(), user.getPasswordHash(), hash) != 1) throw EmailOtpService.invalid();
	}

	private Pengguna current(Long id) {
		if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
		Pengguna user = repo.findById(id).orElseThrow(EmailOtpService::invalid);
		if (!Pengguna.AKTIF.equals(user.getStatusAkun()))
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Akun dinonaktifkan. Hubungi administrator");
		return user;
	}

	static Long userId(HttpSession session) {
		return session != null && session.getAttribute(AuthController.SESSION_USER_ID) instanceof Long id ? id : null;
	}
	static String destination(String role) {
		return "admin".equals(role) ? "/admin" : "vendor".equals(role) ? "/vendor/dashboard" : "/";
	}
}
