package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Actual PostgreSQL + KYC documents. Fixture rows roll back and private files are isolated. */
@SpringBootTest
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class VendorBusinessPolicyDatabaseTest {
    @TempDir static Path storage;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) { registry.add("app.kyc.storage-root", () -> storage.toString()); }
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    JdbcTemplate jdbc;
    MockMvc mvc;
    long vendorUser, admin, customer;
    String email, token;
    static final String PROFILE = """
        {"nama_vendor":"Usaha Sewa","kota":"Bogor","alamat":"Alamat operasional","deskripsi":"Penyewaan perlengkapan acara"}
        """;
    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(source); token = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
        vendorUser = -Math.max(100L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 100);
        admin = vendorUser + 1; customer = vendorUser + 2; email = "activation-" + token + "@example.test";
        for (long id : new long[] { vendorUser, admin, customer }) jdbc.update("""
            insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Activation fixture',?,'fixture',?)
            """, id, id == vendorUser ? email : "activation-" + id + "-" + token + "@example.test", id == admin ? "admin" : id == customer ? "customer" : "vendor");
    }
    MockHttpSession session(long id) { var s = new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID, id); return s; }
    ResultActions save(String body) throws Exception { return mvc.perform(put("/api/vendor/settings/business").session(session(vendorUser))
        .header("X-Vendor-Settings", "1").contentType(MediaType.APPLICATION_JSON).content(body)); }
    boolean active() { return Boolean.TRUE.equals(jdbc.queryForObject("select status_aktif from vendor where user_id=?", Boolean.class, vendorUser)); }
    void protectedLists(int expected) throws Exception {
        for (String path : new String[] { "/api/vendor/catalog", "/api/vendor/orders", "/api/vendor/handovers", "/api/vendor/claims", "/api/vendor/payouts" })
            mvc.perform(get(path).session(session(vendorUser))).andExpect(status().is(expected));
    }
    long submit() throws Exception {
        String identity = """
            {"nama":"Activation fixture","nik":"0000000000000000","tempat_lahir":"Bogor","tanggal_lahir":"2000-01-01","alamat":"Alamat uji","consent":true}
            """;
        mvc.perform(multipart("/api/kyc").session(session(vendorUser)).header("X-KYC-Request", "1")
            .file(new MockMultipartFile("data", "data.json", "application/json", identity.getBytes(StandardCharsets.UTF_8)))
            .file(KycDocumentStoreTest.image("ktp")).file(KycDocumentStoreTest.image("selfie"))).andExpect(status().isCreated());
        return jdbc.queryForObject("select max(kyc_id) from kyc_verifikasi where user_id=?", Long.class, vendorUser);
    }
    void decide(long kyc, String status) throws Exception {
        mvc.perform(post("/api/admin/kyc/" + kyc + "/decision").session(session(admin)).contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"" + status + "\",\"catatan_admin\":\"Catatan pemeriksaan fixture\"}")).andExpect(status().isOk());
    }

    @Test void readinessRequiresAnActiveVendorAndDoesNotCreateABusiness() throws Exception {
        mvc.perform(get("/api/vendor/readiness")).andExpect(status().isUnauthorized());
        for (long id : new long[] { admin, customer }) mvc.perform(get("/api/vendor/readiness").session(session(id))).andExpect(status().isForbidden());
        mvc.perform(get("/api/vendor/readiness").session(session(vendorUser))).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store")).andExpect(jsonPath("$.userId").value(String.valueOf(vendorUser)))
            .andExpect(jsonPath("$.profileComplete").value(false)).andExpect(jsonPath("$.missingFields.length()").value(4))
            .andExpect(jsonPath("$.ready").value(false));
        protectedLists(403);
        assertEquals(0, jdbc.queryForObject("select count(*) from vendor where user_id=?", Integer.class, vendorUser));
    }

    @Test void fullProfileWithoutVerifiedKycNeverActivatesAndCannotBypassViaApi() throws Exception {
        save(PROFILE.replace("}", ",\"status_aktif\":true,\"status_verifikasi\":\"terverifikasi\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.business.status_aktif").value(false));
        for (String state : new String[] { "belum_diverifikasi", "menunggu", "ditolak" }) {
            jdbc.update("update pengguna set status_verifikasi=? where user_id=?", state, vendorUser);
            jdbc.update("update vendor set status_aktif=true where user_id=?", vendorUser); // stale/manual flag cannot bypass the guard
            protectedLists(403);
            mvc.perform(get("/api/vendor/catalog/1").session(session(vendorUser))).andExpect(status().isForbidden());
            mvc.perform(get("/api/vendor/catalog/1/photo").session(session(vendorUser))).andExpect(status().isForbidden());
            mvc.perform(get("/api/vendor/orders/1").session(session(vendorUser))).andExpect(status().isForbidden());
            mvc.perform(get("/api/vendor/handovers/1").session(session(vendorUser))).andExpect(status().isForbidden());
            mvc.perform(get("/api/orders/1/handovers").session(session(vendorUser))).andExpect(status().isForbidden());
        }
        mvc.perform(post("/api/vendor/catalog/setup").session(session(vendorUser)).header("X-Catalog-Request", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Bypass\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/vendor/orders/setup").session(session(vendorUser)).header("X-Vendor-Orders", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Bypass\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/vendor/handovers/1/action").session(session(vendorUser)).header("X-Handover-Request", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"handover\",\"expectedStatus\":\"dikonfirmasi\",\"confirmed\":true}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/vendor/claims/1/process").session(session(vendorUser)).header("X-Vendor-Claims", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"from\":\"diajukan\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/vendor/payouts/request").session(session(vendorUser)).header("X-Vendor-Payouts", "1"))
            .andExpect(status().isForbidden());
    }

    @Test void savingCompleteProfileAfterKycActivatesAndRemovingAFieldDeactivates() throws Exception {
        jdbc.update("update pengguna set status_verifikasi='terverifikasi' where user_id=?", vendorUser);
        save(PROFILE).andExpect(status().isOk()).andExpect(jsonPath("$.business.status_aktif").value(true));
        assertTrue(active()); protectedLists(200);
        for (String field : new String[] { "Bogor", "Alamat operasional", "Penyewaan perlengkapan acara" }) {
            save(PROFILE.replace(field, "   ")).andExpect(status().isOk()).andExpect(jsonPath("$.business.status_aktif").value(false));
            assertFalse(active()); protectedLists(403);
            save(PROFILE).andExpect(status().isOk()).andExpect(jsonPath("$.business.status_aktif").value(true));
        }
    }

    @Test void approvalAfterProfileActivatesAndMakesExistingItemsVisibleInCatalog() throws Exception {
        save(PROFILE).andExpect(status().isOk()); assertFalse(active());
        long category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, token);
        long vendor = jdbc.queryForObject("select vendor_id from vendor where user_id=?", Long.class, vendorUser);
        long item = jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total,status) values (?,?,'Alat aktivasi',100,2,'aktif') returning item_id", Long.class, vendor, category);
        mvc.perform(get("/api/catalog/" + item)).andExpect(status().isNotFound());
        long kyc = submit(); assertFalse(active()); protectedLists(403);
        decide(kyc, "terverifikasi"); assertTrue(active()); protectedLists(200);
        mvc.perform(get("/api/catalog/" + item)).andExpect(status().isOk()).andExpect(jsonPath("$.verified").value(true));
        mvc.perform(get("/api/vendor/readiness").session(session(vendorUser))).andExpect(jsonPath("$.ready").value(true));
    }

    @Test void approvalWithPartialProfileStillBlocksUntilTheProfileIsComplete() throws Exception {
        save("{\"nama_vendor\":\"Usaha Sewa\"}").andExpect(status().isOk());
        decide(submit(), "terverifikasi"); assertFalse(active()); protectedLists(403);
        mvc.perform(get("/api/vendor/readiness").session(session(vendorUser))).andExpect(jsonPath("$.verification").value("terverifikasi"))
            .andExpect(jsonPath("$.missingFields.length()").value(3)).andExpect(jsonPath("$.ready").value(false));
        save(PROFILE).andExpect(jsonPath("$.business.status_aktif").value(true)); protectedLists(200);
    }

    @Test void rejectedAndResubmittedKycRemainsInactiveUntilApproved() throws Exception {
        save(PROFILE).andExpect(status().isOk());
        decide(submit(), "ditolak"); assertFalse(active()); protectedLists(403);
        long next = submit(); assertFalse(active()); protectedLists(403);
        decide(next, "terverifikasi"); assertTrue(active()); protectedLists(200);
    }

    @Test void administratorCannotMutateAccountOrOverrideAutomaticActivation() throws Exception {
        save(PROFILE).andExpect(status().isOk());
        String body = """
            {"name":"Usaha Sewa","owner":"Pemilik uji","email":"%s","city":"Bogor","address":"Alamat","description":"Usaha penyewaan","status":"Aktif","businessStatus":"Aktif"}
            """.formatted(email);
        String path = "/api/admin/accounts/vendor/" + vendorUser;
        mvc.perform(put(path).session(session(admin)).header("X-Admin-Accounts", "1").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isMethodNotAllowed());
        decide(submit(), "terverifikasi"); assertTrue(active());
        mvc.perform(put(path).session(session(admin)).header("X-Admin-Accounts", "1").contentType(MediaType.APPLICATION_JSON)
            .content(body.replace("\"businessStatus\":\"Aktif\"", "\"businessStatus\":\"Nonaktif\"")))
            .andExpect(status().isMethodNotAllowed());
        mvc.perform(put(path).session(session(admin)).header("X-Admin-Accounts", "1").contentType(MediaType.APPLICATION_JSON)
            .content(body.replace("\"status\":\"Aktif\"", "\"status\":\"Nonaktif\"")))
            .andExpect(status().isMethodNotAllowed());
        assertTrue(active()); protectedLists(200);
    }
}
