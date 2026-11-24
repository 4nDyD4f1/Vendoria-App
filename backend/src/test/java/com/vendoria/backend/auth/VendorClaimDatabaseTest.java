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

/** Real PostgreSQL tests for /api/vendor/claims; all fixture rows roll back. */
@SpringBootTest
@Transactional
class VendorClaimDatabaseTest {
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private long vendorUser, otherVendorUser, customer, claim;

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		String token = UUID.randomUUID().toString();
		mvc = MockMvcBuilders.webAppContextSetup(context)
				.defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
		vendorUser = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		otherVendorUser = vendorUser + 1;
		customer = vendorUser + 2;
		for (long id : new long[] {vendorUser, otherVendorUser, customer}) {
			jdbc.update("""
					insert into pengguna(user_id, nama, email, no_telp, password_hash, role, status_verifikasi)
					overriding system value values (?, ?, ?, '081234567890', 'test-hash', ?, 'terverifikasi')
					""", id, "Pengguna Uji " + id, "vclaim-test-" + id + "-" + token + "@example.test", id == customer ? "customer" : "vendor");
		}
		long vendorId = jdbc.queryForObject("insert into vendor(user_id, nama_vendor, kota, alamat, deskripsi) values (?, 'Vendor Klaim A', 'Bogor', 'Alamat uji', 'Penyewaan alat') returning vendor_id", Long.class, vendorUser);
		jdbc.update("insert into vendor(user_id, nama_vendor, kota, alamat, deskripsi) values (?, 'Vendor Klaim B', 'Bogor', 'Alamat uji', 'Penyewaan alat')", otherVendorUser);
		long order = jdbc.queryForObject("""
				insert into pemesanan(user_id, vendor_id, kode_pemesanan, tanggal_mulai_sewa, tanggal_selesai_sewa, total_biaya_sewa, total_dp)
				values (?, ?, ?, current_date + 1, current_date + 3, 1000000, 250000) returning order_id
				""", Long.class, customer, vendorId, "VND-VCL-" + token.substring(0, 8));
		claim = jdbc.queryForObject("insert into klaim(order_id, user_id, alasan) values (?, ?, 'Barang rusak') returning klaim_id", Long.class, order, customer);
	}

	private MockHttpSession session(long id) {
		var session = new MockHttpSession();
		session.setAttribute(AuthController.SESSION_USER_ID, id);
		return session;
	}

	private ResultActions process(long user, long id, boolean header, String body) throws Exception {
		var request = post("/api/vendor/claims/" + id + "/process").session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body);
		return mvc.perform(header ? request.header("X-Vendor-Claims", "1") : request);
	}

	private static String from(String status) { return "{\"from\":\"" + status + "\"}"; }
	private String dbStatus() { return jdbc.queryForObject("select status from klaim where klaim_id=?", String.class, claim); }

	@Test
	void listShowsOnlyOwnClaimsToVendors() throws Exception {
		mvc.perform(get("/api/vendor/claims")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/vendor/claims").session(session(customer))).andExpect(status().isForbidden());
		mvc.perform(get("/api/vendor/claims").session(session(vendorUser)))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].status").value("diajukan"))
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].next").value("ditinjau"))
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].amount").value(250000))
				.andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')].customer").value("Pengguna Uji " + customer));
		mvc.perform(get("/api/vendor/claims").session(session(otherVendorUser))).andExpect(jsonPath("$[?(@.id=='KLM-" + claim + "')]").isEmpty());
	}

	@Test
	void statusOnlyMovesForwardAndNeverPastAdminDecision() throws Exception {
		process(vendorUser, claim, false, from("diajukan")).andExpect(status().isForbidden());
		process(customer, claim, true, from("diajukan")).andExpect(status().isForbidden());
		process(vendorUser, claim, true, from("bebas")).andExpect(status().isBadRequest());
		process(otherVendorUser, claim, true, from("diajukan")).andExpect(status().isNotFound()); // milik vendor lain
		process(vendorUser, claim, true, from("ditinjau")).andExpect(status().isConflict()); // tampilan basi
		assertEquals("diajukan", dbStatus());

		process(vendorUser, claim, true, from("diajukan")).andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ditinjau")).andExpect(jsonPath("$.next").isEmpty());
		process(vendorUser, claim, true, from("ditinjau")).andExpect(status().isConflict()); // menunggu admin, vendor tidak bisa setuju/tolak
		assertEquals("ditinjau", dbStatus());

		jdbc.update("update klaim set status='disetujui' where klaim_id=?", claim); // keputusan admin
		process(vendorUser, claim, true, from("disetujui")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("selesai"));
		process(vendorUser, claim, true, from("selesai")).andExpect(status().isConflict());
		assertEquals("selesai", dbStatus());
		process(vendorUser, 0, true, from("diajukan")).andExpect(status().isNotFound());
	}
}
