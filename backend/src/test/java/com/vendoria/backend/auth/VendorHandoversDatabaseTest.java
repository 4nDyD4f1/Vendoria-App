package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.transaction.AfterTransaction;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL + private filesystem + HTTP contract. All fixture rows/files roll back. */
@SpringBootTest
@Transactional
class VendorHandoversDatabaseTest {
    @Autowired InMemoryBlobStore blobs;
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    private JdbcTemplate jdbc;
    private MockMvc mvc;
    private long user, other, customer, stranger, admin, vendor, otherVendor, item, otherItem, order, otherOrder, category;
    private String token;

    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(source); token = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(request -> { request.setRemoteAddr(token); return request; })).build();
        user = -Math.max(100L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 100);
        other = user + 1; customer = user + 2; stranger = user + 3; admin = user + 4;
        for (long id : new long[] {user, other, customer, stranger, admin}) {
            jdbc.update("""
                insert into pengguna(user_id,nama,email,password_hash,role,status_verifikasi)
                overriding system value values (?,?,?,'test-hash',?,'terverifikasi')
                """, id, "Handover Tester " + id, "handover-" + id + "-" + token + "@example.test",
                id == admin ? "admin" : id == user || id == other ? "vendor" : "customer");
        }
        vendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,alamat,deskripsi) values (?,'Vendor Serah Terima','Bogor','Alamat uji','Penyewaan alat') returning vendor_id", Long.class, user);
        otherVendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,alamat,deskripsi) values (?,'Vendor Lain','Bogor','Alamat uji','Penyewaan alat') returning vendor_id", Long.class, other);
        category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, "Handover " + token);
        item = jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) values (?,?,'Tenda Handover',500000,5) returning item_id", Long.class, vendor, category);
        otherItem = jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) values (?,?,'Alat Vendor Lain',500000,5) returning item_id", Long.class, otherVendor, category);
        order = order(vendor, item, "dikonfirmasi", "A"); otherOrder = order(otherVendor, otherItem, "dikonfirmasi", "B");
    }

    private long order(long owner, long equipment, String status, String suffix) {
        long id = jdbc.queryForObject("""
            insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,total_biaya_sewa,total_dp,status_pesanan)
            values (?,?,?,current_date,current_date+1,1000000,250000,?) returning order_id
            """, Long.class, customer, owner, "VND-HO-" + suffix + token.substring(0, 8), status);
        jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,2,500000,1000000)", id, equipment);
        jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) values (?,'pelunasan','payment_gateway',?,'terverifikasi',?)", id, 1000000, "SETTLE-" + id + "-" + token);
        return id;
    }
    private MockHttpSession session(long id) { var result = new MockHttpSession(); result.setAttribute(AuthController.SESSION_USER_ID, id); return result; }
    static MockMultipartFile image(int shade) throws Exception {
        var picture = new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB);
        picture.setRGB(0, 0, shade * 1000 + 100);
        var bytes = new ByteArrayOutputStream(); ImageIO.write(picture, "png", bytes);
        return new MockMultipartFile("photo", "condition.png", "image/png", bytes.toByteArray());
    }
    private ResultActions upload(long actor, long targetOrder, long targetItem, String type, String status, int shade) throws Exception {
        var data = new MockMultipartFile("data", "data.json", "application/json", ("{\"itemId\":" + targetItem + ",\"type\":\"" + type + "\",\"expectedStatus\":\"" + status + "\",\"note\":\"2 unit, kondisi dan kelengkapan diperiksa\"}").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return mvc.perform(multipart("/api/vendor/handovers/" + targetOrder + "/evidence").file(data).file(image(shade)).header("X-Handover-Request", "1").session(session(actor)));
    }
    private void four(String type, String status) throws Exception { for (int n = 1; n <= 4; n++) upload(user, order, item, type, status, n).andExpect(status().isCreated()); }
    private ResultActions action(String action, String status) throws Exception {
        return mvc.perform(post("/api/vendor/handovers/" + order + "/action").session(session(user)).header("X-Handover-Request", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"" + action + "\",\"expectedStatus\":\"" + status + "\",\"confirmed\":true}"));
    }
    private long firstEvidence() { return jdbc.queryForObject("select min(cek_barang_id) from cek_barang where order_id=?", Long.class, order); }

    @Test void accessIsSessionBoundAndListsOnlyOwnedOrdersWithoutCreatingBusiness() throws Exception {
        mvc.perform(get("/api/vendor/handovers")).andExpect(status().isUnauthorized());
        for (long actor : new long[] {customer, admin}) mvc.perform(get("/api/vendor/handovers").session(session(actor))).andExpect(status().isForbidden());
        mvc.perform(get("/api/vendor/handovers").session(session(user))).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store")).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].orderId").value(order));
        mvc.perform(get("/api/vendor/handovers/" + otherOrder).session(session(user))).andExpect(status().isNotFound());
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", user);
        mvc.perform(get("/api/vendor/handovers").session(session(user))).andExpect(status().isForbidden());
    }

    @Test void listingSearchPaginationAndValidationUseRealOrderItems() throws Exception {
        mvc.perform(get("/api/vendor/handovers").param("q", "Tenda Handover").param("size", "1").session(session(user)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/vendor/handovers").param("q", "%").session(session(user))).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/vendor/handovers").param("page", "0").session(session(user))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/vendor/handovers").param("size", "101").session(session(user))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/vendor/handovers").param("status", "injected").session(session(user))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/vendor/handovers").param("status", "berjalan").session(session(user))).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
    }

    @Test void lifecyclePersistsEvidenceHistoryAndBlocksOrderEndpointBypassAndReplays() throws Exception {
        mvc.perform(post("/api/vendor/orders/" + order + "/action").session(session(user)).header("X-Vendor-Orders", "1")
            .contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"proses\",\"expected_status\":\"dikonfirmasi\"}"))
            .andExpect(status().isConflict());
        four("serah_terima", "dikonfirmasi");
        action("handover", "dikonfirmasi").andExpect(status().isOk()).andExpect(jsonPath("$.order.status").value("berjalan"));
        action("handover", "dikonfirmasi").andExpect(status().isConflict());
        upload(user, order, item, "serah_terima", "berjalan", 5).andExpect(status().isConflict());
        mvc.perform(delete("/api/vendor/handovers/" + order + "/evidence/" + firstEvidence()).param("expectedStatus", "berjalan")
            .session(session(user)).header("X-Handover-Request", "1")).andExpect(status().isConflict());
        four("pengembalian", "berjalan");
        action("receive", "berjalan").andExpect(status().isOk()).andExpect(jsonPath("$.order.status").value("dikembalikan"));
        long claim = jdbc.queryForObject("insert into klaim(order_id,user_id,alasan) values (?,?,'Perlu diperiksa') returning klaim_id", Long.class, order, customer);
        action("complete", "dikembalikan").andExpect(status().isConflict());
        jdbc.update("update klaim set status='ditolak',diputuskan_pada=now() where klaim_id=?", claim);
        action("complete", "dikembalikan").andExpect(status().isOk()).andExpect(jsonPath("$.order.status").value("selesai"))
            .andExpect(jsonPath("$.handoverComplete").value(true)).andExpect(jsonPath("$.returnComplete").value(true));
        assertEquals(8, jdbc.queryForObject("select count(*) from cek_barang where order_id=?", Integer.class, order));
        assertEquals(3, jdbc.queryForObject("select count(*) from riwayat_status_pesanan where order_id=?", Integer.class, order));
        assertEquals(user, jdbc.queryForObject("select min(diperiksa_oleh) from cek_barang where order_id=?", Long.class, order));
    }

    @Test void photographsArePrivateAndSharedOnlyWithOrderParticipantsOrAdmin() throws Exception {
        upload(user, order, item, "serah_terima", "dikonfirmasi", 1).andExpect(status().isCreated());
        String path = "/api/orders/" + order + "/handovers/evidence/" + firstEvidence() + "/photo";
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        for (long actor : new long[] {user, customer, admin}) {
            mvc.perform(get(path).session(session(actor))).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store")).andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().contentType(MediaType.IMAGE_PNG));
            String body = mvc.perform(get("/api/orders/" + order + "/handovers").session(session(actor))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertFalse(body.contains("handover://"));
        }
        for (long actor : new long[] {other, stranger}) mvc.perform(get(path).session(session(actor))).andExpect(status().isNotFound());
        mvc.perform(get("/api/orders/" + otherOrder + "/handovers/evidence/" + firstEvidence() + "/photo").session(session(admin))).andExpect(status().isNotFound());
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", customer);
        mvc.perform(get(path).session(session(customer))).andExpect(status().isForbidden());
    }

    @Test void uploadRejectsWrongOwnershipWrongItemDuplicateAndStaleStatus() throws Exception {
        upload(other, order, item, "serah_terima", "dikonfirmasi", 1).andExpect(status().isNotFound());
        upload(customer, order, item, "serah_terima", "dikonfirmasi", 1).andExpect(status().isForbidden());
        upload(user, order, otherItem, "serah_terima", "dikonfirmasi", 1).andExpect(status().isBadRequest());
        upload(user, order, item, "serah_terima", "berjalan", 1).andExpect(status().isConflict());
        upload(user, order, item, "pengembalian", "dikonfirmasi", 1).andExpect(status().isConflict());
        upload(user, order, item, "serah_terima", "dikonfirmasi", 1).andExpect(status().isCreated());
        upload(user, order, item, "serah_terima", "dikonfirmasi", 1).andExpect(status().isConflict());
        for (int n = 2; n <= 4; n++) upload(user, order, item, "serah_terima", "dikonfirmasi", n).andExpect(status().isCreated());
        upload(user, order, item, "serah_terima", "dikonfirmasi", 5).andExpect(status().isConflict());
        assertEquals(4, jdbc.queryForObject("select count(*) from cek_barang where order_id=?", Integer.class, order));
    }

    @Test void deletionRequiresCurrentStatusAndCannotCrossOrdersAndInvalidatesCompleteness() throws Exception {
        four("serah_terima", "dikonfirmasi");
        long evidence = firstEvidence();
        mvc.perform(delete("/api/vendor/handovers/" + otherOrder + "/evidence/" + evidence).param("expectedStatus", "dikonfirmasi")
            .session(session(other)).header("X-Handover-Request", "1")).andExpect(status().isNotFound());
        mvc.perform(delete("/api/vendor/handovers/" + order + "/evidence/" + evidence).param("expectedStatus", "berjalan")
            .session(session(user)).header("X-Handover-Request", "1")).andExpect(status().isConflict());
        mvc.perform(delete("/api/vendor/handovers/" + order + "/evidence/" + evidence).param("expectedStatus", "dikonfirmasi")
            .session(session(user)).header("X-Handover-Request", "1")).andExpect(status().isOk()).andExpect(jsonPath("$.handoverComplete").value(false));
        action("handover", "dikonfirmasi").andExpect(status().isConflict());
        mvc.perform(get("/api/orders/" + order + "/handovers/evidence/" + evidence + "/photo").session(session(user))).andExpect(status().isNotFound());
    }

    @Test void everyItemNeedsEvidenceAndMissingPhysicalFilesNeverPassValidation() throws Exception {
        four("serah_terima", "dikonfirmasi");
        long second = jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) select vendor_id,kategori_id,'Kursi Tambahan',100000,4 from item where item_id=? returning item_id", Long.class, item);
        jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,1,100000,100000)", order, second);
        action("handover", "dikonfirmasi").andExpect(status().isConflict());
        jdbc.update("delete from detail_item where order_id=? and item_id=?", order, second);
        String locator = jdbc.queryForObject("select foto_kondisi from cek_barang where cek_barang_id=?", String.class, firstEvidence());
        new HandoverPhotoStore(blobs).remove(locator);
        action("handover", "dikonfirmasi").andExpect(status().isConflict());
    }

    @Test void evidenceUsedForAnyClaimCannotBeDeletedEvenAfterTheClaimIsResolved() throws Exception {
        upload(user, order, item, "serah_terima", "dikonfirmasi", 1).andExpect(status().isCreated());
        long evidence = firstEvidence();
        long claim = jdbc.queryForObject("insert into klaim(order_id,user_id,alasan) values (?,?,'Perlu mediasi') returning klaim_id", Long.class, order, customer);
        for (String claimStatus : new String[] {"diajukan", "ditolak"}) {
            jdbc.update("update klaim set status=? where klaim_id=?", claimStatus, claim);
            mvc.perform(delete("/api/vendor/handovers/" + order + "/evidence/" + evidence).param("expectedStatus", "dikonfirmasi")
                .session(session(user)).header("X-Handover-Request", "1")).andExpect(status().isConflict());
        }
        mvc.perform(get("/api/orders/" + order + "/handovers").session(session(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.evidenceProtected").value(true));
        assertEquals(1, jdbc.queryForObject("select count(*) from cek_barang where order_id=?", Integer.class, order));
    }

    @Test void mutationsValidateHeaderOriginBodyAndConfirmation() throws Exception {
        String path = "/api/vendor/handovers/" + order + "/action";
        String body = "{\"action\":\"handover\",\"expectedStatus\":\"dikonfirmasi\",\"confirmed\":true}";
        mvc.perform(post(path).session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post(path).session(session(user)).header("X-Handover-Request", "1").header("Origin", "https://untrusted.example").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post(path).session(session(user)).header("X-Handover-Request", "1").contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"handover\",\"confirmed\":false}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post(path).session(session(user)).header("X-Handover-Request", "1").contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"selesai\",\"confirmed\":true,\"expectedStatus\":\"dikonfirmasi\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void concurrentUploadsAndFinalizationSerializeWithoutDuplicateEvidenceOrHistory() throws Exception {
        for (int n = 1; n <= 3; n++) upload(user, order, item, "serah_terima", "dikonfirmasi", n).andExpect(status().isCreated());
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var one = executor.submit(() -> { start.await(); return upload(user, order, item, "serah_terima", "dikonfirmasi", 4).andReturn().getResponse().getStatus(); });
            var two = executor.submit(() -> { start.await(); return upload(user, order, item, "serah_terima", "dikonfirmasi", 5).andReturn().getResponse().getStatus(); });
            start.countDown();
            var results = new java.util.HashSet<>(java.util.List.of(one.get(20, java.util.concurrent.TimeUnit.SECONDS), two.get(20, java.util.concurrent.TimeUnit.SECONDS)));
            assertEquals(java.util.Set.of(201, 409), results);
            assertEquals(4, jdbc.queryForObject("select count(*) from cek_barang where order_id=?", Integer.class, order));
            var finish = new java.util.concurrent.CountDownLatch(1);
            var first = executor.submit(() -> { finish.await(); return action("handover", "dikonfirmasi").andReturn().getResponse().getStatus(); });
            var second = executor.submit(() -> { finish.await(); return action("handover", "dikonfirmasi").andReturn().getResponse().getStatus(); });
            finish.countDown();
            assertEquals(java.util.Set.of(200, 409), new java.util.HashSet<>(java.util.List.of(first.get(20, java.util.concurrent.TimeUnit.SECONDS), second.get(20, java.util.concurrent.TimeUnit.SECONDS))));
            assertEquals(1, jdbc.queryForObject("select count(*) from riwayat_status_pesanan where order_id=?", Integer.class, order));
        }
    }

    /** Only the concurrency test commits fixtures; delete precisely its generated records after either success or failure. */
    @AfterEach void cleanCommittedConcurrencyFixtures() throws Exception {
        if (TestTransaction.isActive()) return;
        var locators = jdbc.queryForList("select foto_kondisi from cek_barang where order_id in (?,?)", String.class, order, otherOrder);
        for (String table : new String[] {"cek_barang", "riwayat_status_pesanan", "detail_item", "pembayaran", "pemesanan"})
            jdbc.update("delete from " + table + " where order_id in (?,?)", order, otherOrder);
        jdbc.update("delete from item where item_id in (?,?)", item, otherItem);
        jdbc.update("delete from kategori where kategori_id=?", category);
        jdbc.update("delete from vendor where vendor_id in (?,?)", vendor, otherVendor);
        jdbc.update("delete from pengguna where user_id in (?,?,?,?,?)", user, other, customer, stranger, admin);
        var store = new HandoverPhotoStore(blobs);
        for (String locator : locators) store.remove(locator);
    }

    @AfterTransaction void noFileLeaksAfterRollback() {
        assertTrue(blobs.blobs.isEmpty(), "Rolled-back evidence must not leave private files behind");
    }
}
