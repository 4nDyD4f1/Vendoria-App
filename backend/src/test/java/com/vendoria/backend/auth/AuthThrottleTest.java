package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.vendoria.backend.TooManyRequestsException;
import com.vendoria.backend.auth.AuthDtos.LoginRequest;

class AuthThrottleTest {

	private final AtomicLong now = new AtomicLong(1_000_000);
	private final AuthThrottle throttle = new AuthThrottle(now::get);

	private long retryAfter(String email) {
		return assertThrows(TooManyRequestsException.class, () -> throttle.checkAccount(email)).getRetryAfterSeconds();
	}

	@Test
	void akunDuaGagalPertamaGratisLaluDelayNaikBertahapDanTidakPermanen() {
		throttle.recordFailure("a@x.com");
		throttle.recordFailure("a@x.com");
		assertDoesNotThrow(() -> throttle.checkAccount("a@x.com"));

		throttle.recordFailure("a@x.com"); // gagal ke-3 -> 2 detik
		assertEquals(2, retryAfter("a@x.com"));
		now.addAndGet(2_000);
		assertDoesNotThrow(() -> throttle.checkAccount("a@x.com")); // tidak terkunci permanen

		throttle.recordFailure("a@x.com"); // gagal ke-4 -> 4 detik
		assertEquals(4, retryAfter("a@x.com"));
	}

	@Test
	void delayDibatasiLimaMenitDanAkunLainTidakTerpengaruh() {
		for (int i = 0; i < 30; i++) {
			throttle.recordFailure("a@x.com");
		}
		assertEquals(300, retryAfter("a@x.com"));
		assertDoesNotThrow(() -> throttle.checkAccount("b@x.com"));
	}

	@Test
	void loginBerhasilMenghapusDelay() {
		for (int i = 0; i < 5; i++) {
			throttle.recordFailure("a@x.com");
		}
		throttle.recordSuccess("a@x.com");
		assertDoesNotThrow(() -> throttle.checkAccount("a@x.com"));
	}

	@Test
	void ipDibatasiPerJendelaLaluPulih() {
		for (int i = 0; i < AuthThrottle.IP_MAX; i++) {
			throttle.checkIp("1.1.1.1");
		}
		var e = assertThrows(TooManyRequestsException.class, () -> throttle.checkIp("1.1.1.1"));
		assertEquals(60, e.getRetryAfterSeconds());
		assertDoesNotThrow(() -> throttle.checkIp("2.2.2.2"));

		now.addAndGet(AuthThrottle.IP_WINDOW_MS);
		assertDoesNotThrow(() -> throttle.checkIp("1.1.1.1"));
	}

	@Test
	void loginDiblokirSelamaDelayWalauPasswordBenar() {
		var repo = mock(PenggunaRepository.class);
		var service = new AuthService(repo, throttle);
		var p = new Pengguna("Budi", "budi@mail.com", "0812", new BCryptPasswordEncoder().encode("rahasia123"), "customer");
		when(repo.findByEmail("budi@mail.com")).thenReturn(Optional.of(p));

		for (int i = 0; i < 3; i++) {
			assertThrows(Exception.class, () -> service.login(new LoginRequest("budi@mail.com", "salah")));
		}
		assertThrows(TooManyRequestsException.class, () -> service.login(new LoginRequest("budi@mail.com", "rahasia123")));

		now.addAndGet(2_000);
		assertEquals("budi@mail.com", service.login(new LoginRequest("budi@mail.com", "rahasia123")).email());
	}
}
