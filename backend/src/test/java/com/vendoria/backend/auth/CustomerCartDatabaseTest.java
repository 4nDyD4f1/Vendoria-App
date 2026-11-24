package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL fixture data; every row is rolled back after each test. */
@SpringBootTest
@Transactional
class CustomerCartDatabaseTest {
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    JdbcTemplate jdbc;
    MockMvc mvc;
    long customer, vendorUserA, vendorUserB, vendorA, vendorB, category, itemA, itemB;
    String token;

    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(source); token = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
        customer = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10); vendorUserA = customer + 1; vendorUserB = customer + 2;
        for (long id : new long[] { customer, vendorUserA, vendorUserB }) jdbc.update(
            "insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Cart fixture',?,'fixture',?)",
            id, "cart-" + id + "-" + token + "@example.test", id == customer ? "customer" : "vendor");
        jdbc.update("update pengguna set status_verifikasi='terverifikasi' where user_id=?", customer);
        vendorA = vendor(vendorUserA, "Vendor A"); vendorB = vendor(vendorUserB, "Vendor B");
        category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, "Cart " + token);
        itemA = item(vendorA, "Tenda A", 1000, 3, 300); itemB = item(vendorB, "Speaker B", 200, 5, 50);
    }
    long vendor(long user, String name) { return jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,status_aktif) values (?,?,'Bogor',true) returning vendor_id", Long.class, user, name); }
    long item(long vendor, String name, int price, int stock, int dp) {
        return jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total,minimal_dp) values (?,?,?,?,?,?) returning item_id", Long.class, vendor, category, name, price, stock, dp);
    }
    MockHttpSession session(long id) { var s = new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID, id); return s; }
    ResultActions addQty(long user, long item, String body) throws Exception {
        return mvc.perform(put("/api/customer/cart/items/" + item).session(session(user)).header("X-Cart-Request", "1").contentType(MediaType.APPLICATION_JSON).content(body));
    }
    ResultActions checkout(long user, LocalDate start, LocalDate end) throws Exception {
        String body = """
            {"eventName":"Festival Kampus","category":"Festival & Konser","startDate":"%s","endDate":"%s","venue":"Gedung A","address":"Jl. Contoh 1, Bogor","picName":"Bagas","picPhone":"0812 3456 7890","note":"Akses truk"}
            """.formatted(start, end);
        return mvc.perform(post("/api/customer/cart/checkout").session(session(user)).header("X-Cart-Request", "1").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test void onlyActiveCustomersAndRequiredHeader() throws Exception {
        mvc.perform(get("/api/customer/cart")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/customer/cart").session(session(vendorUserA))).andExpect(status().isForbidden());
        mvc.perform(put("/api/customer/cart/items/" + itemA).session(session(customer)).contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":1}")).andExpect(status().isForbidden());
    }
    @Test void addUpdateKeepExistingStockLimitAndRemove() throws Exception {
        addQty(customer, itemA, "{\"quantity\":1}").andExpect(status().isNoContent());
        addQty(customer, itemA, "{\"quantity\":2,\"keepExisting\":true}").andExpect(status().isNoContent());
        assertEquals(1, jdbc.queryForObject("select jumlah from keranjang where user_id=? and item_id=?", Integer.class, customer, itemA));
        addQty(customer, itemA, "{\"quantity\":3}").andExpect(status().isNoContent());
        addQty(customer, itemA, "{\"quantity\":4}").andExpect(status().isBadRequest()); // stok hanya 3
        addQty(customer, itemA, "{\"quantity\":0}").andExpect(status().isBadRequest());
        addQty(customer, Long.MAX_VALUE, "{\"quantity\":1}").andExpect(status().isNotFound());
        mvc.perform(get("/api/customer/cart").session(session(customer))).andExpect(jsonPath("$.items[0].quantity").value(3))
            .andExpect(jsonPath("$.items[0].available").value(true)).andExpect(jsonPath("$.items[0].item.price").value(1000));
        mvc.perform(delete("/api/customer/cart/items/" + itemA).session(session(customer)).header("X-Cart-Request", "1")).andExpect(status().isNoContent());
        mvc.perform(get("/api/customer/cart").session(session(customer))).andExpect(jsonPath("$.items").isEmpty());
    }
    @Test void checkoutCreatesOneOrderPerVendorAndClearsCart() throws Exception {
        addQty(customer, itemA, "{\"quantity\":2}"); addQty(customer, itemB, "{\"quantity\":1}");
        LocalDate start = LocalDate.now().plusDays(5);
        checkout(customer, start, start.plusDays(3)).andExpect(status().isOk()).andExpect(jsonPath("$.orders.length()").value(2));
        var orders = jdbc.queryForList("select * from pemesanan where user_id=? order by vendor_id", customer);
        assertEquals(2, orders.size());
        var a = orders.get(0);
        assertEquals(0, new BigDecimal("6000").compareTo((BigDecimal) a.get("total_biaya_sewa"))); // 1000 x 2 unit x 3 hari
        assertEquals(0, new BigDecimal("600").compareTo((BigDecimal) a.get("total_dp")));          // 300 x 2 unit
        assertEquals("menunggu_pembayaran", a.get("status_pesanan"));
        assertEquals("Gedung A", a.get("nama_venue")); assertEquals("Jl. Contoh 1, Bogor", a.get("lokasi_acara"));
        assertEquals(0, new BigDecimal("6000").compareTo(jdbc.queryForObject("select subtotal from detail_item where order_id=?", BigDecimal.class, a.get("order_id"))));
        assertEquals(1, jdbc.queryForObject("select count(*) from riwayat_status_pesanan where order_id=?", Integer.class, a.get("order_id")));
        assertEquals(0, jdbc.queryForObject("select count(*) from keranjang where user_id=?", Integer.class, customer));
    }
    @Test void checkoutRejectsBadDatesEmptyCartAndOverbooking() throws Exception {
        LocalDate start = LocalDate.now().plusDays(5);
        checkout(customer, start, start.plusDays(1)).andExpect(status().isConflict()); // keranjang kosong
        addQty(customer, itemA, "{\"quantity\":3}");
        checkout(customer, LocalDate.now().minusDays(1), start).andExpect(status().isBadRequest());
        checkout(customer, start, start).andExpect(status().isBadRequest());
        checkout(customer, start, start.plusDays(61)).andExpect(status().isBadRequest());
        checkout(customer, start, start.plusDays(2)).andExpect(status().isOk());
        addQty(customer, itemA, "{\"quantity\":1}"); // 3 unit sudah terpesan pada tanggal itu
        checkout(customer, start.plusDays(1), start.plusDays(3)).andExpect(status().isConflict());
        checkout(customer, start.plusDays(2), start.plusDays(4)).andExpect(status().isOk()); // tidak tumpang tindih
    }
    @Test void unavailableItemBlocksCheckout() throws Exception {
        addQty(customer, itemA, "{\"quantity\":1}");
        jdbc.update("update item set status='nonaktif' where item_id=?", itemA);
        mvc.perform(get("/api/customer/cart").session(session(customer))).andExpect(jsonPath("$.items[0].available").value(false)).andExpect(jsonPath("$.items[0].name").value("Tenda A"));
        LocalDate start = LocalDate.now().plusDays(5);
        checkout(customer, start, start.plusDays(1)).andExpect(status().isConflict());
    }

    @Test void onlyVerifiedCustomersCanCheckoutAndBlockedCheckoutPreservesCart() throws Exception {
        addQty(customer, itemA, "{\"quantity\":1}").andExpect(status().isNoContent());
        LocalDate start = LocalDate.now().plusDays(5);
        for (String verification : List.of("belum_diverifikasi", "menunggu", "ditolak")) {
            jdbc.update("update pengguna set status_verifikasi=? where user_id=?", verification, customer);
            mvc.perform(get("/api/customer/cart").session(session(customer))).andExpect(status().isOk());
            checkout(customer, start, start.plusDays(1)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("KYC_REQUIRED"))
                .andExpect(jsonPath("$.status_verifikasi").value(verification));
            assertEquals(1, jdbc.queryForObject("select count(*) from keranjang where user_id=?", Integer.class, customer));
            assertEquals(0, jdbc.queryForObject("select count(*) from pemesanan where user_id=?", Integer.class, customer));
        }
        jdbc.update("update pengguna set status_verifikasi='terverifikasi' where user_id=?", customer);
        checkout(customer, start, start.plusDays(1)).andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject("select count(*) from pemesanan where user_id=?", Integer.class, customer));
    }
}
