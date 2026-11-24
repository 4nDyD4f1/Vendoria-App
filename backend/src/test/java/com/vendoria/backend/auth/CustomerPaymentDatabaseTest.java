package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL fixture data (rolled back); Midtrans is mocked. */
@SpringBootTest
@Transactional
class CustomerPaymentDatabaseTest {
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    @MockitoBean MidtransClient midtrans;
    JdbcTemplate jdbc;
    MockMvc mvc;
    long customer, other, vendorUser, vendor, orderA, orderB;
    String token;

    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(source); token = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
        customer = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10); other = customer + 1; vendorUser = customer + 2;
        for (long id : new long[] { customer, other, vendorUser }) jdbc.update(
            "insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Pay fixture',?,'fixture',?)",
            id, "pay-" + id + "-" + token + "@example.test", id == vendorUser ? "vendor" : "customer");
        jdbc.update("update pengguna set status_verifikasi='terverifikasi' where user_id in (?,?)", customer, other);
        vendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,status_aktif) values (?,'Vendor Bayar','Bogor',true) returning vendor_id", Long.class, vendorUser);
        orderA = order("A", 3000, 1000); orderB = order("B", 2000, 500);
        when(midtrans.createTransaction(any())).thenReturn("https://app.sandbox.midtrans.com/snap/v4/redirection/fixture");
    }
    long order(String suffix, int total, int deposit) {
        return jdbc.queryForObject("""
            insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,lokasi_acara,total_biaya_sewa,total_dp)
            values (?,?,?,current_date+1,current_date+3,'Bogor',?,?) returning order_id
            """, Long.class, customer, vendor, "PAY-" + suffix + "-" + token.substring(0, 8), total, deposit);
    }
    MockHttpSession session(long id) { var s = new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID, id); return s; }
    String pay(long user, String ids) throws Exception {
        var res = mvc.perform(post("/api/customer/payments").session(session(user)).header("X-Payment-Request", "1").contentType(MediaType.APPLICATION_JSON)
            .content("{\"orderIds\":[" + ids + "]}")).andExpect(status().isOk()).andExpect(jsonPath("$.redirectUrl").value(org.hamcrest.Matchers.startsWith("https://"))).andReturn();
        return com.jayway.jsonpath.JsonPath.read(res.getResponse().getContentAsString(), "$.reference");
    }
    void midtransSays(String ref, String status, String gross) {
        when(midtrans.status(ref)).thenReturn(Map.of("transaction_status", status, "gross_amount", gross, "status_code", "200"));
    }
    String orderStatus(long id) { return jdbc.queryForObject("select status_pesanan from pemesanan where order_id=?", String.class, id); }

    @Test void summarySumsDepositsAndHidesOtherCustomers() throws Exception {
        mvc.perform(get("/api/customer/payments")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/customer/payments").session(session(vendorUser))).andExpect(status().isForbidden());
        mvc.perform(get("/api/customer/payments").session(session(customer)).queryParam("orders", orderA + "," + orderB))
            .andExpect(status().isOk()).andExpect(jsonPath("$.amountDue").value(1500)).andExpect(jsonPath("$.orders.length()").value(2));
        mvc.perform(get("/api/customer/payments").session(session(other)).queryParam("orders", String.valueOf(orderA))).andExpect(status().isNotFound());
    }

    @Test void payRequiresHeaderAndOwnership() throws Exception {
        mvc.perform(post("/api/customer/payments").session(session(customer)).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/customer/payments").session(session(other)).header("X-Payment-Request", "1").contentType(MediaType.APPLICATION_JSON)
            .content("{\"orderIds\":[" + orderA + "]}")).andExpect(status().isNotFound());
        assertEquals(0, jdbc.queryForObject("select count(*) from pembayaran where order_id=?", Integer.class, orderA));
    }

    @Test void paidInMidtransConfirmsOrdersOnceAndSendsGrossAmount() throws Exception {
        String ref = pay(customer, orderA + "," + orderB);
        verify(midtrans).createTransaction(argThat(body -> ((Map<?, ?>) body.get("transaction_details")).get("gross_amount").equals(1500L)
            && ((Map<?, ?>) body.get("transaction_details")).get("order_id").equals(ref)));
        assertEquals(2, jdbc.queryForObject("select count(*) from pembayaran where status='menunggu' and referensi_eksternal like ?", Integer.class, ref + "-%"));

        when(midtrans.status(ref)).thenReturn(null); // belum dibuka di Midtrans -> tetap menunggu
        mvc.perform(get("/api/customer/payments/confirmation").session(session(customer)).queryParam("ref", ref))
            .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("pending"));

        midtransSays(ref, "settlement", "1500.00");
        for (int i = 0; i < 2; i++) mvc.perform(get("/api/customer/payments/confirmation").session(session(customer)).queryParam("ref", ref))
            .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("paid")).andExpect(jsonPath("$.amount").value(1500))
            .andExpect(jsonPath("$.orders[0].status").value("menunggu_konfirmasi"));
        assertEquals("menunggu_konfirmasi", orderStatus(orderA)); assertEquals("menunggu_konfirmasi", orderStatus(orderB));
        assertEquals(1, jdbc.queryForObject("select count(*) from riwayat_status_pesanan where order_id=? and status_baru='menunggu_konfirmasi'", Integer.class, orderA));
        // sudah dibayar -> tidak bisa dibayar lagi
        mvc.perform(post("/api/customer/payments").session(session(customer)).header("X-Payment-Request", "1").contentType(MediaType.APPLICATION_JSON)
            .content("{\"orderIds\":[" + orderA + "]}")).andExpect(status().isConflict());
    }

    @Test void mismatchedAmountOrOtherUsersReferenceDoesNotConfirm() throws Exception {
        String ref = pay(customer, String.valueOf(orderA));
        midtransSays(ref, "settlement", "1.00");
        mvc.perform(get("/api/customer/payments/confirmation").session(session(customer)).queryParam("ref", ref)).andExpect(jsonPath("$.state").value("pending"));
        assertEquals("menunggu_pembayaran", orderStatus(orderA));
        mvc.perform(get("/api/customer/payments/confirmation").session(session(other)).queryParam("ref", ref)).andExpect(status().isNotFound());
        mvc.perform(get("/api/customer/payments/confirmation").session(session(customer)).queryParam("ref", "x%")).andExpect(status().isBadRequest());
    }

    @Test void expiredPaymentFailsAndCanBeRetried() throws Exception {
        String ref = pay(customer, String.valueOf(orderA));
        midtransSays(ref, "expire", "1000.00");
        mvc.perform(get("/api/customer/payments/confirmation").session(session(customer)).queryParam("ref", ref)).andExpect(jsonPath("$.state").value("failed"));
        assertEquals("menunggu_pembayaran", orderStatus(orderA));
        assertNotEquals(ref, pay(customer, String.valueOf(orderA)));
    }

    @Autowired MidtransSandboxPayer payer;

    @Test void sandboxPayerPaysOnlyPendingBcaVaAndSnapIsLimitedToIt() throws Exception {
        when(midtrans.autoConfirm()).thenReturn(true);
        String ref = pay(customer, String.valueOf(orderA));
        verify(midtrans).createTransaction(argThat(body -> List.of("bca_va").equals(body.get("enabled_payments"))));
        when(midtrans.status(ref)).thenReturn(null); // belum memilih metode
        payer.payPendingVirtualAccounts();
        verify(midtrans, never()).simulateBcaVaPayment(any(), any());
        when(midtrans.status(ref)).thenReturn(Map.of("transaction_status", "pending", "gross_amount", "1000.00", "va_numbers", List.of(Map.of("bank", "bni", "va_number", "1"))));
        payer.payPendingVirtualAccounts();
        verify(midtrans, never()).simulateBcaVaPayment(any(), any());
        when(midtrans.status(ref)).thenReturn(Map.of("transaction_status", "pending", "gross_amount", "1000.00", "va_numbers", List.of(Map.of("bank", "bca", "va_number", "7282200000001"))));
        payer.payPendingVirtualAccounts();
        verify(midtrans).simulateBcaVaPayment("7282200000001", "1000.00");
    }

    @Test void payerAndSnapAreUntouchedOutsideSandbox() throws Exception {
        pay(customer, String.valueOf(orderA)); // autoConfirm() = false (mock)
        verify(midtrans).createTransaction(argThat(body -> !body.containsKey("enabled_payments")));
        payer.payPendingVirtualAccounts();
        verify(midtrans, never()).status(any());
    }

    @Test void webhookConfirmsWithoutLogin() throws Exception {
        String ref = pay(customer, String.valueOf(orderA));
        midtransSays(ref, "settlement", "1000.00");
        mvc.perform(post("/api/payments/midtrans/notify").contentType(MediaType.APPLICATION_JSON).content("{\"order_id\":\"" + ref + "\"}")).andExpect(status().isOk());
        assertEquals("menunggu_konfirmasi", orderStatus(orderA));
        mvc.perform(post("/api/payments/midtrans/notify").contentType(MediaType.APPLICATION_JSON).content("{\"order_id\":\"bukan-ref\"}")).andExpect(status().isOk());
    }

    @Test void unverifiedCustomersCannotStartGatewayPaymentEvenForExistingOrders() throws Exception {
        for (String verification : List.of("belum_diverifikasi", "menunggu", "ditolak")) {
            jdbc.update("update pengguna set status_verifikasi=? where user_id=?", verification, customer);
            mvc.perform(post("/api/customer/payments").session(session(customer)).header("X-Payment-Request", "1")
                .contentType(MediaType.APPLICATION_JSON).content("{\"orderIds\":[" + orderA + "]}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("KYC_REQUIRED"));
            assertEquals(0, jdbc.queryForObject("select count(*) from pembayaran where order_id=?", Integer.class, orderA));
            assertEquals("menunggu_pembayaran", orderStatus(orderA));
        }
        verify(midtrans, never()).createTransaction(any());
        jdbc.update("update pengguna set status_verifikasi='terverifikasi' where user_id=?", customer);
        pay(customer, String.valueOf(orderA));
        assertEquals(1, jdbc.queryForObject("select count(*) from pembayaran where order_id=?", Integer.class, orderA));
    }
}
