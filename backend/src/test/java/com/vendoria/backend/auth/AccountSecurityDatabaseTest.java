package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** API + PostgreSQL asli; email di-mock. Semua baris uji di-rollback dan tidak memakai sequence. */
@SpringBootTest
@Transactional
class AccountSecurityDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext webContext;
	@Autowired PenggunaRepository repo;
	@MockitoBean ResendMailer mailer;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private Long id;
	private String email;
	private String hash;
	private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		mvc = MockMvcBuilders.webAppContextSetup(webContext).build();
		id = -Math.max(1L, UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE);
		email = "security-test-" + UUID.randomUUID() + "@example.test";
		hash = encoder.encode("TestPassword123");
		jdbc.update("""
				insert into pengguna (user_id,nama,email,no_telp,password_hash,role,password_dibuat,two_factor_email)
				overriding system value values (?, 'Security Test', ?, '08123456789', ?, 'customer', true, false)
				""", id, email, hash);
	}

	private MockHttpSession session() {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}
	private String code() {
		var captor = ArgumentCaptor.forClass(String.class);
		verify(mailer, atLeastOnce()).sendSecurityOtp(eq(email), captor.capture(), anyString(), anyString());
		return captor.getValue();
	}
	private boolean enabled() { return jdbc.queryForObject("select two_factor_email from pengguna where user_id=?", Boolean.class, id); }

	@Test
	void enableThenLoginRequiresOtpBeforeAnyAccountAccess() throws Exception {
		var authenticated = session();
		mvc.perform(post("/api/account/security/two-factor").session(authenticated).contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":true}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.purpose").value("enable"));
		assertFalse(enabled());
		mvc.perform(post("/api/auth/two-factor/verify").session(authenticated).contentType(MediaType.APPLICATION_JSON).content("{\"otp\":\"" + code() + "\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.user").isEmpty());
		assertTrue(enabled());
		// Pengiriman login berikutnya berada di jendela baru; jangan tidur atau mengirim email nyata.
		// Gunakan akun kedua agar batas pengiriman satu menit tetap diuji oleh unit test.
		Long loginId = id == -1L ? -2L : id + 1;
		String loginEmail = "login-" + email;
		jdbc.update("""
				insert into pengguna(user_id,nama,email,password_hash,role,password_dibuat,two_factor_email)
				overriding system value values (?, 'Login Test', ?, ?, 'admin', true, true)
				""", loginId, loginEmail, hash);
		var login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + loginEmail + "\",\"password\":\"TestPassword123\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.two_factor_required").value(true))
				.andExpect(jsonPath("$.user_id").doesNotExist()).andReturn();
		var pending = (MockHttpSession) login.getRequest().getSession(false);
		assertNull(pending.getAttribute(AuthController.SESSION_USER_ID));
		for (String path : new String[] {"/api/auth/me", "/api/account/profile", "/api/account/security"})
			mvc.perform(get(path).session(pending)).andExpect(status().isUnauthorized());
		var captor = ArgumentCaptor.forClass(String.class);
		verify(mailer).sendSecurityOtp(eq(loginEmail), captor.capture(), anyString(), anyString());
		String loginCode = captor.getValue();
		var verified = mvc.perform(post("/api/auth/two-factor/verify").session(pending).contentType(MediaType.APPLICATION_JSON).content("{\"otp\":\"" + loginCode + "\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.redirect").value("/admin"))
				.andExpect(jsonPath("$.user.user_id").value(loginId)).andReturn();
		assertTrue(pending.isInvalid());
		var loggedIn = (MockHttpSession) verified.getRequest().getSession(false);
		mvc.perform(get("/api/auth/me").session(loggedIn)).andExpect(status().isOk()).andExpect(jsonPath("$.user_id").value(loginId));
		mvc.perform(post("/api/auth/two-factor/verify").session(loggedIn).contentType(MediaType.APPLICATION_JSON).content("{\"otp\":\"" + loginCode + "\"}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void passwordChangeValidatesCurrentPasswordAndKeepsTwoFactorSetting() throws Exception {
		jdbc.update("update pengguna set two_factor_email=true where user_id=?", id);
		var auth = session();
		mvc.perform(put("/api/account/security/password").session(auth).contentType(MediaType.APPLICATION_JSON)
				.content("{\"current_password\":\"wrong\",\"password\":\"NewPassword123\",\"confirm_password\":\"NewPassword123\"}"))
				.andExpect(status().isBadRequest());
		assertEquals(hash, jdbc.queryForObject("select password_hash from pengguna where user_id=?", String.class, id));
		mvc.perform(put("/api/account/security/password").session(auth).contentType(MediaType.APPLICATION_JSON)
				.content("{\"current_password\":\"TestPassword123\",\"password\":\"NewPassword123\",\"confirm_password\":\"NewPassword123\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.password_dibuat").value(true));
		String updated = jdbc.queryForObject("select password_hash from pengguna where user_id=?", String.class, id);
		assertTrue(encoder.matches("NewPassword123", updated));
		assertTrue(enabled());
	}

	@Test
	void googlePasswordIsOnlyCreatedAfterEmailOtp() throws Exception {
		jdbc.update("update pengguna set password_dibuat=false,google_sub=? where user_id=?", UUID.randomUUID().toString(), id);
		var auth = session();
		mvc.perform(put("/api/account/security/password").session(auth).contentType(MediaType.APPLICATION_JSON)
				.content("{\"password\":\"NewPassword123\",\"confirm_password\":\"NewPassword123\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.purpose").value("password"));
		assertEquals(hash, jdbc.queryForObject("select password_hash from pengguna where user_id=?", String.class, id));
		mvc.perform(post("/api/auth/two-factor/verify").session(auth).contentType(MediaType.APPLICATION_JSON).content("{\"otp\":\"" + code() + "\"}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/account/security").session(auth)).andExpect(status().isOk())
				.andExpect(jsonPath("$.password_dibuat").value(true));
		assertTrue(encoder.matches("NewPassword123", jdbc.queryForObject("select password_hash from pengguna where user_id=?", String.class, id)));
	}

	@Test
	void disablingNeedsOtpAndActiveTwoFactorProtectsEmailAtDatabaseWrite() throws Exception {
		jdbc.update("update pengguna set two_factor_email=true where user_id=?", id);
		assertEquals(0, repo.updateProfile(id, "Changed", "changed-" + email, "08123456789"));
		var authenticated = session();
		mvc.perform(post("/api/account/security/two-factor").session(authenticated).contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.purpose").value("disable"));
		assertTrue(enabled());
		mvc.perform(post("/api/auth/two-factor/verify").session(authenticated).contentType(MediaType.APPLICATION_JSON).content("{\"otp\":\"" + code() + "\"}"))
				.andExpect(status().isOk());
		assertFalse(enabled());
	}

	@Test
	void invalidInputAndUnauthenticatedSettingsAreRejected() throws Exception {
		mvc.perform(put("/api/account/security/password").session(session()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"password\":\"short\",\"confirm_password\":\"short\"}"))
				.andExpect(status().isBadRequest());
		mvc.perform(post("/api/account/security/two-factor").session(session()).contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest());
		mvc.perform(post("/api/account/security/two-factor").contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":true}"))
				.andExpect(status().isUnauthorized());
	}
}
