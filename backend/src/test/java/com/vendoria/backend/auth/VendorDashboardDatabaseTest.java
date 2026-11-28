package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.UUID;
import javax.sql.DataSource;
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

/** Real PostgreSQL tests for /api/vendor/dashboard; all fixture rows roll back. */
@SpringBootTest
@Transactional
class VendorDashboardDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, noBusinessUser, otherVendorUser, customer;
	private String token;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		noBusinessUser = vendorUser + 1;
		otherVendorUser = vendorUser + 2;
		customer = vendorUser + 3;
		for (long id : new long[] {vendorUser, noBusinessUser, otherVendorUser, customer}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "vdash-test-" + id + "-" + token + "@example.test", id == customer ? "customer" : "vendor");
		}
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private long order(long vendorId, String status, long total, String suffix) {
		return jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp, status_pesanan)
				values (?, ?, ?, current_date - 5, current_date - 1, ?, 0, ?) returning order_id
				""", Long.class, customer, vendorId, "VND-VD" + suffix + "-" + token.substring(0, 6), total, status);
	}

	@Test
	void dashboardIsVendorOnly() throws Exception {
		mvc.perform(get("/api/vendor/dashboard")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/vendor/dashboard").session(session(customer))).andExpect(status().isForbidden());
	}

	@Test
	void vendorWithoutBusinessGetsEmptySummary() throws Exception {
		mvc.perform(get("/api/vendor/dashboard").session(session(noBusinessUser))).andExpect(status().isOk())
				.andExpect(jsonPath("$.business").isEmpty()).andExpect(jsonPath("$.newOrders").value(0))
				.andExpect(jsonPath("$.weekly.length()").value(8)).andExpect(jsonPath("$.payout.amount").value(0)).andExpect(jsonPath("$.rating").isEmpty());
	}

	@Test
	void summaryCountsOnlyThisVendorsOrdersClaimsAndRevenue() throws Exception {
		long vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Roder Dashboard') returning vendor_id", Long.class, vendorUser);
		long otherId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Vendor Lain') returning vendor_id", Long.class, otherVendorUser);
		order(vendorId, "menunggu_konfirmasi", 100000, "A");
		order(vendorId, "dikonfirmasi", 100000, "B");
		order(vendorId, "dikonfirmasi", 100000, "C");
		order(vendorId, "berjalan", 100000, "D");
		order(vendorId, "dikembalikan", 100000, "E");
		order(vendorId, "dibatalkan", 900000, "F");
		long done = order(vendorId, "selesai", 1000000, "G");
		jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) values (?,'pelunasan','payment_gateway',1000000,'terverifikasi',?)", done, "VD-" + token);
		order(otherId, "menunggu_konfirmasi", 100000, "H"); // milik vendor lain
		long claimOrder = order(vendorId, "berjalan", 100000, "I");
		jdbc.update("insert into klaim(order_id, user_id, alasan) values (?, ?, 'Rusak')", claimOrder, customer);
		jdbc.update("insert into ulasan(order_id, user_id, vendor_id, rating) values (?, ?, ?, 4)", done, customer, vendorId);

		String body = mvc.perform(get("/api/vendor/dashboard").session(session(vendorUser))).andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.business").value("Roder Dashboard")).andExpect(jsonPath("$.verification").value("terverifikasi"))
				.andExpect(jsonPath("$.newOrders").value(1)).andExpect(jsonPath("$.toHandover").value(2))
				.andExpect(jsonPath("$.ongoing").value(2)).andExpect(jsonPath("$.toInspect").value(1))
				.andExpect(jsonPath("$.openClaims").value(1)).andExpect(jsonPath("$.completed").value(1))
				.andExpect(jsonPath("$.rating").value(4.0)).andExpect(jsonPath("$.reviews").value(1))
				.andExpect(jsonPath("$.payout.gross").value(1000000)).andExpect(jsonPath("$.payout.amount").value(940000)) // 6%
				.andReturn().getResponse().getContentAsString();
		var json = JsonPath.parse(body);
		long weeklyTotal = 0;
		for (int i = 0; i < 8; i++) weeklyTotal += json.read("$.weekly[" + i + "]", Number.class).longValue();
		assertEquals(1000000, weeklyTotal); // hanya pesanan selesai, tanpa yang dibatalkan/milik vendor lain
	}
}
