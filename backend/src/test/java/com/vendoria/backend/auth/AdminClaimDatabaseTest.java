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

/** Real PostgreSQL tests for /api/admin/claims; all fixture rows roll back. */
@SpringBootTest
@Transactional
class AdminClaimDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, customer, admin, claim;
	private String token;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; }))
				.build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		customer = vendorUser + 1;
		admin = vendorUser + 2;
		for (long id : new long[] {vendorUser, customer, admin}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "claims-test-" + id + "-" + token + "@example.test",
					id == customer ? "customer" : id == admin ? "admin" : "vendor");
		}
		long vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Vendor Klaim') returning vendor_id", Long.class, vendorUser);
		long order = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp)
				values (?, ?, ?, current_date + 1, current_date + 3, 1000000, 250000) returning order_id
				""", Long.class, customer, vendorId, "VND-CLM-" + token.substring(0, 8));
		claim = jdbc.queryForObject("insert into klaim(order_id, user_id, alasan) values (?, ?, 'Barang rusak') returning klaim_id", Long.class, order, customer);
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private org.springframework.test.web.servlet.ResultActions decide(String body) throws Exception {
		return mvc.perform(post("/api/admin/claims/" + claim + "/decision").header("X-Admin-Claims", "1")
				.session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	@Test
	void listIsAdminOnlyAndIncomingClaimShowsAsDitinjau() throws Exception {
		mvc.perform(get("/api/admin/claims")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/admin/claims").session(session(customer))).andExpect(status().isForbidden());
		mvc.perform(get("/api/admin/claims").session(session(admin)))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].status").value("ditinjau"))
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].vendor").value("Vendor Klaim"))
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].amount").value(250000))
				// dipakai dialog klaim untuk memuat foto serah terima & pengembalian pesanan itu
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].orderId").value(
						jdbc.queryForObject("select order_id from klaim where klaim_id=?", Long.class, claim).intValue()));
		assertEquals("diajukan", jdbc.queryForObject("select status from klaim where klaim_id=?", String.class, claim)); // tampilan saja, data tak diubah
	}

	@Test
	void decisionNeedsHeaderAdminAndReasonForRejection() throws Exception {
		mvc.perform(post("/api/admin/claims/" + claim + "/decision").session(session(admin))
				.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"disetujui\"}")).andExpect(status().isForbidden());
		mvc.perform(post("/api/admin/claims/" + claim + "/decision").header("X-Admin-Claims", "1").session(session(customer))
				.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"disetujui\"}")).andExpect(status().isForbidden());
		decide("{\"status\":\"ditolak\",\"note\":\"  \"}").andExpect(status().isBadRequest());
		decide("{\"status\":\"selesai\"}").andExpect(status().isBadRequest());
	}

	@Test
	void decisionIsRecordedOnceOnly() throws Exception {
		decide("{\"status\":\"ditolak\",\"note\":\"Bukti tidak cukup\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ditolak"))
				.andExpect(jsonPath("$.note").value("Bukti tidak cukup"))
				.andExpect(jsonPath("$.decidedBy").value("Pengguna Uji " + admin));
		assertEquals(admin, jdbc.queryForObject("select diputuskan_oleh from klaim where klaim_id=?", Long.class, claim));
		decide("{\"status\":\"disetujui\"}").andExpect(status().isConflict());
		mvc.perform(post("/api/admin/claims/0/decision").header("X-Admin-Claims", "1").session(session(admin))
				.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"disetujui\"}")).andExpect(status().isNotFound());
	}

	@Test
	void approvalForfeitsHeldDepositWithoutRefundingTheCustomer() throws Exception {
		jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) select order_id,'deposit','payment_gateway',250000,'terverifikasi',? from klaim where klaim_id=?",
				"DEP-" + token, claim);
		decide("{\"status\":\"disetujui\",\"note\":\"Tenda sobek\"}").andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("disetujui")).andExpect(jsonPath("$.compensation").value(250000));
		assertEquals(0, jdbc.queryForObject("select count(*) from pengembalian_dana where klaim_id=?", Integer.class, claim));
		decide("{\"status\":\"disetujui\"}").andExpect(status().isConflict());
	}

	@Test
	void rejectionRecordsNoCompensation() throws Exception {
		decide("{\"status\":\"ditolak\",\"note\":\"Bukti kurang\",\"amount\":500}").andExpect(status().isOk()).andExpect(jsonPath("$.compensation").isEmpty());
		assertEquals(0, jdbc.queryForObject("select count(*) from pengembalian_dana where klaim_id=?", Integer.class, claim));
	}
}
