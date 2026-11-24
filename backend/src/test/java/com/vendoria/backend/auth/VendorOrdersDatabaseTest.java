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

/** Real PostgreSQL tests for /api/vendor/orders; all fixture rows roll back. */
@SpringBootTest
@Transactional
class VendorOrdersDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	@Autowired HandoverPhotoStore handoverPhotos;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, otherVendorUser, customer, admin;
	private long categoryId;
	private String token;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; }))
				.build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		otherVendorUser = vendorUser + 1;
		customer = vendorUser + 2;
		admin = vendorUser + 3;
		for (long id : new long[] {vendorUser, otherVendorUser, customer, admin}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id,
					id == customer ? "Pelanggan Uji" : "Pengguna Uji " + id,
					"orders-test-" + id + "-" + token + "@example.test",
					id == customer ? "customer" : id == admin ? "admin" : "vendor");
		}
		categoryId = jdbc.queryForObject(
				"insert into kategori(nama_kategori) values (?) returning kategori_id",
				Long.class, "Orders Cat " + token);
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private long vendorProfile(long userId, String name) {
		return jdbc.queryForObject(
				"insert into vendor(user_id, nama_vendor, kota, alamat, deskripsi) values (?, ?, 'Bogor', 'Alamat uji', 'Penyewaan alat') returning vendor_id",
				Long.class, userId, name);
	}

	private long item(long vendorId, String name) {
		return jdbc.queryForObject(
				"insert into item(vendor_id, kategori_id, nama_barang, harga_sewa_per_hari, stok_total) values (?, ?, ?, 500000, 5) returning item_id",
				Long.class, vendorId, categoryId, name);
	}

	private long order(long vendorId, long itemId, String code, String status) {
		long orderId = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa,
				  lokasi_acara, total_biaya_sewa, total_dp, status_pesanan)
				values (?, ?, ?, current_date + 1, current_date + 3, 'Gedung Alumni IPB', 1000000, 250000, ?)
				returning order_id
				""", Long.class, customer, vendorId, code, status);
		jdbc.update("""
				insert into detail_item(order_id, item_id, jumlah_sewa, harga_saat_sewa, subtotal)
				values (?, ?, 2, 500000, 1000000)
				""", orderId, itemId);
		return orderId;
	}

	@Test
	void requiresActiveVendorRoleAndNeverCreatesProfileOnRead() throws Exception {
		mvc.perform(get("/api/vendor/orders")).andExpect(status().isUnauthorized());
		for (long id : new long[] {customer, admin}) {
			mvc.perform(get("/api/vendor/orders").session(session(id))).andExpect(status().isForbidden());
		}
		mvc.perform(get("/api/vendor/orders").session(session(vendorUser)))
				.andExpect(status().isForbidden());
		assertEquals(0, jdbc.queryForObject("select count(*) from vendor where user_id=?", Integer.class, vendorUser));

		jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", vendorUser);
		mvc.perform(get("/api/vendor/orders").session(session(vendorUser))).andExpect(status().isForbidden());
	}

	@Test
	void listsFiltersSearchesCountsAndIsolatesByVendor() throws Exception {
		long v1 = vendorProfile(vendorUser, "Vendor Satu");
		long v2 = vendorProfile(otherVendorUser, "Vendor Dua");
		long i1 = item(v1, "Tenda Roder VIP");
		long i2 = item(v2, "Sound System Pro");
		long o1 = order(v1, i1, "VND-" + token.substring(0, 8) + "-1", "menunggu_konfirmasi");
		long o2 = order(v1, i1, "VND-" + token.substring(0, 8) + "-2", "dikonfirmasi");
		long o3 = order(v2, i2, "VND-" + token.substring(0, 8) + "-3", "menunggu_konfirmasi");

		mvc.perform(get("/api/vendor/orders").session(session(vendorUser)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(2))
				.andExpect(jsonPath("$.counts.semua").value(2))
				.andExpect(jsonPath("$.counts.menunggu_konfirmasi").value(1))
				.andExpect(jsonPath("$.counts.dikonfirmasi").value(1))
				.andExpect(jsonPath("$.items[0].equipment_summary").value("Tenda Roder VIP ×2"));

		mvc.perform(get("/api/vendor/orders").param("status", "menunggu_konfirmasi").session(session(vendorUser)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].order_id").value(o1));

		mvc.perform(get("/api/vendor/orders").param("q", "Tenda Roder").session(session(vendorUser)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(2));

		mvc.perform(get("/api/vendor/orders").param("q", "#" + o2).session(session(vendorUser)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].order_id").value(o2));

		mvc.perform(get("/api/vendor/orders/" + o3).session(session(vendorUser))).andExpect(status().isNotFound());
		mvc.perform(post("/api/vendor/orders/" + o3 + "/action")
				.header("X-Vendor-Orders", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"proses\"}"))
				.andExpect(status().isNotFound());
	}

	@Test
	void detailIncludesItemsPaymentsClaimsAndHistory() throws Exception {
		long v1 = vendorProfile(vendorUser, "Vendor Detail");
		long i1 = item(v1, "Genset Silent 45 kVA");
		long o1 = order(v1, i1, "VND-DTL-" + token.substring(0, 8), "dikonfirmasi");
		jdbc.update("""
				insert into pembayaran(order_id, jenis, metode, jumlah, status, dibayar_pada, diverifikasi_pada)
				values (?, 'deposit', 'transfer_bank', 250000, 'terverifikasi', now(), now())
				""", o1);

		mvc.perform(get("/api/vendor/orders/" + o1).session(session(vendorUser)))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.order.order_id").value(o1))
				.andExpect(jsonPath("$.customer_verification").value("terverifikasi"))
				.andExpect(jsonPath("$.verified_payment_total").value(250000))
				.andExpect(jsonPath("$.items[0].nama_barang").value("Genset Silent 45 kVA"))
				.andExpect(jsonPath("$.payments[0].status").value("terverifikasi"));
	}

	@Test
	void processTransitionsLifecycleRecordsHistoryAndRespectsOpenClaims() throws Exception {
		long v1 = vendorProfile(vendorUser, "Vendor Proses");
		long i1 = item(v1, "Kursi Crossback");
		long o1 = order(v1, i1, "VND-PRC-" + token.substring(0, 8), "menunggu_konfirmasi");
		// Both APIs now enforce real inspection evidence before advancing the rental lifecycle.
		for (String type : new String[] {"serah_terima", "pengembalian"}) {
			for (int photo = 1; photo <= 4; photo++) {
				String locator = handoverPhotos.save(handoverPhotos.normalize(VendorHandoversDatabaseTest.image(photo)));
				org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
					new org.springframework.transaction.support.TransactionSynchronization() {
						@Override public void afterCompletion(int completion) { handoverPhotos.remove(locator); }
					});
				jdbc.update("insert into cek_barang(order_id,item_id,tipe_inspeksi,foto_kondisi,catatan_kondisi,diperiksa_oleh) values (?,?,?,?,?,?)",
					o1, i1, type, locator, "Kondisi lengkap dan diperiksa", vendorUser);
			}
		}

		String[] steps = {"dikonfirmasi", "berjalan", "dikembalikan"};
		String[] expectedFrom = {"menunggu_konfirmasi", "dikonfirmasi", "berjalan"};
		for (int i = 0; i < steps.length; i++) {
			mvc.perform(post("/api/vendor/orders/" + o1 + "/action")
					.header("X-Vendor-Orders", "1")
					.session(session(vendorUser))
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"action\":\"proses\",\"expected_status\":\"" + expectedFrom[i] + "\",\"catatan\":\"Langkah " + (i + 1) + "\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.order.status_pesanan").value(steps[i]));
		}

		// Open claim blocks completion from dikembalikan -> selesai
		long claimId = jdbc.queryForObject("""
				insert into klaim(order_id, user_id, alasan, status)
				values (?, ?, 'Kerusakan ringan', 'ditinjau') returning klaim_id
				""", Long.class, o1, customer);
		mvc.perform(post("/api/vendor/orders/" + o1 + "/action")
				.header("X-Vendor-Orders", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"proses\"}"))
				.andExpect(status().isConflict());

		jdbc.update("update klaim set status='selesai', diputuskan_pada=now() where klaim_id=?", claimId);
		mvc.perform(post("/api/vendor/orders/" + o1 + "/action")
				.header("X-Vendor-Orders", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"proses\",\"catatan\":\"Selesai tanpa kendala\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.order.status_pesanan").value("selesai"))
				.andExpect(jsonPath("$.order.can_process").value(false))
				.andExpect(jsonPath("$.order.can_cancel").value(false));

		assertEquals(4, jdbc.queryForObject(
				"select count(*) from riwayat_status_pesanan where order_id=?", Integer.class, o1));
	}

	@Test
	void cancelAllowedBeforeBerjalanAndRejectedAfterAndGuardsMutations() throws Exception {
		long v1 = vendorProfile(vendorUser, "Vendor Batal");
		long i1 = item(v1, "Lighting Set");
		long unpaid = order(v1, i1, "VND-UNP-" + token.substring(0, 8), "menunggu_pembayaran");
		long running = order(v1, i1, "VND-RUN-" + token.substring(0, 8), "berjalan");

		// Unpaid orders cannot be processed but can be cancelled
		mvc.perform(post("/api/vendor/orders/" + unpaid + "/action")
				.header("X-Vendor-Orders", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"proses\"}"))
				.andExpect(status().isConflict());

		mvc.perform(post("/api/vendor/orders/" + unpaid + "/action")
				.header("X-Vendor-Orders", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"batalkan\",\"catatan\":\"Stok mendadak rusak\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.order.status_pesanan").value("dibatalkan"));

		// Ongoing rental cannot be cancelled
		mvc.perform(post("/api/vendor/orders/" + running + "/action")
				.header("X-Vendor-Orders", "1")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"batalkan\"}"))
				.andExpect(status().isConflict());

		// Missing header or untrusted Origin rejected
		mvc.perform(post("/api/vendor/orders/" + running + "/action")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"proses\"}"))
				.andExpect(status().isForbidden());
		mvc.perform(post("/api/vendor/orders/setup")
				.header("X-Vendor-Orders", "1")
				.header("Origin", "https://untrusted.example")
				.session(session(vendorUser))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"Injected\"}"))
				.andExpect(status().isForbidden());
	}
}
