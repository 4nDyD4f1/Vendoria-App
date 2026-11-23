package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL tests for /api/vendor/settings; all fixture rows roll back. */
@SpringBootTest
@Transactional
class VendorSettingsDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, otherUser, customer, admin;
	private String token, vendorEmail, otherEmail;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; }))
				.build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		otherUser = vendorUser + 1;
		customer = vendorUser + 2;
		admin = vendorUser + 3;
		vendorEmail = "vs-vendor-" + token + "@example.test";
		otherEmail = "vs-other-" + token + "@example.test";
		for (long id : new long[] {vendorUser, otherUser, customer, admin}) {
			String mail = id == vendorUser ? vendorEmail : id == otherUser ? otherEmail : "vs-" + id + "-" + token + "@example.test";
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pemilik Uji " + id, mail,
					id == customer ? "customer" : id == admin ? "admin" : "vendor");
		}
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	@Test
	void requiresActiveVendorRoleAndNeverCreatesBusinessOnRead() throws Exception {
		mvc.perform(get("/api/vendor/settings")).andExpect(status().isUnauthorized());
		for (long id : new long[] {customer, admin}) {
			mvc.perform(get("/api/vendor/settings").session(session(id))).andExpect(status().isForbidden());
		}
		mvc.perform(get("/api/vendor/settings").session(session(vendorUser)))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.owner.email").value(vendorEmail))
				.andExpect(jsonPath("$.owner.email_locked").value(false))
				.andExpect(jsonPath("$.business").isEmpty());
		assertEquals(0, jdbc.queryForObject("select count(*) from vendor where user_id=?", Integer.class, vendorUser));

		jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", vendorUser);
		mvc.perform(get("/api/vendor/settings").session(session(vendorUser))).andExpect(status().isForbidden());
	}

	@Test
	void updatesOwnerAndBusinessProfilesWithoutTouchingProtectedColumns() throws Exception {
		String newEmail = "updated-" + vendorEmail;
		mvc.perform(put("/api/vendor/settings/owner")
				.header("X-Vendor-Settings", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nama":"  Bagas Baru  ","email":"%s","no_telp":"+62 (813)-9999 0000","nama_vendor":"Roder Megah"}
						""".formatted(newEmail.toUpperCase())))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.owner.nama").value("Bagas Baru"))
				.andExpect(jsonPath("$.owner.email").value(newEmail))
				.andExpect(jsonPath("$.owner.no_telp").value("+6281399990000"))
				.andExpect(jsonPath("$.business.nama_vendor").value("Roder Megah"))
				.andExpect(jsonPath("$.business.status_aktif").value(false));

		jdbc.update("update vendor set status_aktif=true, rating=4.9 where user_id=?", vendorUser);

		mvc.perform(put("/api/vendor/settings/business")
				.header("X-Vendor-Settings", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nama_vendor":"Roder Bogor Baru","kota":"Bogor","alamat":"Jl. Pajajaran No. 88","deskripsi":"Tenda dan perlengkapan event"}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.business.nama_vendor").value("Roder Bogor Baru"))
				.andExpect(jsonPath("$.business.kota").value("Bogor"))
				.andExpect(jsonPath("$.business.alamat").value("Jl. Pajajaran No. 88"))
				.andExpect(jsonPath("$.business.status_aktif").value(true))
				.andExpect(jsonPath("$.business.rating").value(4.9));
	}

	@Test
	void protectsLockedGoogleAndTwoFactorEmailsAndRejectsDuplicatesAndInvalidInputs() throws Exception {
		mvc.perform(put("/api/vendor/settings/owner")
				.header("X-Vendor-Settings", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nama":"Bagas","email":"%s","no_telp":"081234567890"}
						""".formatted(otherEmail)))
				.andExpect(status().isConflict());

		jdbc.update("update pengguna set two_factor_email=true where user_id=?", vendorUser);
		mvc.perform(put("/api/vendor/settings/owner")
				.header("X-Vendor-Settings", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nama":"Bagas","email":"changed-%s","no_telp":"081234567890"}
						""".formatted(vendorEmail)))
				.andExpect(status().isBadRequest());

		jdbc.update("update pengguna set two_factor_email=false, google_sub=? where user_id=?", "sub-" + token, vendorUser);
		mvc.perform(put("/api/vendor/settings/owner")
				.header("X-Vendor-Settings", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nama":"Bagas Google","email":"%s","no_telp":"081200001111"}
						""".formatted(vendorEmail)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.owner.nama").value("Bagas Google"))
				.andExpect(jsonPath("$.owner.email_locked").value(true));

		mvc.perform(put("/api/vendor/settings/business")
				.header("X-Vendor-Settings", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"nama_vendor\":\"  \"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.nama_vendor").exists());

		// Missing custom header or untrusted Origin rejected
		mvc.perform(put("/api/vendor/settings/business")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"nama_vendor\":\"Test\"}"))
				.andExpect(status().isForbidden());
		mvc.perform(put("/api/vendor/settings/business")
				.header("X-Vendor-Settings", "1")
				.header("Origin", "https://untrusted.example")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"nama_vendor\":\"Test\"}"))
				.andExpect(status().isForbidden());
	}
}
