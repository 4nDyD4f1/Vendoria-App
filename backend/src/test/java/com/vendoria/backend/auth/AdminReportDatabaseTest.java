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

/** Real PostgreSQL tests for /api/admin/reports/*; all fixture rows roll back. */
@SpringBootTest
@Transactional
class AdminReportDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, customer, admin, vendorId, payout;
	private String code, vendorName;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		String token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		customer = vendorUser + 1;
		admin = vendorUser + 2;
		for (long id : new long[] {vendorUser, customer, admin}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "report-test-" + id + "-" + token + "@example.test",
					id == customer ? "customer" : id == admin ? "admin" : "vendor");
		}
		vendorName = "Vendor Laporan " + token.substring(0, 6);
		vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, ?) returning vendor_id", Long.class, vendorUser, vendorName);
		code = "VND-RPT-" + token.substring(0, 8);
		long order = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp, status_pesanan, tanggal_pemesanan)
				values (?, ?, ?, '2030-01-12', '2030-01-14', 1000000, 250000, 'berjalan', '2030-01-10 10:00:00+07') returning order_id
				""", Long.class, customer, vendorId, code);
		payout = jdbc.queryForObject("insert into pencairan_dana(order_id, vendor_id, jumlah, status, bank, nomor_rekening, nama_pemilik) values (?, ?, 950000, 'menunggu', 'BCA', '883012347992', 'Budi Pemilik') returning pencairan_id", Long.class, order, vendorId);
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	@Test
	void reportsAreAdminOnly() throws Exception {
		for (String path : new String[] {"/api/admin/reports/transactions", "/api/admin/reports/payouts"}) {
			mvc.perform(get(path)).andExpect(status().isUnauthorized());
			mvc.perform(get(path).session(session(customer))).andExpect(status().isForbidden());
			mvc.perform(get(path).session(session(vendorUser))).andExpect(status().isForbidden());
		}
	}

	@Test
	void transactionsFilterByDateAndMapStatus() throws Exception {
		mvc.perform(get("/api/admin/reports/transactions").param("start", "2030-01-01").param("end", "2030-01-31").session(session(admin)))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(code))
				.andExpect(jsonPath("$[0].date").value("2030-01-10"))
				.andExpect(jsonPath("$[0].vendor").value(vendorName))
				.andExpect(jsonPath("$[0].total").value(1000000))
				.andExpect(jsonPath("$[0].status").value("Diproses"));
		mvc.perform(get("/api/admin/reports/transactions").param("start", "2030-02-01").session(session(admin)))
				.andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id=='" + code + "')]").isEmpty());
		mvc.perform(get("/api/admin/reports/transactions").param("start", "2030-02-01").param("end", "2030-01-01").session(session(admin)))
				.andExpect(status().isBadRequest());
		mvc.perform(get("/api/admin/reports/transactions").param("start", "bukan-tanggal").session(session(admin)))
				.andExpect(status().isBadRequest());
	}

	@Test
	void payoutsListShowsVendorOrderAndAmount() throws Exception {
		mvc.perform(get("/api/admin/reports/payouts").session(session(admin)))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$[?(@.order=='" + code + "')].vendor").value(vendorName))
				.andExpect(jsonPath("$[?(@.order=='" + code + "')].amount").value(950000))
				.andExpect(jsonPath("$[?(@.order=='" + code + "')].status").value("menunggu"));
	}

	private ResultActions decide(long id, long user, boolean header, String body) throws Exception {
		var request = post("/api/admin/reports/payouts/" + id + "/decision").session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body);
		return mvc.perform(header ? request.header("X-Admin-Payouts", "1") : request);
	}

	@Test
	void payoutShowsDestinationAccountOnlyWhileItStillNeedsTransfer() throws Exception {
		String mine = "$[?(@.order=='" + code + "')]";
		mvc.perform(get("/api/admin/reports/payouts").session(session(admin)))
				.andExpect(jsonPath(mine + ".bank").value("BCA")).andExpect(jsonPath(mine + ".account").value("883012347992")).andExpect(jsonPath(mine + ".owner").value("Budi Pemilik"));
		jdbc.update("update pencairan_dana set status='berhasil', referensi_transfer='REF-1' where pencairan_id=?", payout);
		mvc.perform(get("/api/admin/reports/payouts").session(session(admin))).andExpect(jsonPath(mine + ".account").value("8830-••••-7992"));
	}

	@Test
	void decisionMovesForwardOnlyAndNeedsTransferReferenceToFinish() throws Exception {
		decide(payout, admin, false, "{\"status\":\"diproses\"}").andExpect(status().isForbidden());
		decide(payout, vendorUser, true, "{\"status\":\"diproses\"}").andExpect(status().isForbidden());
		decide(payout, admin, true, "{\"status\":\"menunggu\"}").andExpect(status().isBadRequest());
		decide(0, admin, true, "{\"status\":\"diproses\"}").andExpect(status().isNotFound());
		decide(payout, admin, true, "{\"status\":\"berhasil\",\"reference\":\"REF-X\"}").andExpect(status().isConflict()); // belum diproses

		decide(payout, admin, true, "{\"status\":\"diproses\"}").andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("diproses")).andExpect(jsonPath("$.processedBy").value("Pengguna Uji " + admin));
		decide(payout, admin, true, "{\"status\":\"berhasil\"}").andExpect(status().isBadRequest());
		decide(payout, admin, true, "{\"status\":\"berhasil\",\"reference\":\"  \"}").andExpect(status().isBadRequest());

		long order2 = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp, status_pesanan)
				values (?, ?, ?, '2030-02-12', '2030-02-14', 1000, 0, 'selesai') returning order_id
				""", Long.class, customer, vendorId, code + "-2");
		jdbc.update("insert into pencairan_dana(order_id, vendor_id, jumlah, status, referensi_transfer) values (?, ?, 1000, 'berhasil', 'REF-PAKAI')", order2, vendorId);
		decide(payout, admin, true, "{\"status\":\"berhasil\",\"reference\":\"REF-PAKAI\"}").andExpect(status().isConflict()); // referensi unik
		assertEquals("diproses", jdbc.queryForObject("select status from pencairan_dana where pencairan_id=?", String.class, payout));

		decide(payout, admin, true, "{\"status\":\"berhasil\",\"reference\":\" REF-OK \"}").andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("berhasil")).andExpect(jsonPath("$.reference").value("REF-OK")).andExpect(jsonPath("$.paidAt").isNotEmpty())
				.andExpect(jsonPath("$.account").value("8830-••••-7992"));
		for (String back : new String[] {"diproses", "gagal", "dibatalkan"}) // status akhir tidak bisa diubah lagi
			decide(payout, admin, true, "{\"status\":\"" + back + "\"}").andExpect(status().isConflict());
	}

	@Test
	void pendingPayoutCanBeCancelled() throws Exception {
		decide(payout, admin, true, "{\"status\":\"dibatalkan\"}").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("dibatalkan"));
		assertNull(jdbc.queryForObject("select dicairkan_pada from pencairan_dana where pencairan_id=?", java.sql.Timestamp.class, payout));
	}
}
