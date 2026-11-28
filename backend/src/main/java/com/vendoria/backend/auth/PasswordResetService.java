package com.vendoria.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.TooManyRequestsException;

/**
 * Lupa password: email -> OTP 6 digit (email) -> reset token sekali pakai -> password baru.
 * Semua state di memori (tanpa tabel baru di db_vendoria).
 * shortcut: memori satu instance, hilang saat restart & tidak dibagi antar server; pindah ke tabel/Redis bila di-scale.
 */
@Service
class PasswordResetService {

	static final long OTP_TTL_MS = 10 * 60_000;
	static final long RESEND_COOLDOWN_MS = 60_000;
	static final long GRANT_TTL_MS = 10 * 60_000;
	static final long HOUR_MS = 60 * 60_000;
	static final int MAX_ATTEMPTS = 5;
	static final int MAX_SENDS_PER_HOUR = 5;
	private static final int PURGE_ABOVE = 10_000;

	private record Otp(String code, long expiresAt, int attempts, long sentAt) {
	}

	private record Sends(long windowStart, int count) {
	}

	private record Grant(String email, long expiresAt) {
	}

	private final Map<String, Otp> otps = new ConcurrentHashMap<>();
	private final Map<String, Sends> sends = new ConcurrentHashMap<>();
	private final Map<String, Grant> grants = new ConcurrentHashMap<>();

	private final PenggunaRepository repo;
	private final ResendMailer mailer;
	private final AuthThrottle throttle;
	private final LongSupplier nowMillis;
	private final PasswordEncoder encoder = new BCryptPasswordEncoder();
	private final SecureRandom random = new SecureRandom();

	@Autowired
	PasswordResetService(PenggunaRepository repo, ResendMailer mailer, AuthThrottle throttle) {
		this(repo, mailer, throttle, System::currentTimeMillis);
	}

	PasswordResetService(PenggunaRepository repo, ResendMailer mailer, AuthThrottle throttle, LongSupplier nowMillis) {
		this.repo = repo;
		this.mailer = mailer;
		this.throttle = throttle;
		this.nowMillis = nowMillis;
	}

	/** Email harus terdaftar (sesuai kebutuhan produk), kalau tidak 404. */
	void requestOtp(String rawEmail) {
		String email = AuthService.normalize(rawEmail);
		// Email tak terdaftar diperlakukan sama (jeda dan kuota ikut dihitung) agar tak bisa dipakai menebak akun.
		Pengguna p = repo.findByEmail(email).orElse(null);
		long now = nowMillis.getAsLong();

		Otp prev = otps.get(email);
		if (prev != null && now - prev.sentAt < RESEND_COOLDOWN_MS) {
			throw new TooManyRequestsException(seconds(prev.sentAt + RESEND_COOLDOWN_MS - now));
		}
		Sends s = sends.compute(email, (k, old) -> old == null || now - old.windowStart >= HOUR_MS
				? new Sends(now, 1)
				: new Sends(old.windowStart, old.count + 1));
		if (s.count > MAX_SENDS_PER_HOUR) {
			throw new TooManyRequestsException(seconds(s.windowStart + HOUR_MS - now));
		}

		String code = String.format("%06d", random.nextInt(1_000_000));
		otps.put(email, new Otp(code, now + OTP_TTL_MS, 0, now));
		if (p == null) return;
		try {
			mailer.sendOtp(p.getEmail(), code, UUID.randomUUID().toString());
		} catch (RuntimeException e) {
			otps.remove(email); // gagal kirim: jangan simpan kode yang tak sampai & jangan tahan user dengan cooldown
			throw e;
		}
	}

	/** Menukar OTP yang benar dengan reset token (sekali pakai). */
	String verifyOtp(String rawEmail, String code) {
		String email = AuthService.normalize(rawEmail);
		long now = nowMillis.getAsLong();
		boolean[] benar = { false };
		otps.compute(email, (k, o) -> {
			if (o == null || o.expiresAt <= now) {
				return null;
			}
			if (MessageDigest.isEqual(o.code.getBytes(StandardCharsets.UTF_8), code.getBytes(StandardCharsets.UTF_8))) {
				benar[0] = true;
				return null; // OTP sekali pakai
			}
			return o.attempts + 1 >= MAX_ATTEMPTS ? null : new Otp(o.code, o.expiresAt, o.attempts + 1, o.sentAt);
		});
		if (!benar[0]) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kode OTP salah atau sudah kedaluwarsa");
		}
		if (grants.size() > PURGE_ABOVE) {
			grants.values().removeIf(g -> g.expiresAt <= now);
		}
		byte[] raw = new byte[32];
		random.nextBytes(raw);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
		grants.put(token, new Grant(email, now + GRANT_TTL_MS));
		return token;
	}

	void resetPassword(String token, String newPassword) {
		Grant g = grants.remove(token); // sekali pakai
		if (g == null || g.expiresAt <= nowMillis.getAsLong()) {
			throw sesiTidakValid();
		}
		Pengguna p = repo.findByEmail(g.email).orElseThrow(PasswordResetService::sesiTidakValid);
		repo.updatePassword(p.getUserId(), encoder.encode(newPassword));
		throttle.recordSuccess(g.email); // cabut penundaan login akibat salah-password sebelumnya
	}

	private static ResponseStatusException sesiTidakValid() {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST,
				"Sesi reset kata sandi tidak valid atau sudah kedaluwarsa. Ulangi dari awal.");
	}

	private static long seconds(long millis) {
		return Math.max(1, (millis + 999) / 1000);
	}
}
