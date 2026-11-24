package com.vendoria.backend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Admin pertama tidak bisa dibuat lewat aplikasi (hanya admin yang boleh menambah admin). Bila BOOTSTRAP_ADMIN_EMAIL dan
 * BOOTSTRAP_ADMIN_PASSWORD diisi dan BELUM ADA admin sama sekali, akun itu dibuat (atau akun biasa ber-email itu dinaikkan jadi admin)
 * saat backend start. Setelah ada admin, tak melakukan apa pun: hapus kedua variabel dari .env sesudah login pertama.
 */
@Component
class AdminBootstrap implements ApplicationRunner {
	private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
	private final JdbcTemplate jdbc;
	private final String email, password;

	AdminBootstrap(JdbcTemplate jdbc, @Value("${app.bootstrap-admin.email:}") String email, @Value("${app.bootstrap-admin.password:}") String password) {
		this.jdbc = jdbc; this.email = email.trim(); this.password = password.trim();
	}

	@Override public void run(ApplicationArguments args) { create(); }

	/** @return true bila admin dibuat/dinaikkan pada pemanggilan ini. */
	boolean create() {
		if (email.isEmpty() && password.isEmpty()) return false;
		if (!email.matches("[^@\s]+@[^@\s]+") || email.length() > 255 || password.length() < 8 || password.length() > 72) {
			log.error("BOOTSTRAP_ADMIN diabaikan: email tidak valid atau password bukan 8-72 karakter");
			return false;
		}
		if (Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from pengguna where role='admin')", Boolean.class))) return false;
		// Akun biasa ber-email sama dinaikkan (password lamanya tetap); bila tak ada, buat baru.
		int promoted = jdbc.update("update pengguna set role='admin', status_akun='Aktif', updated_at=now() where lower(email)=lower(?)", email);
		if (promoted == 0) jdbc.update("insert into pengguna(nama,email,password_hash,role,status_akun,password_dibuat) values ('Administrator',?,?,'admin','Aktif',true)",
				email, new BCryptPasswordEncoder().encode(password));
		log.warn("Admin pertama {} untuk {}. Hapus BOOTSTRAP_ADMIN_* dari .env.", promoted == 0 ? "dibuat" : "dinaikkan", email);
		return true;
	}
}
