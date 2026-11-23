package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.AccountSecurityDtos.*;

class AccountSecurityServiceTest {
	private final PenggunaRepository repo = mock(PenggunaRepository.class);
	private final ResendMailer mailer = mock(ResendMailer.class);
	private final AtomicLong now = new AtomicLong(1_000_000);
	private final EmailOtpService otps = new EmailOtpService(mailer, now::get);
	private final AccountSecurityService service = new AccountSecurityService(repo, otps, new AuthThrottle(now::get));
	private final Pengguna user = mock(Pengguna.class);
	private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

	AccountSecurityServiceTest() {
		when(user.getUserId()).thenReturn(7L);
		when(user.getNama()).thenReturn("Security Test");
		when(user.getEmail()).thenReturn("security@example.test");
		when(user.getRole()).thenReturn("customer");
		when(user.getStatusAkun()).thenReturn("Aktif");
		when(user.getPasswordDibuat()).thenReturn(true);
		when(user.getPasswordHash()).thenReturn(encoder.encode("OldPassword123"));
		when(repo.findById(7L)).thenReturn(Optional.of(user));
	}

	private MockHttpSession authenticated() {
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, 7L);
		return session;
	}
	private String code() {
		var captor = ArgumentCaptor.forClass(String.class);
		verify(mailer, atLeastOnce()).sendSecurityOtp(anyString(), captor.capture(), anyString(), anyString());
		return captor.getValue();
	}

	@Test
	void loginDoesNotAuthenticateBeforeOtpAndRedirectsByRole() {
		when(user.isTwoFactorEmail()).thenReturn(true);
		for (String role : new String[] {"customer", "vendor", "admin"}) {
			when(user.getRole()).thenReturn(role);
			MockHttpServletRequest request = new MockHttpServletRequest();
			MockHttpSession old = authenticated();
			request.setSession(old);
			assertInstanceOf(OtpResponse.class, service.startLogin(7L, request));
			assertTrue(old.isInvalid());
			assertNull(request.getSession().getAttribute(AuthController.SESSION_USER_ID));
			String challengeCode = code();
			var verified = service.verify(request, challengeCode);
			assertEquals(7L, request.getSession().getAttribute(AuthController.SESSION_USER_ID));
			assertEquals(AccountSecurityService.destination(role), verified.redirect());
			assertThrows(ResponseStatusException.class, () -> service.verify(request, challengeCode));
			now.addAndGet(EmailOtpService.COOLDOWN_MS);
		}
	}

	@Test
	void withoutTwoFactorLoginCreatesFreshSessionImmediately() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		assertInstanceOf(AuthDtos.UserResponse.class, service.startLogin(7L, request));
		assertEquals(7L, request.getSession().getAttribute(AuthController.SESSION_USER_ID));
		verifyNoInteractions(mailer);
	}

	@Test
	void disabledAccountOrChangedPasswordCannotCompletePendingLogin() {
		when(user.isTwoFactorEmail()).thenReturn(true);
		MockHttpServletRequest request = new MockHttpServletRequest();
		service.startLogin(7L, request);
		when(user.getPasswordHash()).thenReturn(encoder.encode("ChangedPassword"));
		assertThrows(ResponseStatusException.class, () -> service.verify(request, code()));
		assertNull(request.getSession().getAttribute(AuthController.SESSION_USER_ID));
		now.addAndGet(EmailOtpService.COOLDOWN_MS);
		service.startLogin(7L, request);
		when(user.getStatusAkun()).thenReturn("Nonaktif");
		assertThrows(ResponseStatusException.class, () -> service.verify(request, code()));
		assertNull(request.getSession().getAttribute(AuthController.SESSION_USER_ID));
	}

	@Test
	void toggleOnlyWritesAfterOtpAndCannotBeReusedAsLogin() {
		when(repo.updateTwoFactor(any(), any(), any(), anyBoolean())).thenReturn(1);
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setSession(authenticated());
		service.configure(request.getSession(), true);
		verify(repo, never()).updateTwoFactor(any(), any(), any(), anyBoolean());
		var response = service.verify(request, code());
		assertNull(response.user());
		assertEquals("/akun/keamanan", response.redirect());
		String currentHash = user.getPasswordHash();
		String currentEmail = user.getEmail();
		verify(repo).updateTwoFactor(eq(7L), eq(currentHash), eq(currentEmail), eq(true));
	}

	@Test
	void existingPasswordRequiresCurrentPasswordAndStoresOnlyBcrypt() {
		var session = authenticated();
		assertThrows(ResponseStatusException.class, () -> service.password(session, new PasswordRequest("wrong", "NewPassword123", "NewPassword123")));
		verify(repo, never()).changeOwnPassword(any(), any(), any());
		when(repo.changeOwnPassword(any(), any(), any())).thenReturn(1);
		service.password(session, new PasswordRequest("OldPassword123", "NewPassword123", "NewPassword123"));
		var hash = ArgumentCaptor.forClass(String.class);
		String currentHash = user.getPasswordHash();
		verify(repo).changeOwnPassword(eq(7L), eq(currentHash), hash.capture());
		assertTrue(encoder.matches("NewPassword123", hash.getValue()));
	}

	@Test
	void googleCreatePasswordRequiresEmailProofForNewAndLegacyAccounts() {
		when(repo.changeOwnPassword(any(), any(), any())).thenReturn(1);
		for (Boolean marker : new Boolean[] {false, null}) {
			when(user.getPasswordDibuat()).thenReturn(marker);
			var request = new MockHttpServletRequest();
			request.setSession(authenticated());
			assertInstanceOf(OtpResponse.class, service.password(request.getSession(), new PasswordRequest(null, "NewPassword123", "NewPassword123")));
			service.verify(request, code());
			now.addAndGet(EmailOtpService.COOLDOWN_MS);
		}
		String currentHash = user.getPasswordHash();
		verify(repo, times(2)).changeOwnPassword(eq(7L), eq(currentHash), anyString());
	}

	@Test
	void rejectsUnauthenticatedMismatchedAndMultibyteOversizedPasswords() {
		assertThrows(ResponseStatusException.class, () -> service.get(null));
		assertThrows(ResponseStatusException.class, () -> service.password(authenticated(), new PasswordRequest("OldPassword123", "NewPassword123", "different")));
		String oversized = "密".repeat(25);
		assertThrows(ResponseStatusException.class, () -> service.password(authenticated(), new PasswordRequest("OldPassword123", oversized, oversized)));
		verify(repo, never()).changeOwnPassword(any(), any(), any());
	}
}
