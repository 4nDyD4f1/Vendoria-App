package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Deposit sebagai jaminan + pelunasan sebelum penyerahan, ujung ke ujung. Semua fixture di-rollback. */
@SpringBootTest
@Transactional
class OrderSettlementDatabaseTest {
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    @Autowired HandoverPhotoStore photos;
    @MockitoBean MidtransClient midtrans;
    private JdbcTemplate jdbc;
    private MockMvc mvc;
    private long customer, vendorUser, admin, vendor, item, order;
    private String token;

    @BeforeEach void setup() {
        jdbc = new JdbcTemplate(source); token = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r -> { r.setRemoteAddr(token); return r; })).build();
        customer = -Math.max(10L, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10); vendorUser = customer + 1; admin = customer + 2;
        for (long id : new long[] {customer, vendorUser, admin}) jdbc.update(
            "insert into pengguna(user_id,nama,email,password_hash,role,status_verifikasi) overriding system value values (?,'Budi Uji',?,'fixture',?,'terverifikasi')",
            id, "settle-" + id + "-" + token + "@example.test", id == customer ? "customer" : id == admin ? "admin" : "vendor");
        vendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,alamat,deskripsi) values (?,'Vendor Lunas','Bogor','Alamat uji','Penyewaan alat') returning vendor_id", Long.class, vendorUser);
        long category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, "Settle " + token);
        item = jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) values (?,?,'Genset',30000000,5) returning item_id", Long.class, vendor, category);
        // sewa 30 jt, deposit jaminan 1 jt yang sudah dibayar, vendor sudah konfirmasi
        order = jdbc.queryForObject("""
            insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,total_biaya_sewa,total_dp,status_pesanan)
            values (?,?,?,current_date+1,current_date+2,30000000,1000000,'dikonfirmasi') returning order_id
            """, Long.class, customer, vendor, "VND-ST-" + token.substring(0, 8));
        jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,1,30000000,30000000)", order, item);
        jdbc.update("insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) values (?,'deposit','payment_gateway',1000000,'terverifikasi',?)", order, "DEP-" + token);
        when(midtrans.createTransaction(any())).thenReturn("https://app.sandbox.midtrans.com/snap/v4/redirection/fixture");
    }

    private MockHttpSession session(long id) { var s = new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID, id); return s; }
    private ResultActions send(long user, MockHttpServletRequestBuilder request, String header, String body) throws Exception {
        return mvc.perform(request.session(session(user)).header(header, "1").contentType(MediaType.APPLICATION_JSON).content(body));
    }
    private ResultActions read(long user, String path) throws Exception { return mvc.perform(get(path).session(session(user))).andExpect(status().isOk()); }
    private ResultActions vendorOrder(String action, String expected) throws Exception {
        return send(vendorUser, post("/api/vendor/orders/" + order + "/action"), "X-Vendor-Orders",
            "{\"action\":\"" + action + "\",\"expected_status\":\"" + expected + "\"}");
    }
    private ResultActions damage() throws Exception {
        return send(vendorUser, post("/api/vendor/handovers/" + order + "/damage"), "X-Handover-Request", "{\"reason\":\"Genset retak\"}");
    }
    private String payPelunasan() throws Exception {
        var result = send(customer, post("/api/customer/payments"), "X-Payment-Request", "{\"orderIds\":[" + order + "]}").andExpect(status().isOk()).andReturn();
        return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.reference");
    }
    private void settle(String reference) throws Exception {
        when(midtrans.status(reference)).thenReturn(Map.of("transaction_status", "settlement", "gross_amount", "30000000.00", "status_code", "200"));
        read(customer, "/api/customer/payments/confirmation?ref=" + reference).andExpect(jsonPath("$.state").value("paid")).andExpect(jsonPath("$.kind").value("pelunasan"));
    }
    private void evidence() throws Exception {
        for (String type : new String[] {"serah_terima", "pengembalian"}) for (int n = 1; n <= 4; n++) {
            String locator = photos.save(photos.normalize(VendorHandoversDatabaseTest.image(n)));
            jdbc.update("insert into cek_barang(order_id,item_id,tipe_inspeksi,foto_kondisi,catatan_kondisi,diperiksa_oleh) values (?,?,?,?,'Diperiksa',?)",
                order, item, type, locator, vendorUser);
        }
    }
    private int refunds() { return jdbc.queryForObject("select count(*) from pengembalian_dana where order_id=?", Integer.class, order); }
    private String title(String key) { return "$.items[?(@.id=='" + key + "')].title"; }

    private ResultActions report(long actor, String json, boolean withPhoto) throws Exception {
        var request = multipart("/api/orders/" + order + "/reports")
            .file(new MockMultipartFile("data", "data.json", "application/json", json.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        if (withPhoto) request.file(VendorHandoversDatabaseTest.image(7));
        return mvc.perform(request.header("X-Customer-Orders", "1").session(session(actor)));
    }
    private static String body(String type, Integer units, long itemId) {
        return "{\"type\":\"" + type + "\",\"description\":\"Bermasalah\"" + (units == null ? "" : ",\"itemId\":" + itemId + ",\"units\":" + units) + "}";
    }
    private long claim() { return jdbc.queryForObject("select klaim_id from klaim where order_id=?", Long.class, order); }
    private ResultActions decide(String json) throws Exception {
        return send(admin, post("/api/admin/claims/" + claim() + "/decision"), "X-Admin-Claims", json);
    }
    private String option(String type) { return "$.options[?(@.type=='" + type + "')].available"; }
    private long refunded() { return jdbc.queryForObject("select coalesce(sum(jumlah),0) from pengembalian_dana where order_id=?", Long.class, order); }
    private String orderStatus() { return jdbc.queryForObject("select status_pesanan from pemesanan where order_id=?", String.class, order); }
    private void dates(int start, int end) {
        jdbc.update("update pemesanan set tanggal_mulai_sewa=current_date+?,tanggal_selesai_sewa=current_date+? where order_id=?", start, end, order);
    }
    private void handedOver() throws Exception { evidence(); vendorOrder("proses", "dikonfirmasi").andExpect(status().isOk()); }

    @Test void goodsThatNeverArriveRefundEverythingAndCancelTheOrder() throws Exception {
        report(customer, body("tidak_sampai", null, 0), false).andExpect(status().isConflict()); // belum lunas
        settle(payPelunasan());
        report(customer, body("tidak_sampai", null, 0), false).andExpect(status().isConflict()); // belum tanggal sewa
        dates(0, 1);
        read(customer, "/api/orders/" + order + "/reports").andExpect(jsonPath(option("tidak_sampai")).value(true));
        mvc.perform(get("/api/orders/" + order + "/reports").session(session(vendorUser))).andExpect(status().isForbidden());
        report(customer, body("tidak_sampai", null, 0), false).andExpect(status().isOk()).andExpect(jsonPath("$.report.status").value("diajukan"));
        report(customer, body("tidak_sampai", null, 0), false).andExpect(status().isConflict());

        read(vendorUser, "/api/vendor/orders/" + order).andExpect(jsonPath("$.order.report_open").value(true)).andExpect(jsonPath("$.order.can_process").value(false));
        vendorOrder("proses", "dikonfirmasi").andExpect(status().isConflict());
        read(vendorUser, "/api/vendor/notifications").andExpect(jsonPath("$[?(@.id=='klaim:" + claim() + ":buka')].title").value("Pelanggan melaporkan pesanan"));
        read(admin, "/api/admin/claims").andExpect(jsonPath("$[?(@.id=='KLM-" + claim() + "')].type").value("tidak_sampai"));
        read(customer, "/api/customer/notifications").andExpect(jsonPath(title("c:c:" + claim() + ":open")).value("Laporan Anda sedang ditinjau"));

        decide("{\"status\":\"disetujui\"}").andExpect(status().isOk()).andExpect(jsonPath("$.compensation").value(31000000));
        assertEquals("dibatalkan", orderStatus());
        assertEquals(31000000L, refunded());
        read(vendorUser, "/api/vendor/payouts").andExpect(jsonPath("$.available.amount").value(0));
    }

    @Test void missingUnitsRefundOnlyThoseAndFeeAppliesToTheRest() throws Exception {
        jdbc.update("update detail_item set jumlah_sewa=3,harga_saat_sewa=10000000 where order_id=?", order);
        settle(payPelunasan()); dates(0, 1); handedOver();
        report(customer, body("kurang", 1, item), false).andExpect(status().isBadRequest()); // foto wajib
        report(customer, body("kurang", 4, item), true).andExpect(status().isBadRequest());
        report(customer, body("kurang", 2, item), true).andExpect(status().isOk());
        read(customer, "/api/claims/" + claim() + "/photos/pelapor");
        read(vendorUser, "/api/claims/" + claim() + "/photos/pelapor");

        var response = multipart("/api/vendor/claims/" + claim() + "/response")
            .file(new MockMultipartFile("data", "data.json", "application/json", "{\"text\":\"Sudah lengkap\"}".getBytes()));
        mvc.perform(response.header("X-Vendor-Claims", "1").session(session(vendorUser))).andExpect(status().isNoContent());
        read(admin, "/api/admin/claims").andExpect(jsonPath("$[?(@.id=='KLM-" + claim() + "')].response").value("Sudah lengkap"));

        // admin mengoreksi: hanya 1 unit yang benar-benar kurang
        decide("{\"status\":\"disetujui\",\"units\":1}").andExpect(status().isOk()).andExpect(jsonPath("$.compensation").value(10000000));
        assertEquals("berjalan", orderStatus());
        for (String from : new String[] {"berjalan", "dikembalikan"}) vendorOrder("proses", from).andExpect(status().isOk());
        read(vendorUser, "/api/vendor/payouts").andExpect(jsonPath("$.available.fee").value(1200000)).andExpect(jsonPath("$.available.amount").value(18800000));
    }

    @Test void wrongGoodsAreRefundedOnlyAfterTheyComeBack() throws Exception {
        settle(payPelunasan()); dates(0, 1); handedOver();
        report(customer, body("tidak_sesuai", null, 0), true).andExpect(status().isOk());
        decide("{\"status\":\"disetujui\"}").andExpect(status().isOk()).andExpect(jsonPath("$.awaitingReturn").value(true)).andExpect(jsonPath("$.compensation").isEmpty());
        assertEquals(0L, refunded());
        vendorOrder("proses", "berjalan").andExpect(status().isConflict());
        send(vendorUser, post("/api/vendor/claims/" + claim() + "/returned"), "X-Vendor-Claims", "").andExpect(status().isNoContent());
        send(vendorUser, post("/api/vendor/claims/" + claim() + "/returned"), "X-Vendor-Claims", "").andExpect(status().isConflict());
        assertEquals("dibatalkan", orderStatus());
        assertEquals(31000000L, refunded());
    }

    @Test void brokenGoodsRefundTheRemainingDaysAndTheShortWindowCloses() throws Exception {
        settle(payPelunasan()); dates(-1, 3); handedOver();
        jdbc.update("update riwayat_status_pesanan set diubah_pada=now()-interval '25 hours' where order_id=? and status_baru='berjalan'", order);
        read(customer, "/api/orders/" + order + "/reports").andExpect(jsonPath(option("kurang")).value(false))
            .andExpect(jsonPath(option("tidak_sesuai")).value(false)).andExpect(jsonPath(option("tidak_berfungsi")).value(true));
        report(customer, body("tidak_berfungsi", 1, item), true).andExpect(status().isOk());
        decide("{\"status\":\"disetujui\"}").andExpect(status().isOk()).andExpect(jsonPath("$.compensation").value(22500000)); // 3 dari 4 hari
    }

    @Test void otherReportsNeedAnAmountAndRejectionReleasesTheOrder() throws Exception {
        settle(payPelunasan()); dates(0, 1);
        report(customer, body("lainnya", null, 0), true).andExpect(status().isOk());
        decide("{\"status\":\"disetujui\"}").andExpect(status().isBadRequest());
        decide("{\"status\":\"disetujui\",\"amount\":30000001}").andExpect(status().isBadRequest());
        decide("{\"status\":\"ditolak\",\"note\":\"Bukti tidak cukup\"}").andExpect(status().isOk());
        assertEquals(0L, refunded());
        handedOver();
    }

    @Test void handoverWaitsForFullRentOnTopOfTheDeposit() throws Exception {
        evidence();
        read(vendorUser, "/api/vendor/orders/" + order).andExpect(jsonPath("$.order.awaiting_settlement").value(true)).andExpect(jsonPath("$.order.can_process").value(false));
        vendorOrder("proses", "dikonfirmasi").andExpect(status().isConflict());
        read(customer, "/api/customer/payments?orders=" + order).andExpect(jsonPath("$.amountDue").value(30000000)).andExpect(jsonPath("$.orders[0].kind").value("pelunasan"));
        read(customer, "/api/customer/notifications").andExpect(jsonPath(title("c:o:" + order + ":settle")).value("Bayar pelunasan sewa"));

        settle(payPelunasan());
        read(customer, "/api/customer/payments?orders=" + order).andExpect(jsonPath("$.amountDue").value(0));
        read(vendorUser, "/api/vendor/notifications").andExpect(jsonPath("$[?(@.id=='pesanan:" + order + ":lunas')].title").value("Uang masuk: pelunasan sewa"));
        vendorOrder("batalkan", "dikonfirmasi").andExpect(status().isConflict()); // sudah lunas
        vendorOrder("proses", "dikonfirmasi").andExpect(status().isOk()).andExpect(jsonPath("$.order.status_pesanan").value("berjalan"));
    }

    @Test void undamagedGoodsReturnTheDepositThroughAnAdminTransfer() throws Exception {
        evidence(); settle(payPelunasan());
        for (String from : new String[] {"dikonfirmasi", "berjalan", "dikembalikan"}) vendorOrder("proses", from).andExpect(status().isOk());
        assertEquals(1, refunds());
        long refund = jdbc.queryForObject("select pengembalian_id from pengembalian_dana where order_id=?", Long.class, order);
        read(customer, "/api/customer/notifications").andExpect(jsonPath(title("c:r:" + refund + ":pending")).value("Dana akan dikembalikan"));
        read(admin, "/api/admin/notifications").andExpect(jsonPath("$[?(@.id=='refund:" + refund + "')]").isNotEmpty());

        var done = post("/api/admin/reports/refunds/" + refund + "/complete");
        send(admin, done, "X-Admin-Payouts", "{\"reference\":\"TRF-" + token + "\"}").andExpect(status().isConflict()); // belum ada rekening refund
        jdbc.update("insert into rekening_refund(user_id,bank,nomor_rekening,nama_pemilik,utama) values (?,'BCA','1234567890','Budi Uji',true)", customer);
        send(admin, post("/api/admin/reports/refunds/" + refund + "/complete"), "X-Admin-Payouts", "{\"reference\":\"TRF-" + token + "\"}")
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("berhasil")).andExpect(jsonPath("$.amount").value(1000000));
        read(customer, "/api/customer/notifications").andExpect(jsonPath(title("c:r:" + refund + ":success")).value("Uang masuk: Rp 1.000.000"));
        // vendor hanya menerima sewa dikurangi biaya platform 6%
        read(vendorUser, "/api/vendor/payouts").andExpect(jsonPath("$.available.amount").value(28200000)).andExpect(jsonPath("$.available.deposit").value(0));
    }

    @Test void approvedDamageReportGivesTheWholeDepositToTheVendor() throws Exception {
        evidence(); settle(payPelunasan());
        damage().andExpect(status().isConflict()); // belum tahap pemeriksaan pengembalian
        for (String from : new String[] {"dikonfirmasi", "berjalan"}) vendorOrder("proses", from).andExpect(status().isOk());
        damage().andExpect(status().isOk()).andExpect(jsonPath("$.claimStatus").value("diajukan")).andExpect(jsonPath("$.deposit").value(1000000));
        damage().andExpect(status().isConflict());
        vendorOrder("proses", "dikembalikan").andExpect(status().isConflict()); // menunggu admin
        long claim = jdbc.queryForObject("select klaim_id from klaim where order_id=?", Long.class, order);
        send(admin, post("/api/admin/claims/" + claim + "/decision"), "X-Admin-Claims", "{\"status\":\"disetujui\"}")
            .andExpect(status().isOk()).andExpect(jsonPath("$.compensation").value(1000000));
        vendorOrder("proses", "dikembalikan").andExpect(status().isOk());
        assertEquals(0, refunds());
        read(customer, "/api/customer/notifications").andExpect(jsonPath(title("c:c:" + claim + ":approved")).value("Deposit tidak dikembalikan"));
        read(vendorUser, "/api/vendor/payouts").andExpect(jsonPath("$.available.amount").value(29200000)).andExpect(jsonPath("$.available.deposit").value(1000000));

        jdbc.update("insert into rekening_vendor(vendor_id,bank,nomor_rekening,nama_pemilik) values (?,'BCA','9876543210','Budi Uji')", vendor);
        send(vendorUser, post("/api/vendor/payouts/request"), "X-Vendor-Payouts", "").andExpect(status().is2xxSuccessful());
        read(vendorUser, "/api/vendor/payouts").andExpect(jsonPath("$.items[0].amount").value(29200000)).andExpect(jsonPath("$.items[0].deposit").value(1000000));
        read(admin, "/api/admin/reports/payouts").andExpect(jsonPath("$[?(@.order=='VND-ST-" + token.substring(0, 8) + "')].deposit").value(1000000));
    }

    @Test void rejectedDamageReportStillReturnsTheDeposit() throws Exception {
        evidence(); settle(payPelunasan());
        for (String from : new String[] {"dikonfirmasi", "berjalan"}) vendorOrder("proses", from).andExpect(status().isOk());
        damage().andExpect(status().isOk());
        jdbc.update("update klaim set status='ditolak', diputuskan_pada=now() where order_id=?", order);
        vendorOrder("proses", "dikembalikan").andExpect(status().isOk());
        assertEquals(1, refunds());
    }

    @Test void cancellingBeforeSettlementAndLatePaymentsGoBackToTheCustomer() throws Exception {
        String reference = payPelunasan();
        vendorOrder("batalkan", "dikonfirmasi").andExpect(status().isOk());
        assertEquals(1, refunds()); // deposit
        settle(reference); // Midtrans melunasi sesudah pesanan batal
        assertEquals(2, refunds());
        assertEquals("dibatalkan", jdbc.queryForObject("select status_pesanan from pemesanan where order_id=?", String.class, order));
    }

    @Test void payingTheSameBillTwiceRefundsTheSecondPayment() throws Exception {
        String first = payPelunasan();
        Thread.sleep(1100); // referensi memakai detik + 4 angka acak
        String second = payPelunasan();
        settle(first); settle(second);
        assertEquals(1, refunds());
        assertEquals("Pembayaran ganda", jdbc.queryForObject("select alasan from pengembalian_dana where order_id=?", String.class, order));
    }
}
