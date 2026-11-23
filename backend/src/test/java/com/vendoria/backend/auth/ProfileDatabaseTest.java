package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.ProfileDtos.ProfileRequest;

/** PostgreSQL asli, tanpa DDL. Baris ber-ID negatif di-rollback, tanpa memakai sequence user_id. */
@SpringBootTest
@Transactional
class ProfileDatabaseTest {

	@Autowired ProfileService service;
	@Autowired DataSource dataSource;
	private JdbcTemplate jdbc;
	private Long userId;
	private String email;
	private MockMvc mvc;

	@BeforeEach
	void fixture() {
		jdbc = new JdbcTemplate(dataSource);
		userId = -Math.max(1L, UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE);
		email = "profile-test-" + UUID.randomUUID() + "@example.test";
		jdbc.update("""
				insert into pengguna (user_id, nama, email, no_telp, password_hash, role,
				status_verifikasi, google_sub, foto_profil, status_akun, catatan_admin, updated_at)
				overriding system value values (?, 'Profil Test', ?, '08123456789', 'test-hash', 'customer',
				'belum_diverifikasi', null, 'https://example.test/avatar.png', 'Aktif', 'test-note', '2000-01-01T00:00:00Z')
				""", userId, email);
		mvc = MockMvcBuilders.standaloneSetup(new ProfileController(service)).build();
	}

	@Test
	void updatePersistsOnlyProfileColumnsAndCanBeReadAgain() throws Exception {
		Map<String, Object> before = row();
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, userId);
		mvc.perform(put("/api/account/profile").session(session).contentType(MediaType.APPLICATION_JSON)
				.content("{\"nama\":\"  Nama Baru  \",\"email\":\"" + email.toUpperCase(java.util.Locale.ROOT)
						+ "\",\"no_telp\":\"+62 (812)-3456 7890\",\"role\":\"admin\",\"user_id\":1}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.nama").value("Nama Baru"))
				.andExpect(jsonPath("$.email").value(email)).andExpect(jsonPath("$.no_telp").value("+6281234567890"))
				.andExpect(jsonPath("$.role").value("customer"));
		Map<String, Object> after = row();
		for (String column : List.of("user_id", "password_hash", "role", "status_verifikasi", "google_sub",
				"foto_profil", "status_akun", "catatan_admin", "created_at")) {
			assertEquals(before.get(column), after.get(column), column);
		}
		assertEquals("Nama Baru", after.get("nama"));
		assertEquals("+6281234567890", after.get("no_telp"));
		org.junit.jupiter.api.Assertions.assertNotEquals(before.get("updated_at"), after.get("updated_at"));
		mvc.perform(get("/api/account/profile").session(session))
				.andExpect(status().isOk()).andExpect(jsonPath("$.nama").value("Nama Baru"));
	}

	@Test
	void duplicateEmailLeavesDatabaseValuesUntouched() {
		Long otherId = userId == -1L ? -2L : userId + 1;
		String otherEmail = "other-" + email;
		jdbc.update("""
				insert into pengguna (user_id, nama, email, password_hash, role)
				overriding system value values (?, 'Other Test', ?, 'test-hash', 'customer')
				""", otherId, otherEmail);
		assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
				() -> service.update(userId, new ProfileRequest("Ditolak", otherEmail, "08123456789"))).getStatusCode());
		assertEquals("Profil Test", row().get("nama"));
	}

	@Test
	void googleEmailIsProtectedAndPhoneCanStillBeUpdated() {
		jdbc.update("update pengguna set google_sub = ? where user_id = ?", "profile-test-" + UUID.randomUUID(), userId);
		assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
				() -> service.update(userId, new ProfileRequest("Ditolak", "changed-" + email, "08123456789"))).getStatusCode());
		assertEquals(email, row().get("email"));
		service.update(userId, new ProfileRequest("Google Updated", email, "+62 812-3456-7890"));
		assertEquals("Google Updated", row().get("nama"));
		assertEquals("+6281234567890", row().get("no_telp"));
	}

	private Map<String, Object> row() {
		return jdbc.queryForMap("select * from pengguna where user_id = ?", userId);
	}
}
