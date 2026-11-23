package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.transaction.AfterTransaction;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** API + PostgreSQL + penyimpanan privat asli; semua baris di-rollback, file dibersihkan saat rollback. */
@SpringBootTest
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class KycDatabaseTest {
	@TempDir static Path storage;
	@DynamicPropertySource static void properties(DynamicPropertyRegistry registry) { registry.add("app.kyc.storage-root", () -> storage.toString()); }
	@Autowired DataSource dataSource;
	@Autowired WebApplicationContext context;
	private JdbcTemplate jdbc;
	private MockMvc mvc;
	private Long customer;
	private Long other;
	private Long admin;
	private String token;
	private final String data = """
			{"nama":"KYC Fixture","nik":"0000000000000000","tempat_lahir":"Kota Uji","tanggal_lahir":"2000-01-01","alamat":"Alamat Uji","consent":true}
			""";

	@BeforeEach
	void setup() {
		jdbc = new JdbcTemplate(dataSource);
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		customer = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
		other = customer + 1; admin = customer + 2; token = UUID.randomUUID().toString();
		for (Long id : new Long[] {customer, other, admin}) jdbc.update("""
				insert into pengguna(user_id,nama,email,password_hash,role)
				overriding system value values (?, 'KYC Fixture', ?, 'test-hash', ?)
				""", id, "kyc-test-" + id + "-" + token + "@example.test", id.equals(admin) ? "admin" : "customer");
	}
	private MockHttpSession session(Long id) { var session = new MockHttpSession(); session.setAttribute(AuthController.SESSION_USER_ID, id); return session; }
	private MockMultipartFile json(String value) { return new MockMultipartFile("data", "data.json", "application/json", value.getBytes(StandardCharsets.UTF_8)); }
	private long submit() throws Exception {
		mvc.perform(multipart("/api/kyc").header("X-KYC-Request", "1").file(json(data)).file(KycDocumentStoreTest.image("ktp")).file(KycDocumentStoreTest.image("selfie")).session(session(customer)))
				.andExpect(status().isCreated()).andExpect(jsonPath("$.status_verifikasi").value("menunggu"))
				.andExpect(jsonPath("$.latest.documents_available").value(true));
		return jdbc.queryForObject("select kyc_id from kyc_verifikasi where user_id=? order by kyc_id desc limit 1", Long.class, customer);
	}
	private String state() { return jdbc.queryForObject("select status_verifikasi from pengguna where user_id=?", String.class, customer); }
	private void decide(long id, String next, String note, int expected) throws Exception {
		mvc.perform(post("/api/admin/kyc/" + id + "/decision").session(session(admin)).contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\":\"" + next + "\",\"catatan_admin\":\"" + note + "\"}"))
				.andExpect(status().is(expected));
	}

	@Test
	void fullSubmissionAndApprovalPersistWithReviewerAndAccountStatus() throws Exception {
		long id = submit();
		assertEquals("menunggu", state());
		mvc.perform(get("/api/admin/kyc").param("q", token).session(session(admin))).andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].kyc_id").value(id));
		mvc.perform(get("/api/kyc/" + id).session(session(admin))).andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.identity.nik").value("0000000000000000"));
		decide(id, "terverifikasi", "Dokumen sesuai", 200);
		assertEquals("terverifikasi", state());
		var row = jdbc.queryForMap("select * from kyc_verifikasi where kyc_id=?", id);
		assertEquals(admin, ((Number) row.get("diverifikasi_oleh")).longValue());
		assertNotNull(row.get("diputuskan_pada"));
		decide(id, "ditolak", "Keputusan lama tidak boleh ditimpa", 409);
		mvc.perform(get("/api/kyc/me").session(session(customer))).andExpect(status().isOk())
				.andExpect(jsonPath("$.status_verifikasi").value("terverifikasi"));
	}

	@Test
	void rejectionRequiresReasonAndAllowsFreshSubmissionWithoutOverwritingHistory() throws Exception {
		long first = submit();
		decide(first, "ditolak", "", 400);
		assertEquals("menunggu", state());
		decide(first, "ditolak", "Foto kurang jelas", 200);
		assertEquals("ditolak", state());
		long second = submit();
		assertNotEquals(first, second);
		assertEquals("ditolak", jdbc.queryForObject("select status from kyc_verifikasi where kyc_id=?", String.class, first));
		assertEquals(2, jdbc.queryForObject("select count(*) from kyc_verifikasi where user_id=?", Integer.class, customer));
	}

	@Test
	void onlyOwnerOrActiveAdminCanReadPrivateDocumentsOrDecide() throws Exception {
		long id = submit();
		mvc.perform(get("/api/kyc/" + id + "/documents/ktp").session(session(customer)))
				.andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(header().string("Cache-Control", "no-store"));
		mvc.perform(get("/api/kyc/" + id).session(session(other))).andExpect(status().isForbidden());
		mvc.perform(get("/api/kyc/" + id + "/documents/ktp").session(session(other))).andExpect(status().isForbidden());
		mvc.perform(get("/api/kyc/" + id + "/documents/ktp")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/admin/kyc").session(session(customer))).andExpect(status().isForbidden());
		mvc.perform(post("/api/admin/kyc/" + id + "/decision").session(session(customer)).contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\":\"terverifikasi\"}")).andExpect(status().isForbidden());
		jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", admin);
		mvc.perform(get("/api/kyc/" + id).session(session(admin))).andExpect(status().isForbidden());
	}

	@Test
	void duplicatePendingInvalidIdentityMissingConsentAndDisguisedUploadAreRejected() throws Exception {
		mvc.perform(multipart("/api/kyc").header("X-KYC-Request", "1").file(json(data.replace("0000000000000000", "short"))).file(KycDocumentStoreTest.image("ktp")).file(KycDocumentStoreTest.image("selfie")).session(session(customer)))
				.andExpect(status().isBadRequest());
		mvc.perform(multipart("/api/kyc").header("X-KYC-Request", "1").file(json(data.replace("true", "false"))).file(KycDocumentStoreTest.image("ktp")).file(KycDocumentStoreTest.image("selfie")).session(session(customer)))
				.andExpect(status().isBadRequest());
		mvc.perform(multipart("/api/kyc").header("X-KYC-Request", "1").file(json(data)).file(new MockMultipartFile("ktp", "fake.png", "image/png", "not an image".getBytes(StandardCharsets.UTF_8))).file(KycDocumentStoreTest.image("selfie")).session(session(customer)))
				.andExpect(status().isBadRequest());
		assertEquals(0, jdbc.queryForObject("select count(*) from kyc_verifikasi where user_id=?", Integer.class, customer));
		submit();
		mvc.perform(multipart("/api/kyc").header("X-KYC-Request", "1").file(json(data)).file(KycDocumentStoreTest.image("ktp")).file(KycDocumentStoreTest.image("selfie")).session(session(customer)))
				.andExpect(status().isConflict());
		assertEquals(1, jdbc.queryForObject("select count(*) from kyc_verifikasi where user_id=?", Integer.class, customer));
	}

	@Test
	void crossOriginSimpleFormsCannotSubmitWithoutRequestHeader() throws Exception {
		mvc.perform(multipart("/api/kyc").file(json(data)).file(KycDocumentStoreTest.image("ktp")).file(KycDocumentStoreTest.image("selfie")).session(session(customer)))
				.andExpect(status().isForbidden());
		assertEquals(0, jdbc.queryForObject("select count(*) from kyc_verifikasi where user_id=?", Integer.class, customer));
	}

	@Test
	void legacyExternalDocumentLocationsAreNotFetchedOrApproved() throws Exception {
		long id = jdbc.queryForObject("insert into kyc_verifikasi(user_id,jenis_dokumen,dokumen_url) values (?,'KTP','http://127.0.0.1:9/private') returning kyc_id", Long.class, customer);
		mvc.perform(get("/api/kyc/" + id).session(session(admin))).andExpect(status().isOk())
				.andExpect(jsonPath("$.documents_available").value(false));
		decide(id, "terverifikasi", "", 409);
	}

	@AfterTransaction
	void rollbackLeavesNoDocumentBundles() throws Exception {
		try (var entries = Files.list(storage)) { assertEquals(1, entries.count()); }
	}
}
