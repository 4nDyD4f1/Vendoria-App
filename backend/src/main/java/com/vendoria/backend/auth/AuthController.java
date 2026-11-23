package com.vendoria.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AuthDtos.LoginRequest;
import com.vendoria.backend.auth.AuthDtos.RegisterRequest;
import com.vendoria.backend.auth.AuthDtos.UserResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
class AuthController {

	// Kunci sesi login. Dipakai juga oleh GoogleLoginSuccessHandler agar login Google = sesi yang sama dengan login password.
	static final String SESSION_USER_ID = "user_id";

	private final AuthService service;
	private final AuthThrottle throttle;
	private final AccountSecurityService security;

	AuthController(AuthService service, AuthThrottle throttle, AccountSecurityService security) {
		this.service = service;
		this.throttle = throttle;
		this.security = security;
	}

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	UserResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http) {
		throttle.checkIp(http.getRemoteAddr());
		return service.register(req);
	}

	@PostMapping("/login")
	Object login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
		throttle.checkIp(http.getRemoteAddr());
		UserResponse user = service.login(req);
		return security.startLogin(user.userId(), http);
	}

	@GetMapping("/me")
	UserResponse me(HttpServletRequest http) {
		HttpSession session = http.getSession(false);
		if (session == null || !(session.getAttribute(SESSION_USER_ID) instanceof Long id)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
		}
		try {
			return service.me(id);
		} catch (ResponseStatusException e) { // user sudah dihapus dari DB
			session.invalidate();
			throw e;
		}
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void logout(HttpServletRequest http) {
		HttpSession session = http.getSession(false);
		if (session != null) {
			session.invalidate();
		}
	}
}
