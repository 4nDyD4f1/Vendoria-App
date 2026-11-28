package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Regresi temuan audit 2026-11-28 nomor 1-5. Semua fixture di-rollback. */
@SpringBootTest
@Transactional
class AuditFixesDatabaseTest {
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    @Autowired GoogleUserService google;
    @Autowired UnpaidOrderExpiry expiry;
    @Autowired PaymentReconciler reconciler;
    @Autowired jakarta.persistence.EntityManager entities;
    @MockitoBean MidtransClient midtrans;
    private JdbcTemplate jdbc;
    private MockMvc mvc;
    private long customer, vendorUser, vendor, item;
    private String token, email;
    private static final String PASSWORD = "rahasia-lama-123";

    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(source); token = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
        customer = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10); vendorUser = customer + 1;
        email = "audit-" + token + "@example.test";
        jdbc.update("insert into pengguna(user_id,nama,email,password_hash,role,status_verifikasi,password_dibuat) overriding system value values (?,'Audit Customer',?,?,'customer','terverifikasi',true)",
            customer, email, new BCryptPasswordEncoder().encode(PASSWORD));
        jdbc.update("insert into pengguna(user_id,nama,email,password_hash,role,status_verifikasi) overriding system value values (?,'Audit Vendor',?,'fixture','vendor','terverifikasi')",
            vendorUser, "v-" + email);
        vendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,alamat,deskripsi,status_aktif) values (?,'Vendor Audit','Bogor','Alamat','Sewa',true) returning vendor_id", Long.class, vendorUser);
        long category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, "Audit " + token);
        item = jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total,minimal_dp) values (?,?,'Tenda',100000,2,50000) returning item_id", Long.class, vendor, category);
    }

    private long order(String status, String age) {
        return jdbc.queryForObject("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,total_biaya_sewa,total_dp,status_pesanan,tanggal_pemesanan) values (?,?,?,current_date+1,current_date+2,1000000,100000,?,now()-interval '" + age + "') returning order_id",
            Long.class, customer, vendor, "AUD-" + UUID.randomUUID().toString().substring(0, 12), status);
    }
    private void pay(long order, String type, int amount, String status, String reference) {
        jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) values (?,?,'payment_gateway',?,?,?)", order, type, amount, status, reference);
    }
    private String orderStatus(long order) { return jdbc.queryForObject("select status_pesanan from pemesanan where order_id=?", String.class, order); }
    private MockHttpSession session(long id) { var s = new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID, id); return s; }
    private MockHttpSession login(String password) throws Exception {
        var result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}")).andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    // 1
    @Test void onlyFullyPaidOrdersCanBePaidOutToTheVendor() throws Exception {
        pay(order("selesai", "1 day"), "deposit", 100000, "terverifikasi", "D1-" + token);
        mvc.perform(get("/api/vendor/payouts").session(session(vendorUser))).andExpect(status().isOk())
            .andExpect(jsonPath("$.available.orders").value(0)).andExpect(jsonPath("$.available.amount").value(0));
        pay(order("selesai", "1 day"), "pelunasan", 1000000, "terverifikasi", "L1-" + token);
        mvc.perform(get("/api/vendor/payouts").session(session(vendorUser)))
            .andExpect(jsonPath("$.available.orders").value(1)).andExpect(jsonPath("$.available.amount").value(940000));
    }

    // 2
    @Test void changingThePasswordSignsOutSessionsMadeWithTheOldOne() throws Exception {
        var stolen = login(PASSWORD);
        mvc.perform(get("/api/auth/me").session(stolen)).andExpect(status().isOk());
        jdbc.update("update pengguna set password_hash=? where user_id=?", new BCryptPasswordEncoder().encode("password-baru-456"), customer);
        entities.clear();
        mvc.perform(get("/api/auth/me").session(stolen)).andExpect(status().isUnauthorized());
        assertTrue(stolen.isInvalid());
    }

    @Test void ownPasswordChangeKeepsTheCurrentSessionButEndsTheOthers() throws Exception {
        var here = login(PASSWORD);
        var elsewhere = login(PASSWORD);
        mvc.perform(put("/api/account/security/password").session(here).contentType(MediaType.APPLICATION_JSON)
            .content("{\"current_password\":\"" + PASSWORD + "\",\"password\":\"password-baru-456\",\"confirm_password\":\"password-baru-456\"}")
            .header("X-Account-Security", "1")).andExpect(status().is2xxSuccessful());
        entities.clear();
        mvc.perform(get("/api/auth/me").session(here)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(elsewhere)).andExpect(status().isUnauthorized());
    }

    // 3
    @Test void linkingGoogleRetiresThePasswordNobodyProvedTheyOwned() throws Exception {
        var squatter = login(PASSWORD);
        google.findOrCreate("sub-" + token, email, true, "Pemilik Asli");
        entities.flush(); entities.clear();
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").session(squatter)).andExpect(status().isUnauthorized());
        assertFalse(jdbc.queryForObject("select password_dibuat from pengguna where user_id=?", Boolean.class, customer));
    }

    // 4
    @Test void unpaidOrdersExpireButPaidOrRecentOnesSurvive() {
        long stale = order("menunggu_pembayaran", "25 hours");
        long recent = order("menunggu_pembayaran", "1 hour");
        long paidWithoutWebhook = order("menunggu_pembayaran", "25 hours");
        String reference = "VND-PAY-261128000000-1234";
        pay(paidWithoutWebhook, "deposit", 100000, "menunggu", reference + "-" + paidWithoutWebhook);
        when(midtrans.status(anyString())).thenReturn(null);
        when(midtrans.status(reference)).thenReturn(Map.of("transaction_status", "settlement", "gross_amount", "100000.00", "status_code", "200"));
        expiry.expire();
        assertEquals("dibatalkan", orderStatus(stale));
        assertEquals("menunggu_pembayaran", orderStatus(recent));
        assertEquals("menunggu_konfirmasi", orderStatus(paidWithoutWebhook));
        assertEquals(1, jdbc.queryForObject("select count(*) from riwayat_status_pesanan where order_id=? and status_baru='dibatalkan'", Integer.class, stale));
    }

    // 8
    @Test void pendingPaymentsAreReconciledWithoutWaitingForTheWebhook() {
        long paid = order("menunggu_pembayaran", "3 hours"), abandoned = order("menunggu_pembayaran", "3 hours"),
            fresh = order("menunggu_pembayaran", "3 hours"), unreachable = order("menunggu_pembayaran", "3 hours");
        String a = "VND-PAY-261128000000-1111", b = "VND-PAY-261128000000-2222", c = "VND-PAY-261128000000-3333", d = "VND-PAY-261128000000-4444";
        pay(paid, "deposit", 100000, "menunggu", a + "-" + paid);
        pay(abandoned, "deposit", 100000, "menunggu", b + "-" + abandoned);
        pay(fresh, "deposit", 100000, "menunggu", c + "-" + fresh);
        pay(unreachable, "deposit", 100000, "menunggu", d + "-" + unreachable);
        jdbc.update("update pembayaran set dibuat_pada=now()-interval '3 hours' where order_id in (?,?,?)", paid, abandoned, unreachable);
        jdbc.update("update pembayaran set dibuat_pada=now()-interval '10 minutes' where order_id=?", fresh);
        when(midtrans.status(anyString())).thenReturn(null);
        when(midtrans.status(a)).thenReturn(Map.of("transaction_status", "settlement", "gross_amount", "100000.00", "status_code", "200"));
        when(midtrans.status(d)).thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY));
        reconciler.reconcile();
        assertEquals("terverifikasi", paymentStatus(paid));
        assertEquals("menunggu_konfirmasi", orderStatus(paid));
        assertEquals("gagal", paymentStatus(abandoned)); // tak pernah dibuka dan halaman Snap sudah kedaluwarsa
        assertEquals("menunggu", paymentStatus(fresh));
        assertEquals("menunggu", paymentStatus(unreachable));
    }
    private String paymentStatus(long order) { return jdbc.queryForObject("select status from pembayaran where order_id=?", String.class, order); }

    // 10
    @Test void stockCountsPeakUsageNotEveryOverlappingBooking() throws Exception {
        var today = java.time.LocalDate.now();
        for (int offset : new int[] {10, 14}) { // dua pesanan 1 unit yang tidak saling bentrok
            long order = order("dikonfirmasi", "1 hour");
            jdbc.update("update pemesanan set tanggal_mulai_sewa=?,tanggal_selesai_sewa=? where order_id=?", today.plusDays(offset), today.plusDays(offset + 1), order);
            jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,1,100000,100000)", order, item);
        }
        jdbc.update("insert into keranjang(user_id,item_id,jumlah) values (?,?,2)", customer, item);
        checkout(today.plusDays(10), today.plusDays(15)).andExpect(status().isConflict()); // 2 + 1 > stok 2
        jdbc.update("update keranjang set jumlah=1 where user_id=?", customer);
        checkout(today.plusDays(10), today.plusDays(15)).andExpect(status().isOk());
    }
    private org.springframework.test.web.servlet.ResultActions checkout(java.time.LocalDate start, java.time.LocalDate end) throws Exception {
        return mvc.perform(post("/api/customer/cart/checkout").session(session(customer)).header("X-Cart-Request", "1").contentType(MediaType.APPLICATION_JSON)
            .content("{\"eventName\":\"Acara\",\"category\":\"Lainnya\",\"startDate\":\"" + start + "\",\"endDate\":\"" + end + "\",\"venue\":\"Gedung\",\"address\":\"Jalan 1\",\"picName\":\"Budi\",\"picPhone\":\"081234567890\"}"));
    }

    // 11 & 12
    @Test void adminSeesAllMoneyHeldAndReturnsStillOutstanding() throws Exception {
        long admin = customer + 2;
        jdbc.update("insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Audit Admin',?,'fixture','admin')", admin, "a-" + email);
        long before = escrow(admin);
        long order = order("berjalan", "1 day");
        pay(order, "deposit", 100000, "terverifikasi", "E1-" + token);
        pay(order, "pelunasan", 1000000, "terverifikasi", "E2-" + token);
        jdbc.update("insert into pengembalian_dana(order_id,jumlah,alasan,status) values (?,50000,'uji','berhasil')", order);
        assertEquals(1050000, escrow(admin) - before);

        long claim = jdbc.queryForObject("insert into klaim(order_id,user_id,alasan,jenis,status,diputuskan_pada) values (?,?,'Salah barang','tidak_sesuai','disetujui',now()) returning klaim_id", Long.class, order, customer);
        String reminder = "$[?(@.id=='retur:" + claim + "')]";
        mvc.perform(get("/api/admin/notifications").session(session(admin))).andExpect(jsonPath(reminder + ".path").value("/admin/klaim/KLM-" + claim));
        mvc.perform(post("/api/admin/notifications/read").session(session(admin)).header("X-Admin-Notifications", "1").contentType(MediaType.APPLICATION_JSON)
            .content("{\"ids\":[\"retur:" + claim + "\"]}")).andExpect(status().isNoContent());
        jdbc.update("update klaim set barang_kembali_pada=now() where klaim_id=?", claim);
        mvc.perform(get("/api/admin/notifications").session(session(admin))).andExpect(jsonPath(reminder).isEmpty());
    }
    private long escrow(long admin) throws Exception {
        var body = mvc.perform(get("/api/admin/dashboard").session(session(admin))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return ((Number) com.jayway.jsonpath.JsonPath.read(body, "$.escrow")).longValue();
    }

    // Vendor diam 24 jam setelah deposit dibayar
    @Test void ordersTheVendorNeverConfirmsAreCancelledAndTheDepositReturns() {
        long silent = order("menunggu_konfirmasi", "30 hours"), justPaid = order("menunggu_konfirmasi", "30 hours"),
            confirmed = order("dikonfirmasi", "30 hours");
        for (long order : new long[] {silent, justPaid, confirmed}) pay(order, "deposit", 100000, "terverifikasi", "C-" + order + "-" + token);
        // batas dihitung dari saat deposit lunas, bukan dari saat pesanan dibuat
        history(silent, "25 hours"); history(justPaid, "1 hour"); history(confirmed, "25 hours");
        expiry.expire();
        assertEquals("dibatalkan", orderStatus(silent));
        assertEquals("menunggu_konfirmasi", orderStatus(justPaid));
        assertEquals("dikonfirmasi", orderStatus(confirmed));
        assertEquals(100000, jdbc.queryForObject("select sum(jumlah) from pengembalian_dana where order_id=?", Integer.class, silent));
        assertEquals(0, jdbc.queryForObject("select count(*) from pengembalian_dana where order_id in (?,?)", Integer.class, justPaid, confirmed));
        assertEquals(1, jdbc.queryForObject("select count(*) from riwayat_status_pesanan where order_id=? and status_baru='dibatalkan'", Integer.class, silent));
        expiry.expire();
        assertEquals(1, jdbc.queryForObject("select count(*) from pengembalian_dana where order_id=?", Integer.class, silent));
    }
    private void history(long order, String age) {
        jdbc.update("insert into riwayat_status_pesanan(order_id,status_sebelumnya,status_baru,diubah_pada) values (?,'menunggu_pembayaran','menunggu_konfirmasi',now()-interval '" + age + "')", order);
    }

    // Harga sewa harus lebih dari 0
    @Test void rentalPricesMustBeAboveZero() throws Exception {
        var data = new org.springframework.mock.web.MockMultipartFile("data", "d.json", "application/json",
            ("{\"name\":\"Gratis\",\"category\":\"Audit " + token + "\",\"price\":0,\"deposit\":1000,\"stock\":1,\"status\":\"aktif\"}").getBytes());
        mvc.perform(multipart("/api/vendor/catalog").file(data).header("X-Catalog-Request", "1").session(session(vendorUser)))
            .andExpect(status().isBadRequest());
        jdbc.update("update item set harga_sewa_per_hari=0 where item_id=?", item);
        jdbc.update("insert into keranjang(user_id,item_id,jumlah) values (?,?,1)", customer, item);
        var start = java.time.LocalDate.now().plusDays(3);
        checkout(start, start.plusDays(1)).andExpect(status().isConflict()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("harga")));
    }

    // Deposit paling banyak 60% dari biaya sewa pesanan
    @Test void theDepositIsCappedAtSixtyPercentOfTheRent() throws Exception {
        jdbc.update("update item set minimal_dp=500000 where item_id=?", item); // sewa 100.000/hari
        jdbc.update("insert into keranjang(user_id,item_id,jumlah) values (?,?,1)", customer, item);
        var start = java.time.LocalDate.now().plusDays(3);
        checkout(start, start.plusDays(1)).andExpect(status().isOk())
            .andExpect(jsonPath("$.orders[0].total").value(100000)).andExpect(jsonPath("$.orders[0].deposit").value(60000));
        jdbc.update("update item set minimal_dp=50000 where item_id=?", item); // di bawah batas: dipakai apa adanya
        jdbc.update("insert into keranjang(user_id,item_id,jumlah) values (?,?,1)", customer, item);
        checkout(start.plusDays(10), start.plusDays(12)).andExpect(status().isOk()).andExpect(jsonPath("$.orders[0].deposit").value(50000));
    }

    // 5
    @Test void rentalsNeedADepositGreaterThanZero() throws Exception {
        jdbc.update("update item set minimal_dp=0 where item_id=?", item);
        jdbc.update("insert into keranjang(user_id,item_id,jumlah) values (?,?,1)", customer, item);
        var start = java.time.LocalDate.now().plusDays(3);
        mvc.perform(post("/api/customer/cart/checkout").session(session(customer)).header("X-Cart-Request", "1").contentType(MediaType.APPLICATION_JSON)
            .content("{\"eventName\":\"Acara\",\"category\":\"Lainnya\",\"startDate\":\"" + start + "\",\"endDate\":\"" + start.plusDays(1) + "\",\"venue\":\"Gedung\",\"address\":\"Jalan 1\",\"picName\":\"Budi\",\"picPhone\":\"081234567890\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("deposit")));
        assertEquals(0, jdbc.queryForObject("select count(*) from pemesanan where user_id=?", Integer.class, customer));
    }
}
