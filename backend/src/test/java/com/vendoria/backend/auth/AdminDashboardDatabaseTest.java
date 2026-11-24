package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.UUID;
import javax.sql.DataSource;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL tests for /api/admin/dashboard; all fixture rows roll back. */
@SpringBootTest
@Transactional
class AdminDashboardDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, customer, admin;
	private String token;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		customer = vendorUser + 1;
		admin = vendorUser + 2;
		for (long id : new long[] {vendorUser, customer, admin}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "dash-test-" + id + "-" + token + "@example.test",
					id == customer ? "customer" : id == admin ? "admin" : "vendor");
		}
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private DocumentContext summary() throws Exception {
		return JsonPath.parse(mvc.perform(get("/api/admin/dashboard").session(session(admin)))
				.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
				.andReturn().getResponse().getContentAsString());
	}

	@Test
	void adminOnly() throws Exception {
		mvc.perform(get("/api/admin/dashboard")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/admin/dashboard").session(session(customer))).andExpect(status().isForbidden());
	}

	private static long num(DocumentContext json, String path) { return json.read(path, Number.class).longValue(); }

	@Test
	void summaryReflectsOrdersDepositsClaimsAndReviews() throws Exception {
		var before = summary();
		assertEquals(8, before.read("$.weekly.length()", Integer.class));
		assertEquals("M-7", before.read("$.weekly[0].label", String.class));
		assertEquals("Ini", before.read("$.weekly[7].label", String.class));

		long vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Vendor Dashboard') returning vendor_id", Long.class, vendorUser);
		long order = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp, status_pesanan)
				values (?, ?, ?, current_date + 1, current_date + 3, 1000000, 250000, 'berjalan') returning order_id
				""", Long.class, customer, vendorId, "VND-DSH-" + token.substring(0, 8));
		jdbc.update("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp, status_pesanan)
				values (?, ?, ?, current_date + 1, current_date + 3, 9000000, 0, 'dibatalkan')
				""", customer, vendorId, "VND-DSX-" + token.substring(0, 8));
		jdbc.update("insert into pembayaran(order_id, jenis, metode, jumlah, status) values (?, 'deposit', 'transfer_bank', 250000, 'terverifikasi')", order);
		jdbc.update("insert into pembayaran(order_id, jenis, metode, jumlah, status) values (?, 'deposit', 'transfer_bank', 5, 'menunggu')", order);
		jdbc.update("insert into klaim(order_id, user_id, alasan) values (?, ?, 'Rusak')", order, customer);
		jdbc.update("insert into ulasan(order_id, user_id, vendor_id, rating) values (?, ?, ?, 5)", order, customer, vendorId);

		var after = summary();
		assertEquals(1000000, num(after, "$.gmv30") - num(before, "$.gmv30")); // pesanan dibatalkan tidak dihitung
		assertEquals(250000, num(after, "$.escrow") - num(before, "$.escrow")); // hanya DP terverifikasi
		assertEquals(1, num(after, "$.weekly[7].count") - num(before, "$.weekly[7].count"));
		assertEquals(1000000, num(after, "$.weekly[7].total") - num(before, "$.weekly[7].total"));
		assertTrue(after.read("$.recent.length()", Integer.class) >= 2); // maks 6, DB uji bisa hanya berisi fixture
		assertEquals("Vendor Dashboard", after.read("$.recent[0].vendor", String.class));
		assertTrue(after.read("$.health.disputeRate", Double.class) > 0);
		assertEquals(num(before, "$.health.reviews") + 1, num(after, "$.health.reviews"));
		assertNotNull(after.read("$.health.rating"));
	}
}
