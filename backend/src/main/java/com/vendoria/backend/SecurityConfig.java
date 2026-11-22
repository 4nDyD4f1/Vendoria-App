package com.vendoria.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

/**
 * Spring Security dipakai HANYA untuk "Sign in with Google" (oauth2Login). Mekanisme login yang sudah ada
 * (sesi HttpSession berisi user_id, dicek per endpoint, mis. GET /api/auth/me) tidak diubah, jadi:
 * - anyRequest().permitAll(): Security tidak ikut memutuskan siapa boleh mengakses apa. Kalau dipaksa
 *   authenticated(), login/register/forgot-password akan terblokir karena login password tidak mengisi
 *   SecurityContext. Endpoint yang butuh login memeriksa sesinya sendiri.
 * - CSRF tidak dipakai untuk /api/**: API ini JSON-only dan cookie sesinya SameSite=Lax (sama seperti sebelumnya).
 */
@Configuration
class SecurityConfig {

	private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http,
			AuthenticationSuccessHandler googleLoginSuccessHandler,
			@Value("${app.frontend-url}") String frontendUrl) throws Exception {
		http
				.cors(Customizer.withDefaults()) // memakai CorsConfig
				.csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
				.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
				.oauth2Login(oauth -> oauth
						.loginPage("/login") // halaman login = React (/login); mencegah Spring membuat halaman login bawaan
						.successHandler(googleLoginSuccessHandler)
						.failureHandler((request, response, ex) -> {
							log.warn("Login Google gagal: {}", ex.getMessage()); // mis. user menekan Batal di layar Google
							response.sendRedirect(frontendUrl + "/login?error=google");
						}));
		return http.build();
	}
}
