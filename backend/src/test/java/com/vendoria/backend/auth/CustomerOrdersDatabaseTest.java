package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import java.nio.file.Path;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL fixture data; every row is rolled back after each test. */
@SpringBootTest
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CustomerOrdersDatabaseTest {
    @TempDir static Path storage;
    @DynamicPropertySource static void storage(DynamicPropertyRegistry registry) { registry.add("app.catalog.storage-root", () -> storage.toString()); }
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    @Autowired CatalogPhotoStore photos;
    JdbcTemplate jdbc;
    MockMvc mvc;
    long customer, other, vendorUser, vendor, category, item;
    String token;

    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(source); token = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
        customer = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10); other = customer + 1; vendorUser = customer + 2;
        for (long id : new long[] { customer, other, vendorUser }) jdbc.update(
            "insert into pengguna(user_id,nama,email,password_hash,role,no_telp) overriding system value values (?,'Orders fixture',?,'fixture',?,'0812')",
            id, "corders-" + id + "-" + token + "@example.test", id == vendorUser ? "vendor" : "customer");
        vendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota) values (?,'Fixture vendor','Bogor') returning vendor_id", Long.class, vendorUser);
        category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, "Fixture " + token);
        item = jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) values (?,?,'Fixture speaker',100,5) returning item_id", Long.class, vendor, category);
    }
    MockHttpSession session(long id) { var s = new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID, id); return s; }
    long order(long owner, String status) {
        long id = jdbc.queryForObject("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,total_biaya_sewa,total_dp,status_pesanan) values (?,?,?,current_date+1,current_date+3,500,100,?) returning order_id",
            Long.class, owner, vendor, "CO-" + UUID.randomUUID().toString().substring(0, 12), status);
        jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,2,100,200)", id, item);
        return id;
    }
    ResultActions review(long user, long order, String body, boolean header) throws Exception {
        var req = post("/api/orders/" + order + "/review").session(session(user)).contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(header ? req.header("X-Customer-Orders", "1") : req);
    }

    @Test void onlyActiveCustomersCanRead() throws Exception {
        mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/orders").session(session(vendorUser))).andExpect(status().isForbidden());
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", customer);
        mvc.perform(get("/api/orders").session(session(customer))).andExpect(status().isForbidden());
    }
    @Test void listShowsOnlyOwnOrdersWithCountsFilterAndEscrow() throws Exception {
        long running = order(customer, "berjalan"); order(customer, "selesai"); order(other, "berjalan");
        jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status) values (?,'deposit','transfer_bank',100,'terverifikasi')", running);
        mvc.perform(get("/api/orders").session(session(customer))).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.userId").value(String.valueOf(customer)))
            .andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.counts.semua").value(2)).andExpect(jsonPath("$.counts.berjalan").value(1))
            .andExpect(jsonPath("$.escrow").value(100)).andExpect(jsonPath("$.items[0].vendorName").value("Fixture vendor"));
        mvc.perform(get("/api/orders").param("status", "berjalan").param("q", "speaker").session(session(customer)))
            .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].orderId").value(running)).andExpect(jsonPath("$.items[0].paid").value(100));
        mvc.perform(get("/api/orders").param("status", "bogus").session(session(customer))).andExpect(status().isBadRequest());
    }
    @Test void detailIsOwnerOnlyAndHidesVendorPhoneUntilConfirmed() throws Exception {
        long waiting = order(customer, "menunggu_pembayaran"), running = order(customer, "berjalan");
        mvc.perform(get("/api/orders/" + running).session(session(other))).andExpect(status().isNotFound());
        mvc.perform(get("/api/orders/" + waiting).session(session(customer))).andExpect(status().isOk()).andExpect(jsonPath("$.vendorPhone").doesNotExist());
        mvc.perform(get("/api/orders/" + running).session(session(customer))).andExpect(jsonPath("$.vendorPhone").value("0812"))
            .andExpect(jsonPath("$.items[0].name").value("Fixture speaker")).andExpect(jsonPath("$.items[0].quantity").value(2))
            .andExpect(jsonPath("$.handoverComplete").value(false));
    }
    @Test void reviewOnlyOnceAfterCompletionByOwnerAndUpdatesVendorRating() throws Exception {
        long running = order(customer, "berjalan"), done = order(customer, "selesai"), foreign = order(other, "selesai");
        String body = "{\"rating\":4,\"comment\":\" Bagus \"}";
        review(customer, done, body, false).andExpect(status().isForbidden());
        review(customer, done, "{\"rating\":6}", true).andExpect(status().isBadRequest());
        review(customer, running, body, true).andExpect(status().isConflict());
        review(customer, foreign, body, true).andExpect(status().isNotFound());
        review(customer, done, body, true).andExpect(status().isOk()).andExpect(jsonPath("$.review.rating").value(4))
            .andExpect(jsonPath("$.review.comment").value("Bagus")).andExpect(jsonPath("$.order.canReview").value(false));
        review(customer, done, body, true).andExpect(status().isConflict());
        assertEquals(0, new java.math.BigDecimal("4.00").compareTo(jdbc.queryForObject("select rating from vendor where vendor_id=?", java.math.BigDecimal.class, vendor)));
    }

    @Test void paginationClampsToLastPageAndRejectsInvalidLimits() throws Exception {
        order(customer, "selesai"); order(customer, "dikonfirmasi"); order(other, "selesai");
        mvc.perform(get("/api/orders").param("size", "1").param("page", "999").session(session(customer)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(2)).andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items.length()").value(1));
        for (String limit : List.of("0", "101", "-1")) mvc.perform(get("/api/orders").param("size", limit).session(session(customer))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/orders").param("page", "1000001").session(session(customer))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/orders").param("q", "a".repeat(121)).session(session(customer))).andExpect(status().isBadRequest());
    }

    @Test void searchTreatsWildcardsLiterallyAndCanFindVendorOrOrderCode() throws Exception {
        long first = order(customer, "selesai"); order(customer, "menunggu_pembayaran");
        jdbc.update("update item set nama_barang='Speaker 100%_!' where item_id=?", item);
        mvc.perform(get("/api/orders").param("q", "%_!").session(session(customer))).andExpect(jsonPath("$.total").value(2));
        mvc.perform(get("/api/orders").param("q", "%bogus").session(session(customer))).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/orders").param("q", "fixture VENDOR").session(session(customer))).andExpect(jsonPath("$.total").value(2));
        String code = jdbc.queryForObject("select kode_pemesanan from pemesanan where order_id=?", String.class, first);
        mvc.perform(get("/api/orders").param("q", code).session(session(customer))).andExpect(jsonPath("$.total").value(1));
    }

    @Test void actualOrderCodesResolveWithTheSameOwnershipProtection() throws Exception {
        long id = order(customer, "dikonfirmasi");
        String code = jdbc.queryForObject("select kode_pemesanan from pemesanan where order_id=?", String.class, id);
        mvc.perform(get("/api/orders/" + code).session(session(customer))).andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value(String.valueOf(customer)))
            .andExpect(header().string("Cache-Control", "no-store")).andExpect(jsonPath("$.order.orderId").value(id));
        mvc.perform(get("/api/orders/" + code).session(session(other))).andExpect(status().isNotFound());
        mvc.perform(get("/api/orders/unknown-code").session(session(customer))).andExpect(status().isNotFound());
    }

    @Test void historicalPhotosArePrivateAndRemainAvailableAfterCatalogWithdrawal() throws Exception {
        long id = order(customer, "selesai");
        var bytes = new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        String locator = photos.save(new MockMultipartFile("file", "fixture.png", "image/png", bytes.toByteArray()));
        try {
            jdbc.update("insert into foto_item(item_id,tautan_foto,urutan) values (?,?,1)", item, locator);
            jdbc.update("update item set status='arsip' where item_id=?", item);
            String path = "/api/orders/" + id + "/items/" + item + "/photo";
            mvc.perform(get("/api/orders/" + id).session(session(customer))).andExpect(jsonPath("$.items[0].photoUrl").value(path));
            mvc.perform(get(path).session(session(customer))).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(header().string("Cache-Control", "no-store")).andExpect(content().bytes(photos.read(locator)));
            mvc.perform(get(path).session(session(other))).andExpect(status().isNotFound());
            mvc.perform(get(path).session(session(vendorUser))).andExpect(status().isForbidden());
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/orders/" + id + "/items/999999999/photo").session(session(customer))).andExpect(status().isNotFound());
        } finally { photos.remove(locator); }
    }

    @Test void reviewsRejectStaleAccountAndInactiveOrNonCustomerSessions() throws Exception {
        long id = order(customer, "selesai");
        mvc.perform(post("/api/orders/" + id + "/review").session(session(customer)).header("X-Customer-Orders", "1")
            .header("X-Customer-Orders-Owner", String.valueOf(other)).contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5}"))
            .andExpect(status().isConflict());
        review(vendorUser, id, "{\"rating\":5}", true).andExpect(status().isForbidden());
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", customer);
        review(customer, id, "{\"rating\":5}", true).andExpect(status().isForbidden());
        assertEquals(0, jdbc.queryForObject("select count(*) from ulasan where order_id=?", Integer.class, id));
    }
}
