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

/** Real PostgreSQL tests for /api/vendor/notifications; all fixture rows roll back. */
@SpringBootTest
@Transactional
class VendorNotificationDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, otherVendorUser, customer, vendorId, otherId, newOrder, serahOrder, claim, processing, paid, oldPaid, failed;
	private String token;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		otherVendorUser = vendorUser + 1;
		customer = vendorUser + 2;
		for (long id : new long[] {vendorUser, otherVendorUser, customer}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "vnotif-test-" + id + "-" + token + "@example.test", id == customer ? "customer" : "vendor");
		}
		vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Vendor Notif') returning vendor_id", Long.class, vendorUser);
		otherId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor) values (?, 'Vendor Lain') returning vendor_id", Long.class, otherVendorUser);
		newOrder = order(vendorId, "menunggu_konfirmasi", "A");
		serahOrder = order(vendorId, "dikonfirmasi", "B");
		settle(serahOrder);
		order(vendorId, "berjalan", "C"); // tidak ada tindakan vendor
		order(otherId, "menunggu_konfirmasi", "D"); // milik vendor lain
		long claimOrder = order(vendorId, "berjalan", "E");
		claim = jdbc.queryForObject("insert into klaim(order_id, user_id, alasan) values (?, ?, 'Rusak') returning klaim_id", Long.class, claimOrder, customer);
		processing = payout(order(vendorId, "selesai", "F"), "diproses", "now()");
		paid = payout(order(vendorId, "selesai", "G"), "berhasil", "now()");
		oldPaid = payout(order(vendorId, "selesai", "H"), "berhasil", "now() - interval '30 days'"); // sudah lewat 7 hari
		failed = payout(order(vendorId, "selesai", "I"), "gagal", "now()");
	}

	private long order(long vendor, String status, String suffix) {
		return jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp, status_pesanan)
				values (?, ?, ?, current_date + 1, current_date + 3, 100000, 0, ?) returning order_id
				""", Long.class, customer, vendor, "VND-VN" + suffix + "-" + token.substring(0, 6), status);
	}

	private void settle(long order) {
		jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) values (?,'pelunasan','payment_gateway',?,'terverifikasi',?)", order, 100000, "SETTLE-" + order + "-" + token);
	}

	private long payout(long order, String status, String paidAt) {
		return jdbc.queryForObject("insert into pencairan_dana(order_id, vendor_id, jumlah, status, dicairkan_pada, diajukan_pada) values (?, ?, 100000, ?, " + paidAt + ", " + paidAt + ") returning pencairan_id",
				Long.class, order, vendorId, status);
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private ResultActions list(long user) throws Exception { return mvc.perform(get("/api/vendor/notifications").session(session(user))); }

	private ResultActions send(String action, long user, boolean header, String body) throws Exception {
		var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/vendor/notifications/" + action)
				.session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body);
		return mvc.perform(header ? request.header("X-Vendor-Notifications", "1") : request);
	}

	private String id(String key) { return "$[?(@.id=='" + key + "')]"; }

	@Test
	void listShowsOnlyThisVendorsActionableEventsAndRecentOutcomes() throws Exception {
		mvc.perform(get("/api/vendor/notifications")).andExpect(status().isUnauthorized());
		list(customer).andExpect(status().isForbidden());
		list(vendorUser).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath(id("pesanan:" + newOrder + ":konfirmasi") + ".path").value("/vendor/pesanan/" + newOrder))
				.andExpect(jsonPath(id("pesanan:" + serahOrder + ":serah")).isNotEmpty())
				.andExpect(jsonPath(id("klaim:" + claim + ":buka") + ".path").value("/vendor/klaim/KLM-" + claim))
				.andExpect(jsonPath(id("pencairan:" + processing + ":diproses") + ".path").value("/vendor/pencairan/PCR-" + processing))
				.andExpect(jsonPath(id("pencairan:" + paid + ":berhasil")).isNotEmpty())
				.andExpect(jsonPath(id("pencairan:" + failed + ":gagal")).isNotEmpty())
				.andExpect(jsonPath(id("pencairan:" + oldPaid + ":berhasil")).isEmpty()) // berhasil > 7 hari tidak ditampilkan
				.andExpect(jsonPath(id("pesanan:" + serahOrder + ":lunas") + ".title").value("Uang masuk: pelunasan sewa"))
				.andExpect(jsonPath("$.length()").value(7)); // pesanan berjalan dan milik vendor lain tidak muncul
		list(otherVendorUser).andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void unverifiedVendorGetsKycReminderEvenWithoutBusinessProfile() throws Exception {
		long fresh = vendorUser + 3;
		jdbc.update("insert into pengguna(user_id, nama, email, password_hash, role) overriding system value values (?, 'Vendor Baru', ?, 'test-hash', 'vendor')",
				fresh, "vnotif-fresh-" + token + "@example.test");
		list(fresh).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath(id("kyc:0:belum") + ".path").value("/vendor/kyc"));
		send("read", fresh, true, "{\"ids\":[\"kyc:0:belum\"]}").andExpect(status().isNoContent());
		list(fresh).andExpect(jsonPath(id("kyc:0:belum") + ".read").value(true));
		send("dismiss", fresh, true, "{\"ids\":[\"kyc:0:belum\"]}").andExpect(status().isNoContent());
		list(fresh).andExpect(jsonPath("$.length()").value(0));
		list(vendorUser).andExpect(jsonPath(id("kyc:0:belum")).isEmpty());
	}

	@Test
	void stageChangesReplaceNotification() throws Exception {
		jdbc.update("update pemesanan set status_pesanan='dikonfirmasi' where order_id=?", newOrder);
		list(vendorUser).andExpect(jsonPath(id("pesanan:" + newOrder + ":serah")).isEmpty()); // belum dilunasi
		settle(newOrder);
		list(vendorUser).andExpect(jsonPath(id("pesanan:" + newOrder + ":konfirmasi")).isEmpty()).andExpect(jsonPath(id("pesanan:" + newOrder + ":serah")).isNotEmpty());
		jdbc.update("update klaim set status='disetujui', diputuskan_pada=now() where klaim_id=?", claim);
		list(vendorUser).andExpect(jsonPath(id("klaim:" + claim + ":buka")).isEmpty()).andExpect(jsonPath(id("klaim:" + claim + ":putusan") + ".title").value("Deposit jaminan menjadi hak Anda"));
	}

	@Test
	void readAndDismissAreRememberedPerUserAndIgnoreForeignKeys() throws Exception {
		String key = "pesanan:" + newOrder + ":konfirmasi";
		send("read", vendorUser, false, "{\"ids\":[\"" + key + "\"]}").andExpect(status().isForbidden());
		send("read", customer, true, "{\"ids\":[\"" + key + "\"]}").andExpect(status().isForbidden());
		send("read", vendorUser, true, "{\"ids\":[]}").andExpect(status().isBadRequest());
		send("read", vendorUser, true, "{\"ids\":[\"x; drop\"]}").andExpect(status().isBadRequest());

		send("read", vendorUser, true, "{\"ids\":[\"" + key + "\"]}").andExpect(status().isNoContent());
		list(vendorUser).andExpect(jsonPath(id(key) + ".read").value(true));
		send("dismiss", vendorUser, true, "{\"ids\":[\"" + key + "\",\"pencairan:" + failed + ":gagal\"]}").andExpect(status().isNoContent());
		list(vendorUser).andExpect(jsonPath(id(key)).isEmpty()).andExpect(jsonPath(id("pencairan:" + failed + ":gagal")).isEmpty());

		// kunci milik vendor lain dan kunci asal tidak disimpan
		send("read", otherVendorUser, true, "{\"ids\":[\"" + key + "\",\"klaim:0:buka\"]}").andExpect(status().isNoContent());
		assertEquals(0, jdbc.queryForObject("select count(*) from notifikasi_admin where user_id=?", Integer.class, otherVendorUser));
		assertEquals(2, jdbc.queryForObject("select count(*) from notifikasi_admin where user_id=?", Integer.class, vendorUser));
	}
}
