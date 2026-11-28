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

/** Real PostgreSQL tests for /api/vendor/payout-account and /api/vendor/payouts; all fixture rows roll back. */
@SpringBootTest
@Transactional
class VendorPayoutDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, otherVendorUser, noBusinessUser, customer, vendorId;
	private String token;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		otherVendorUser = vendorUser + 1;
		noBusinessUser = vendorUser + 2;
		customer = vendorUser + 3;
		for (long id : new long[] {vendorUser, otherVendorUser, noBusinessUser, customer}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, id == vendorUser ? "Budi Pemilik" : "Pengguna Uji " + id, "payout-test-" + id + "-" + token + "@example.test", id == customer ? "customer" : "vendor");
		}
		vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor, kota, alamat, deskripsi) values (?, 'Roder Tenda', 'Bogor', 'Alamat uji', 'Penyewaan alat') returning vendor_id", Long.class, vendorUser);
		jdbc.update("insert into vendor(user_id, nama_vendor, kota, alamat, deskripsi) values (?, 'Vendor Lain', 'Bogor', 'Alamat uji', 'Penyewaan alat')", otherVendorUser);
	}

	private long order(String status, long total, String suffix) {
		long order = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp, status_pesanan)
				values (?, ?, ?, current_date + 1, current_date + 3, ?, 0, ?) returning order_id
				""", Long.class, customer, vendorId, "VND-PO" + suffix + "-" + token.substring(0, 6), total, status);
		// pencairan hanya untuk pesanan yang sewanya lunas
		if (total > 0) jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) values (?,'pelunasan','payment_gateway',?,'terverifikasi',?)", order, total, "PO-" + order + "-" + token);
		return order;
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private ResultActions saveAccount(long user, boolean header, String body) throws Exception {
		var request = put("/api/vendor/payout-account").session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body);
		return mvc.perform(header ? request.header("X-Vendor-Payout-Account", "1") : request);
	}

	private ResultActions request(long user, boolean header) throws Exception {
		var request = post("/api/vendor/payouts/request").session(session(user));
		return mvc.perform(header ? request.header("X-Vendor-Payouts", "1") : request);
	}

	private static final String ACCOUNT = "{\"bank\":\"BCA\",\"number\":\"8830 1234-7992\",\"owner\":\"budi  pemilik\"}";

	@Test
	void accountNeedsBusinessMatchingNameAndNeverEchoesFullNumber() throws Exception {
		mvc.perform(get("/api/vendor/payout-account")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/vendor/payout-account").session(session(customer))).andExpect(status().isForbidden());
		mvc.perform(get("/api/vendor/payout-account").session(session(noBusinessUser)))
				.andExpect(status().isOk()).andExpect(jsonPath("$.business").value(false)).andExpect(jsonPath("$.account").isEmpty());
		saveAccount(noBusinessUser, true, ACCOUNT).andExpect(status().isConflict());
		saveAccount(vendorUser, false, ACCOUNT).andExpect(status().isForbidden());
		saveAccount(vendorUser, true, "{\"bank\":\"Permata\",\"number\":\"12345678\",\"owner\":\"Budi Pemilik\"}").andExpect(status().isBadRequest());
		saveAccount(vendorUser, true, "{\"bank\":\"BCA\",\"number\":\"123\",\"owner\":\"Budi Pemilik\"}").andExpect(status().isBadRequest());
		saveAccount(vendorUser, true, "{\"bank\":\"BCA\",\"number\":\"88301234\",\"owner\":\"Orang Lain\"}").andExpect(status().isBadRequest());

		saveAccount(vendorUser, true, ACCOUNT).andExpect(status().isOk())
				.andExpect(jsonPath("$.account.masked").value("8830-••••-7992")).andExpect(jsonPath("$.account.bank").value("BCA"))
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("88301234"))));
		saveAccount(vendorUser, true, "{\"bank\":\"BNI\",\"number\":\"99887766\",\"owner\":\"Roder Tenda\"}").andExpect(status().isOk()) // nama bisnis juga boleh; mengganti rekening
				.andExpect(jsonPath("$.account.bank").value("BNI"));
		assertEquals(1, jdbc.queryForObject("select count(*) from rekening_vendor where vendor_id=?", Integer.class, vendorId));
	}

	@Test
	void requestNeedsAccountThenCreatesOnePayoutPerEligibleOrderOnce() throws Exception {
		long done = order("selesai", 1000000, "A");
		order("selesai", 500000, "B");
		order("berjalan", 700000, "C"); // belum selesai
		long held = order("selesai", 300000, "D");
		jdbc.update("insert into klaim(order_id, user_id, alasan) values (?, ?, 'Rusak')", held, customer); // klaim aktif menahan dana
		long compensated = order("selesai", 400000, "E"); // klaim disetujui: ganti rugi 100.000 memotong dana
		long claimE = jdbc.queryForObject("insert into klaim(order_id, user_id, alasan, status) values (?, ?, 'Rusak', 'disetujui') returning klaim_id", Long.class, compensated, customer);
		jdbc.update("insert into pengembalian_dana(order_id, klaim_id, jumlah) values (?, ?, 100000)", compensated, claimE);
		long tooMuch = order("selesai", 1000, "G"); // bersih <= 0: tidak ada yang bisa dicairkan
		long claimG = jdbc.queryForObject("insert into klaim(order_id, user_id, alasan, status) values (?, ?, 'Rusak', 'disetujui') returning klaim_id", Long.class, tooMuch, customer);
		jdbc.update("insert into pengembalian_dana(order_id, klaim_id, jumlah) values (?, ?, 1000)", tooMuch, claimG);

		mvc.perform(get("/api/vendor/payouts").session(session(vendorUser))).andExpect(status().isOk())
				.andExpect(jsonPath("$.available.gross").value(1900000)).andExpect(jsonPath("$.available.fee").value(108000)) // 6% dari sewa dikurangi pengembalian
				.andExpect(jsonPath("$.available.claimDeduction").value(100000)).andExpect(jsonPath("$.available.amount").value(1692000))
				.andExpect(jsonPath("$.available.orders").value(3)).andExpect(jsonPath("$.available.feePercent").value(6.0))
				.andExpect(jsonPath("$.account.account").isEmpty());
		request(vendorUser, false).andExpect(status().isForbidden());
		request(customer, true).andExpect(status().isForbidden());
		request(vendorUser, true).andExpect(status().isConflict()); // belum ada rekening
		assertEquals(0, jdbc.queryForObject("select count(*) from pencairan_dana where vendor_id=?", Integer.class, vendorId));

		saveAccount(vendorUser, true, ACCOUNT).andExpect(status().isOk());
		request(vendorUser, true).andExpect(status().isOk()).andExpect(jsonPath("$.orders").value(3)).andExpect(jsonPath("$.amount").value(1692000));
		var row = jdbc.queryForMap("select status,bank,nomor_rekening,nama_pemilik,jumlah,jumlah_kotor,biaya_platform,persen_biaya,potongan_klaim from pencairan_dana where order_id=?", done);
		assertEquals("menunggu", row.get("status"));
		assertEquals(940000L, ((Number) row.get("jumlah")).longValue()); // 1.000.000 - 6%
		assertEquals(1000000L, ((Number) row.get("jumlah_kotor")).longValue());
		assertEquals(60000L, ((Number) row.get("biaya_platform")).longValue());
		assertEquals(6.0, ((Number) row.get("persen_biaya")).doubleValue());
		var cut = jdbc.queryForMap("select jumlah,biaya_platform,potongan_klaim from pencairan_dana where order_id=?", compensated);
		assertEquals(282000L, ((Number) cut.get("jumlah")).longValue()); // (400.000 - 100.000) - 6%
		assertEquals(100000L, ((Number) cut.get("potongan_klaim")).longValue());
		assertEquals(0, jdbc.queryForObject("select count(*) from pencairan_dana where order_id=?", Integer.class, tooMuch));
		assertEquals("BCA", row.get("bank"));
		assertEquals("88301234" + "7992", row.get("nomor_rekening")); // salinan lengkap untuk transfer
		assertEquals(0, jdbc.queryForObject("select count(*) from pencairan_dana where order_id=?", Integer.class, held));

		request(vendorUser, true).andExpect(status().isConflict()); // tidak ada dana tersisa; tidak bisa dobel
		mvc.perform(get("/api/vendor/payouts").session(session(vendorUser)))
				.andExpect(jsonPath("$.available.amount").value(0)).andExpect(jsonPath("$.items.length()").value(3))
				.andExpect(jsonPath("$.items[?(@.order=='VND-POA-" + token.substring(0, 6) + "')].fee").value(60000))
				.andExpect(jsonPath("$.items[0].account").value("8830-••••-7992"))
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("883012347992"))));

		saveAccount(vendorUser, true, "{\"bank\":\"BNI\",\"number\":\"99887766\",\"owner\":\"Roder Tenda\"}").andExpect(status().isOk());
		assertEquals("BCA", jdbc.queryForObject("select bank from pencairan_dana where order_id=?", String.class, done)); // riwayat tidak berubah

		jdbc.update("update pencairan_dana set status='gagal' where order_id=?", done);
		request(vendorUser, true).andExpect(status().isOk()).andExpect(jsonPath("$.orders").value(1)).andExpect(jsonPath("$.amount").value(940000)); // gagal boleh diajukan ulang
		mvc.perform(get("/api/vendor/payouts").session(session(otherVendorUser))).andExpect(jsonPath("$.items.length()").value(0)); // milik vendor lain tak terlihat
	}
}
