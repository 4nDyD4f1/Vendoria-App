package com.vendoria.backend.auth;

import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AuthDtos.LoginRequest;
import com.vendoria.backend.auth.AuthDtos.RegisterRequest;
import com.vendoria.backend.auth.AuthDtos.UserResponse;

@Service
class AuthService {

	private final PenggunaRepository repo;
	private final PasswordEncoder encoder = new BCryptPasswordEncoder();
	// dipakai saat email tak ditemukan, agar waktu respons login tidak membocorkan email mana yang terdaftar
	private final String dummyHash = encoder.encode("timing-equalizer");

	private final AuthThrottle throttle;

	AuthService(PenggunaRepository repo, AuthThrottle throttle) {
		this.repo = repo;
		this.throttle = throttle;
	}

	UserResponse register(RegisterRequest req) {
		String email = normalize(req.email());
		if (repo.findByEmail(email).isPresent()) {
			throw emailTerpakai();
		}
		Pengguna p = new Pengguna(req.nama().trim(), email, req.noTelp(), encoder.encode(req.password()), req.role());
		try {
			return UserResponse.from(repo.saveAndFlush(p));
		} catch (DataIntegrityViolationException e) { // dua pendaftar bersamaan dengan email sama
			throw emailTerpakai();
		}
	}

	UserResponse login(LoginRequest req) {
		String email = normalize(req.email());
		throttle.checkAccount(email); // sama untuk email yang tak terdaftar, agar tak bisa dipakai menebak email
		Pengguna p = repo.findByEmail(email).orElse(null);
		boolean cocok = encoder.matches(req.password(), p == null ? dummyHash : p.getPasswordHash());
		if (p == null || !cocok) {
			throttle.recordFailure(email);
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email atau kata sandi salah");
		}
		throttle.recordSuccess(email);
		if (!Pengguna.AKTIF.equals(p.getStatusAkun())) { // dicek setelah kata sandi benar: tak membocorkan email terdaftar
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Akun dinonaktifkan. Hubungi administrator");
		}
		return UserResponse.from(p);
	}

	UserResponse me(Long userId) {
		return repo.findById(userId).map(UserResponse::from)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid"));
	}

	static String normalize(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private static ResponseStatusException emailTerpakai() {
		return new ResponseStatusException(HttpStatus.CONFLICT, "Email sudah terdaftar");
	}
}
