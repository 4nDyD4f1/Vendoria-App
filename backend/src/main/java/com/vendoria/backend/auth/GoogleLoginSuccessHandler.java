package com.vendoria.backend.auth;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;

import com.vendoria.backend.auth.GoogleUserService.GoogleLoginException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Dipanggil Spring Security setelah Google memverifikasi user. Di sini login Google "dijembatani" ke mekanisme
 * sesi yang sudah ada: kita menyimpan user_id di HttpSession (sama seperti POST /api/auth/login), sehingga
 * GET /api/auth/me dan POST /api/auth/logout bekerja tanpa perubahan.
 */
@Component
class GoogleLoginSuccessHandler implements AuthenticationSuccessHandler {

	private static final Logger log = LoggerFactory.getLogger(GoogleLoginSuccessHandler.class);

	private final GoogleUserService users;
	private final String frontendUrl;

	GoogleLoginSuccessHandler(GoogleUserService users, @Value("${app.frontend-url}") String frontendUrl) {
		this.users = users;
		this.frontendUrl = frontendUrl;
	}

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
			Authentication authentication) throws IOException {
		OidcUser google = (OidcUser) authentication.getPrincipal(); // scope "openid" => OidcUser
		HttpSession session = request.getSession(true);
		// Sesi hanya boleh berisi user_id (seperti login password); buang konteks Spring Security (berisi ID token Google).
		session.removeAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
		try {
			Pengguna user = users.findOrCreate(google.getSubject(), google.getEmail(),
					Boolean.TRUE.equals(google.getEmailVerified()), google.getFullName());
			users.perbaruiFoto(user, google.getPicture());
			session.setAttribute(AuthController.SESSION_USER_ID, user.getUserId());
			response.sendRedirect(frontendUrl + "/");
		} catch (GoogleLoginException e) {
			session.invalidate();
			response.sendRedirect(frontendUrl + "/login?error=" + e.code);
		} catch (RuntimeException e) {
			log.error("Login Google gagal saat menyimpan/mengambil user", e);
			session.invalidate();
			response.sendRedirect(frontendUrl + "/login?error=google");
		}
	}
}
