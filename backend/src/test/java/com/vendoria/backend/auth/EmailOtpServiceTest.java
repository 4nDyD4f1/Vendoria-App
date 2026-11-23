package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.TooManyRequestsException;
import com.vendoria.backend.auth.EmailOtpService.Purpose;

class EmailOtpServiceTest {
	private final AtomicLong now = new AtomicLong(1_000_000);
	private final ResendMailer mailer = mock(ResendMailer.class);
	private final EmailOtpService service = new EmailOtpService(mailer, now::get);
	private final MockHttpSession session = new MockHttpSession();
	private final Pengguna user = mock(Pengguna.class);

	EmailOtpServiceTest() {
		when(user.getUserId()).thenReturn(7L);
		when(user.getEmail()).thenReturn("otp@example.test");
		when(user.getPasswordHash()).thenReturn("hash");
	}

	private String code() {
		var captor = ArgumentCaptor.forClass(String.class);
		verify(mailer, atLeastOnce()).sendSecurityOtp(eq("otp@example.test"), captor.capture(), anyString(), anyString());
		return captor.getValue();
	}

	@Test
	void sixDigitOtpIsSessionBoundSingleUseAndPurposeBound() {
		var response = service.start(session, user, Purpose.LOGIN, null);
		assertTrue(code().matches("[0-9]{6}"));
		assertEquals("login", response.purpose());
		assertThrows(ResponseStatusException.class, () -> service.verify(new MockHttpSession(), code()));
		var proof = service.verify(session, code());
		assertEquals(7L, proof.userId());
		assertEquals(Purpose.LOGIN, proof.purpose());
		assertThrows(ResponseStatusException.class, () -> service.verify(session, code()));
	}

	@Test
	void expiresAfterTenMinutes() {
		service.start(session, user, Purpose.LOGIN, null);
		now.addAndGet(EmailOtpService.TTL_MS);
		assertThrows(ResponseStatusException.class, () -> service.verify(session, code()));
		assertThrows(ResponseStatusException.class, () -> service.resend(session));
	}

	@Test
	void attemptsAndExpiryDoNotResetOnResend() {
		var initial = service.start(session, user, Purpose.LOGIN, null);
		String wrong = code().equals("000000") ? "111111" : "000000";
		for (int i = 0; i < 4; i++) assertThrows(ResponseStatusException.class, () -> service.verify(session, wrong));
		assertThrows(TooManyRequestsException.class, () -> service.resend(session));
		now.addAndGet(EmailOtpService.COOLDOWN_MS);
		assertEquals(initial.expiresAt(), service.resend(session).expiresAt());
		String lastWrong = code().equals("000000") ? "111111" : "000000";
		assertThrows(ResponseStatusException.class, () -> service.verify(session, lastWrong));
		assertThrows(ResponseStatusException.class, () -> service.verify(session, code()));
	}

	@Test
	void sendLimitIsPerAccountAcrossSessionsAndPurposes() {
		for (int i = 0; i < 5; i++) {
			service.start(new MockHttpSession(), user, Purpose.ENABLE, null);
			now.addAndGet(EmailOtpService.COOLDOWN_MS);
		}
		assertThrows(TooManyRequestsException.class, () -> service.start(new MockHttpSession(), user, Purpose.LOGIN, null));
	}

	@Test
	void failedDeliveryDoesNotCreateChallengeOrLockOutRetry() {
		doThrow(new IllegalStateException("test delivery failure")).doNothing()
				.when(mailer).sendSecurityOtp(any(), any(), any(), any());
		assertThrows(IllegalStateException.class, () -> service.start(session, user, Purpose.LOGIN, null));
		assertThrows(ResponseStatusException.class, () -> service.status(session));
		assertDoesNotThrow(() -> service.start(session, user, Purpose.LOGIN, null));
	}
}
