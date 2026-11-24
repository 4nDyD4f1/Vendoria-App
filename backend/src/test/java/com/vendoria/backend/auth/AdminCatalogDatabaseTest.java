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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL tests for /api/admin/catalog; all fixture rows roll back. */
@SpringBootTest
@Transactional
class AdminCatalogDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, admin, item;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		String token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; }))
				.build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		admin = vendorUser + 1;
		for (long id : new long[] {vendorUser, admin}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "catalog-test-" + id + "-" + token + "@example.test", id == admin ? "admin" : "vendor");
		}
		long vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Vendor Katalog') returning vendor_id", Long.class, vendorUser);
		long category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, "Kategori " + token);
		item = jdbc.queryForObject("""
				insert into item(vendor_id, kategori_id, nama_barang, harga_sewa_per_hari, stok_total)
				values (?, ?, 'Tenda Uji', 150000, 3) returning item_id
				""", Long.class, vendorId, category);
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private ResultActions change(long id, long user, boolean header, String body) throws Exception {
		var request = put("/api/admin/catalog/" + id + "/status").session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body);
		return mvc.perform(header ? request.header("X-Admin-Catalog", "1") : request);
	}

	@Test
	void listIsAdminOnly() throws Exception {
		mvc.perform(get("/api/admin/catalog")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/admin/catalog").session(session(vendorUser))).andExpect(status().isForbidden());
		mvc.perform(get("/api/admin/catalog").session(session(admin)))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$[?(@.id=='" + item + "')].name").value("Tenda Uji"))
				.andExpect(jsonPath("$[?(@.id=='" + item + "')].vendor").value("Vendor Katalog"))
				.andExpect(jsonPath("$[?(@.id=='" + item + "')].status").value("aktif"));
	}

	@Test
	void onlyStatusChangesAndOnlyByAdminWithHeader() throws Exception {
		change(item, admin, false, "{\"status\":\"nonaktif\"}").andExpect(status().isForbidden());
		change(item, vendorUser, true, "{\"status\":\"nonaktif\"}").andExpect(status().isForbidden());
		change(item, admin, true, "{\"status\":\"Ditangguhkan\"}").andExpect(status().isBadRequest());
		change(0, admin, true, "{\"status\":\"nonaktif\"}").andExpect(status().isNotFound());
		change(item, admin, true, "{\"status\":\"nonaktif\",\"name\":\"Diubah\"}").andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("nonaktif")).andExpect(jsonPath("$.name").value("Tenda Uji"));
		assertEquals("nonaktif", jdbc.queryForObject("select status from item where item_id=?", String.class, item));
		assertEquals("Tenda Uji", jdbc.queryForObject("select nama_barang from item where item_id=?", String.class, item));
	}

	@Test
	void adminCannotAddOrDeleteItems() throws Exception {
		mvc.perform(post("/api/admin/catalog").session(session(admin)).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isMethodNotAllowed());
		mvc.perform(delete("/api/admin/catalog/" + item).session(session(admin))).andExpect(status().is4xxClientError());
		assertEquals(1, jdbc.queryForObject("select count(*) from item where item_id=?", Integer.class, item));
	}
}
