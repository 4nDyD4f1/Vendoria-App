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

/** Real PostgreSQL tests for /api/admin/notifications; all fixture rows roll back. */
@SpringBootTest
@Transactional
class AdminNotificationDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, customer, admin, otherAdmin, kyc, claim, payout;
	private String kycKey, claimKey, payoutKey;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		String token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		customer = vendorUser + 1;
		admin = vendorUser + 2;
		otherAdmin = vendorUser + 3;
		for (long id : new long[] {vendorUser, customer, admin, otherAdmin}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "notif-test-" + id + "-" + token + "@example.test",
					id == customer ? "customer" : id >= admin ? "admin" : "vendor");
		}
		long vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Vendor Notif') returning vendor_id", Long.class, vendorUser);
		long order = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp)
				values (?, ?, ?, current_date + 1, current_date + 3, 1000000, 250000) returning order_id
				""", Long.class, customer, vendorId, "VND-NTF-" + token.substring(0, 8));
		kyc = jdbc.queryForObject("insert into kyc_verifikasi(user_id, jenis_dokumen, dokumen_url) values (?, 'ktp', 'x') returning kyc_id", Long.class, customer);
		claim = jdbc.queryForObject("insert into klaim(order_id, user_id, alasan) values (?, ?, 'Rusak') returning klaim_id", Long.class, order, customer);
		payout = jdbc.queryForObject("insert into pencairan_dana(order_id, vendor_id, jumlah) values (?, ?, 750000) returning pencairan_id", Long.class, order, vendorId);
		kycKey = "kyc:" + kyc; claimKey = "klaim:" + claim; payoutKey = "pencairan:" + payout;
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private ResultActions list(long user) throws Exception { return mvc.perform(get("/api/admin/notifications").session(session(user))); }

	private ResultActions send(String action, long user, boolean header, String body) throws Exception {
		var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/notifications/" + action).session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body);
		return mvc.perform(header ? request.header("X-Admin-Notifications", "1") : request);
	}

	private String id(String key) { return "$[?(@.id=='" + key + "')]"; }

	@Test
	void listIsAdminOnlyAndShowsPendingQueues() throws Exception {
		mvc.perform(get("/api/admin/notifications")).andExpect(status().isUnauthorized());
		list(customer).andExpect(status().isForbidden());
		list(admin).andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath(id(kycKey) + ".path").value("/admin/kyc/KYC-" + kyc))
				.andExpect(jsonPath(id(claimKey) + ".path").value("/admin/klaim/KLM-" + claim))
				.andExpect(jsonPath(id(payoutKey) + ".path").value("/admin/laporan/pencairan/PCR-" + payout))
				.andExpect(jsonPath(id(payoutKey) + ".read").value(false));
	}

	@Test
	void notificationDisappearsWhenQueueIsDecided() throws Exception {
		jdbc.update("update klaim set status='ditolak' where klaim_id=?", claim);
		list(admin).andExpect(jsonPath(id(claimKey)).isEmpty()).andExpect(jsonPath(id(kycKey)).isNotEmpty());
	}

	@Test
	void readAndDismissAreRememberedPerAdmin() throws Exception {
		send("read", admin, false, "{\"ids\":[\"" + kycKey + "\"]}").andExpect(status().isForbidden());
		send("read", customer, true, "{\"ids\":[\"" + kycKey + "\"]}").andExpect(status().isForbidden());
		send("read", admin, true, "{\"ids\":[]}").andExpect(status().isBadRequest());
		send("read", admin, true, "{\"ids\":[\"x; drop table\"]}").andExpect(status().isBadRequest());

		send("read", admin, true, "{\"ids\":[\"" + kycKey + "\",\"klaim:0\"]}").andExpect(status().isNoContent());
		list(admin).andExpect(jsonPath(id(kycKey) + ".read").value(true)).andExpect(jsonPath(id(claimKey) + ".read").value(false));
		list(otherAdmin).andExpect(jsonPath(id(kycKey) + ".read").value(false)); // status baca milik masing-masing admin
		assertEquals(1, jdbc.queryForObject("select count(*) from notifikasi_admin where user_id=?", Integer.class, admin)); // id asal tidak disimpan

		send("dismiss", admin, true, "{\"ids\":[\"" + payoutKey + "\"]}").andExpect(status().isNoContent());
		list(admin).andExpect(jsonPath(id(payoutKey)).isEmpty());
		list(otherAdmin).andExpect(jsonPath(id(payoutKey)).isNotEmpty());
		send("read", admin, true, "{\"ids\":[\"" + payoutKey + "\"]}").andExpect(status().isNoContent());
		list(admin).andExpect(jsonPath(id(payoutKey)).isEmpty()); // membaca tidak memulihkan yang sudah dihapus
	}
}
