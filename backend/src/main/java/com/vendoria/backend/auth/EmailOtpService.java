package com.vendoria.backend.auth;

import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.TooManyRequestsException;
import com.vendoria.backend.auth.AccountSecurityDtos.OtpResponse;
import jakarta.servlet.http.HttpSession;

/** OTP keamanan terikat sesi, akun, email, versi password, dan tujuan. Terpisah dari reset password. */
@Service
class EmailOtpService {
	static final long TTL_MS = 600_000;
	static final long COOLDOWN_MS = 60_000;
	static final long HOUR_MS = 3_600_000;
	static final int MAX_ATTEMPTS = 5;
	private static final String KEY = EmailOtpService.class.getName();

	enum Purpose {
		LOGIN("menyelesaikan login"), PASSWORD("membuat password"),
		ENABLE("mengaktifkan autentikasi 2 langkah"), DISABLE("menonaktifkan autentikasi 2 langkah");
		final String instruction;
		Purpose(String instruction) { this.instruction = instruction; }
	}

	record Challenge(String id, Long userId, String email, String fingerprint, Purpose purpose,
			String codeHash, long expiresAt, long resendAfter, int attempts, String newPasswordHash) implements Serializable {}
	private record Sends(long windowStart, long lastSent, int count) {}

	private final ResendMailer mailer;
	private final LongSupplier now;
	private final SecureRandom random = new SecureRandom();
	private final Map<Long, Sends> sends = new ConcurrentHashMap<>();

	@Autowired
	EmailOtpService(ResendMailer mailer) { this(mailer, System::currentTimeMillis); }
	EmailOtpService(ResendMailer mailer, LongSupplier now) { this.mailer = mailer; this.now = now; }

	OtpResponse start(HttpSession session, Pengguna user, Purpose purpose, String newPasswordHash) {
		synchronized (session) {
			session.removeAttribute(KEY);
			long time = now.getAsLong();
			Challenge challenge = new Challenge(UUID.randomUUID().toString(), user.getUserId(), user.getEmail(),
					fingerprint(user), purpose, null, time + TTL_MS, 0, 0, newPasswordHash);
			return send(session, challenge);
		}
	}

	OtpResponse status(HttpSession session) {
		return response(current(session));
	}

	OtpResponse resend(HttpSession session) {
		if (session == null) throw invalid();
		synchronized (session) {
			return send(session, current(session));
		}
	}

	Challenge verify(HttpSession session, String code) {
		if (session == null) throw invalid();
		synchronized (session) {
			Challenge challenge = current(session);
			if (!MessageDigest.isEqual(challenge.codeHash.getBytes(StandardCharsets.UTF_8),
					digest(challenge.id + ":" + code).getBytes(StandardCharsets.UTF_8))) {
				int attempts = challenge.attempts + 1;
				if (attempts >= MAX_ATTEMPTS) session.removeAttribute(KEY);
				else session.setAttribute(KEY, new Challenge(challenge.id, challenge.userId, challenge.email,
						challenge.fingerprint, challenge.purpose, challenge.codeHash, challenge.expiresAt,
						challenge.resendAfter, attempts, challenge.newPasswordHash));
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kode OTP salah atau sudah kedaluwarsa");
			}
			session.removeAttribute(KEY); // hanya satu request yang dapat menukar OTP ini
			return challenge;
		}
	}

	private OtpResponse send(HttpSession session, Challenge challenge) {
		long time = now.getAsLong();
		if (challenge.resendAfter > time) throw new TooManyRequestsException(seconds(challenge.resendAfter - time));
		Sends[] previous = { null };
		Sends booked = sends.compute(challenge.userId, (id, old) -> {
			previous[0] = old;
			if (old != null && time - old.lastSent < COOLDOWN_MS)
				throw new TooManyRequestsException(seconds(old.lastSent + COOLDOWN_MS - time));
			if (old != null && time - old.windowStart < HOUR_MS && old.count >= 5)
				throw new TooManyRequestsException(seconds(old.windowStart + HOUR_MS - time));
			return old == null || time - old.windowStart >= HOUR_MS ? new Sends(time, time, 1)
					: new Sends(old.windowStart, time, old.count + 1);
		});
		String code = String.format(java.util.Locale.ROOT, "%06d", random.nextInt(1_000_000));
		try {
			mailer.sendSecurityOtp(challenge.email, code, UUID.randomUUID().toString(), challenge.purpose.instruction);
		} catch (RuntimeException e) {
			sends.compute(challenge.userId, (id, value) -> value == booked ? previous[0] : value);
			throw e;
		}
		Challenge sent = new Challenge(challenge.id, challenge.userId, challenge.email, challenge.fingerprint,
				challenge.purpose, digest(challenge.id + ":" + code), challenge.expiresAt,
				time + COOLDOWN_MS, challenge.attempts, challenge.newPasswordHash);
		session.setAttribute(KEY, sent);
		if (sends.size() > 10_000) sends.values().removeIf(value -> time - value.windowStart >= HOUR_MS);
		return response(sent);
	}

	private Challenge current(HttpSession session) {
		if (session == null || !(session.getAttribute(KEY) instanceof Challenge challenge)) throw invalid();
		if (challenge.expiresAt <= now.getAsLong()) {
			session.removeAttribute(KEY);
			throw invalid();
		}
		return challenge;
	}

	private OtpResponse response(Challenge challenge) {
		return new OtpResponse(true, challenge.email, challenge.purpose.name().toLowerCase(java.util.Locale.ROOT),
				Instant.ofEpochMilli(challenge.expiresAt), Instant.ofEpochMilli(challenge.resendAfter));
	}

	static String fingerprint(Pengguna user) {
		return digest(user.getUserId() + ":" + user.getEmail() + ":" + user.getPasswordHash());
	}

	private static String digest(String value) {
		try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
		catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
	}

	private static long seconds(long millis) { return Math.max(1, (millis + 999) / 1000); }
	static ResponseStatusException invalid() {
		return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi verifikasi tidak valid atau kedaluwarsa. Ulangi dari awal");
	}
}
