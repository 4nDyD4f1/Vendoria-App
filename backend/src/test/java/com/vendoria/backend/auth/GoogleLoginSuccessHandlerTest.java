package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUserAuthority;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import com.vendoria.backend.auth.GoogleUserService.GoogleLoginException;

// Memastikan login Google "menjembatani" ke sesi yang sama dengan login password.
class GoogleLoginSuccessHandlerTest {

	private final GoogleUserService users = mock(GoogleUserService.class);
	private final GoogleLoginSuccessHandler handler = new GoogleLoginSuccessHandler(users, "http://localhost:5173");

	private static OAuth2AuthenticationToken googleAuth() {
		var token = new OidcIdToken("t", Instant.now(), Instant.now().plusSeconds(60),
				Map.of("sub", "S1", "email", "budi@mail.com", "email_verified", true, "name", "Budi"));
		var user = new DefaultOidcUser(List.of(new OidcUserAuthority(token)), token);
		return new OAuth2AuthenticationToken(user, user.getAuthorities(), "google");
	}

	@Test
	void sukses_sesiBerisiUserIdSajaLaluRedirectKeBeranda() throws Exception {
		Pengguna p = mock(Pengguna.class);
		when(p.getUserId()).thenReturn(42L);
		when(users.findOrCreate("S1", "budi@mail.com", true, "Budi")).thenReturn(p);
		var req = new MockHttpServletRequest();
		req.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, "konteks-security");
		var res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, googleAuth());

		assertEquals(42L, req.getSession().getAttribute(AuthController.SESSION_USER_ID)); // Long, sama seperti login password
		assertNull(req.getSession().getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY));
		assertEquals("http://localhost:5173/", res.getRedirectedUrl());
	}

	@Test
	void gagalDiketahui_sesiDihapusDanKembaliKeLoginDenganKode() throws Exception {
		when(users.findOrCreate(any(), any(), anyBoolean(), any())).thenThrow(new GoogleLoginException("akun_google_berbeda"));
		var req = new MockHttpServletRequest();
		var session = (MockHttpSession) req.getSession(true);
		var res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, googleAuth());

		assertEquals("http://localhost:5173/login?error=akun_google_berbeda", res.getRedirectedUrl());
		assertTrue(session.isInvalid());
	}

	@Test
	void gagalTakTerduga_kembaliKeLoginTanpaMembocorkanDetail() throws Exception {
		when(users.findOrCreate(eq("S1"), any(), anyBoolean(), any())).thenThrow(new IllegalStateException("db mati"));
		var res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(new MockHttpServletRequest(), res, googleAuth());

		assertEquals("http://localhost:5173/login?error=google", res.getRedirectedUrl());
	}
}
