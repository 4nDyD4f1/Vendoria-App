package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

/** Semua perubahan di-rollback, termasuk "tak ada admin" yang disimulasikan di bawah. */
@SpringBootTest
@Transactional
class AdminBootstrapDatabaseTest {
	@Autowired JdbcTemplate jdbc;
	private final String email = "bootstrap-" + UUID.randomUUID() + "@example.test";

	@BeforeEach void noAdmins() { jdbc.update("update pengguna set role='customer' where role='admin'"); }

	private int count() { return jdbc.queryForObject("select count(*) from pengguna where lower(email)=lower(?)", Integer.class, email); }
	private String role() { return jdbc.queryForObject("select role from pengguna where lower(email)=lower(?)", String.class, email); }

	@Test void createsFirstAdminOnceAndPasswordWorks() {
		var bootstrap = new AdminBootstrap(jdbc, " " + email + " ", "Kunci-Rahasia-1");
		assertTrue(bootstrap.create());
		assertEquals("admin", role());
		assertTrue(new BCryptPasswordEncoder().matches("Kunci-Rahasia-1", jdbc.queryForObject("select password_hash from pengguna where lower(email)=lower(?)", String.class, email)));
		assertFalse(bootstrap.create());
		assertEquals(1, count());
	}

	@Test void promotesExistingAccountWithoutChangingItsPassword() {
		jdbc.update("insert into pengguna(nama,email,password_hash,role) values ('Sudah Daftar',?,'hash-lama','customer')", email);
		assertTrue(new AdminBootstrap(jdbc, email.toUpperCase(), "Kunci-Rahasia-1").create());
		assertEquals("admin", role());
		assertEquals("hash-lama", jdbc.queryForObject("select password_hash from pengguna where lower(email)=lower(?)", String.class, email));
		assertEquals(1, count());
	}

	@Test void doesNothingWhenAnAdminAlreadyExistsOrConfigIsBlankOrInvalid() {
		assertFalse(new AdminBootstrap(jdbc, "", "").create());
		assertFalse(new AdminBootstrap(jdbc, email, "pendek").create());
		assertFalse(new AdminBootstrap(jdbc, "bukan-email", "Kunci-Rahasia-1").create());
		assertEquals(0, count());
		jdbc.update("insert into pengguna(nama,email,password_hash,role) values ('Admin Lama',?,'h','admin')", "lama-" + email);
		assertFalse(new AdminBootstrap(jdbc, email, "Kunci-Rahasia-1").create());
		assertEquals(0, count());
	}
}
