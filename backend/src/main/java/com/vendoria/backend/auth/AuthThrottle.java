package com.vendoria.backend.auth;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.vendoria.backend.TooManyRequestsException;

/**
 * Pembatas percobaan auth, disimpan di memori.
 * - Per IP: maks {@value #IP_MAX} request / menit (jendela tetap).
 * - Per akun (email): {@value #FREE_FAILS} gagal pertama gratis, lalu tunggu 2s, 4s, 8s, ... maks 5 menit.
 *   Akun TIDAK dikunci permanen; penundaan hilang saat login berhasil atau setelah 30 menit tanpa percobaan.
 * shortcut: memori satu instance, hilang saat restart & tidak dibagi antar server; pindah ke Redis/DB bila di-scale.
 */
@Component
class AuthThrottle {

	static final int IP_MAX = 20;
	static final long IP_WINDOW_MS = 60_000;
	static final int FREE_FAILS = 2;
	static final long BASE_DELAY_MS = 2_000;
	static final long MAX_DELAY_MS = 300_000;
	static final long FAIL_MEMORY_MS = 30 * 60_000;
	private static final int PURGE_ABOVE = 10_000;

	private record Window(long start, int count) {
	}

	private record Fails(int count, long lockedUntil, long last) {
	}

	private final Map<String, Window> ips = new ConcurrentHashMap<>();
	private final Map<String, Fails> accounts = new ConcurrentHashMap<>();
	private final LongSupplier nowMillis;

	@Autowired
	AuthThrottle() {
		this(System::currentTimeMillis);
	}

	AuthThrottle(LongSupplier nowMillis) { // untuk test dengan jam palsu
		this.nowMillis = nowMillis;
	}

	void checkIp(String ip) {
		long now = nowMillis.getAsLong();
		Window w = ips.compute(ip, (k, old) -> old == null || now - old.start >= IP_WINDOW_MS
				? new Window(now, 1)
				: new Window(old.start, old.count + 1));
		if (ips.size() > PURGE_ABOVE) {
			ips.values().removeIf(x -> now - x.start >= IP_WINDOW_MS);
		}
		if (w.count > IP_MAX) {
			throw new TooManyRequestsException(seconds(w.start + IP_WINDOW_MS - now));
		}
	}

	/** Panggil sebelum memeriksa password. Percobaan yang ditolak di sini tidak menambah hitungan gagal. */
	void checkAccount(String email) {
		Fails f = accounts.get(email);
		long now = nowMillis.getAsLong();
		if (f != null && f.lockedUntil > now) {
			throw new TooManyRequestsException(seconds(f.lockedUntil - now));
		}
	}

	void recordFailure(String email) {
		long now = nowMillis.getAsLong();
		accounts.compute(email, (k, old) -> {
			int n = old == null || now - old.last > FAIL_MEMORY_MS ? 1 : old.count + 1;
			long delay = n <= FREE_FAILS ? 0 : Math.min(BASE_DELAY_MS << Math.min(n - FREE_FAILS - 1, 20), MAX_DELAY_MS);
			return new Fails(n, now + delay, now);
		});
		if (accounts.size() > PURGE_ABOVE) {
			accounts.values().removeIf(x -> x.lockedUntil <= now && now - x.last > FAIL_MEMORY_MS);
		}
	}

	void recordSuccess(String email) {
		accounts.remove(email);
	}

	private static long seconds(long millis) {
		return Math.max(1, (millis + 999) / 1000);
	}
}
