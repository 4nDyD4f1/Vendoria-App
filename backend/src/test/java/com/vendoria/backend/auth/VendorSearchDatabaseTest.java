package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.HashSet;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** PostgreSQL fixtures are rolled back; no changes to existing business data. */
@SpringBootTest
@Transactional
class VendorSearchDatabaseTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired VendorSearchService service;
    @Autowired WebApplicationContext context;
    private MockMvc mvc;
    private long owner, other, customer, noBusiness, vendor, otherVendor, category, item, order, claim, payout;
    private String code;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        owner = -Math.max(100, (UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE) - 10);
        other = owner + 1; customer = owner + 2; noBusiness = owner + 3;
        for (long id : new long[]{owner, other, customer, noBusiness}) {
            jdbc.update("""
                insert into pengguna(user_id,nama,email,no_telp,password_hash,role,status_verifikasi)
                overriding system value values (?,? ,?,'081234567890','test-hash',?,'terverifikasi')
                """, id, id == customer ? "Pelanggan Melati" : "Pemilik Uji", "search-" + id + "@example.test", id == customer ? "customer" : "vendor");
        }
        vendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor) values (?,'Vendor Pencarian') returning vendor_id", Long.class, owner);
        otherVendor = jdbc.queryForObject("insert into vendor(user_id,nama_vendor) values (?,'Vendor Lain') returning vendor_id", Long.class, other);
        category = jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id", Long.class, "Search " + UUID.randomUUID());
        item = item(vendor, "Tenda 100%_aman!", "Kain kanopi biru");
        item(otherVendor, "Tenda vendor rahasia", "Khusus vendor lain");
        code = "SRCH-" + UUID.randomUUID().toString().substring(0, 8);
        order = order(vendor, code, "dikonfirmasi");
        long otherOrder = order(otherVendor, "OTH-" + code, "dikonfirmasi");
        jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,1,10000,10000)", order, item);
        claim = jdbc.queryForObject("insert into klaim(order_id,user_id,alasan) values (?,?,'Kain robek saat hujan') returning klaim_id", Long.class, order, customer);
        jdbc.update("insert into klaim(order_id,user_id,alasan) values (?,?,'Klaim rahasia')", otherOrder, customer);
        payout = jdbc.queryForObject("""
            insert into pencairan_dana(order_id,vendor_id,jumlah,bank,nomor_rekening,nama_pemilik)
            values (?,?,10000,'Bank Uji','998877665544','Pemilik Rekening') returning pencairan_id
            """, Long.class, order, vendor);
        jdbc.update("insert into pencairan_dana(order_id,vendor_id,jumlah,bank) values (?,?,10000,'Bank Rahasia')", otherOrder, otherVendor);
    }

    private long item(long vendorId, String name, String description) {
        return jdbc.queryForObject("""
            insert into item(vendor_id,kategori_id,nama_barang,deskripsi_barang,harga_sewa_per_hari,stok_total,kondisi_barang,minimal_dp,status)
            values (?,?,?,?,10000,10,'Baik',0,'aktif') returning item_id
            """, Long.class, vendorId, category, name, description);
    }
    private long order(long vendorId, String code, String status) {
        return jdbc.queryForObject("""
            insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,total_biaya_sewa,total_dp,status_pesanan,lokasi_acara)
            values (?,?,?,current_date,current_date+2,10000,0,?,'Gedung Anggrek') returning order_id
            """, Long.class, customer, vendorId, code, status);
    }
    private MockHttpSession session(long id) {
        var result = new MockHttpSession(); result.setAttribute(AuthController.SESSION_USER_ID, id); return result;
    }
    private VendorSearchDtos.Listing search(String q, String kind) { return service.list(owner, q, kind, 1, 100); }

    @Test void endpointRequiresActiveVendorSession() throws Exception {
        mvc.perform(get("/api/vendor/search")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/vendor/search").session(session(owner - 1))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/vendor/search").session(session(customer))).andExpect(status().isForbidden());
        jdbc.update("update pengguna set role='admin' where user_id=?", customer);
        mvc.perform(get("/api/vendor/search").session(session(customer))).andExpect(status().isForbidden());
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?", owner);
        mvc.perform(get("/api/vendor/search").session(session(owner))).andExpect(status().isForbidden());
    }

    @Test void returnsOnlyOwnFiveSourcesAndCanonicalLinksWithoutSensitiveFields() throws Exception {
        var result = search("", "all");
        assertEquals(5, result.total());
        assertEquals("Vendor Pencarian", result.vendor().name());
        assertEquals(new HashSet<>(java.util.List.of("/vendor/katalog/" + item, "/vendor/pesanan/" + order,
            "/vendor/serah-terima/" + order, "/vendor/klaim/KLM-" + claim, "/vendor/pencairan/PCR-" + payout)),
            new HashSet<>(result.items().stream().map(VendorSearchDtos.Item::path).toList()));
        assertEquals(0, search("rahasia", "all").total());
        mvc.perform(get("/api/vendor/search").session(session(owner))).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.total").value(5)).andExpect(jsonPath("$.items[0].nomor_rekening").doesNotExist());
        assertFalse(result.toString().contains("998877665544"));
    }

    @Test void searchesNamesEquipmentDescriptionsOrderCodesClaimsAndPayouts() {
        assertEquals(1, search("KANOPI", "catalog").total());
        assertEquals(4, search("melati", "all").total());
        assertEquals(1, search("tenda", "orders").total());
        assertEquals(1, search("anggrek", "handovers").total());
        assertEquals(4, search(code.toLowerCase(), "all").total());
        assertEquals(1, search("robek", "claims").total());
        assertEquals(1, search("Bank Uji", "payouts").total());
        assertEquals(1, search("KLM-" + claim, "all").total());
        assertEquals(1, search("PCR-" + payout, "all").total());
    }

    @Test void wildcardCharactersAndSqlAreLiteralSearchText() {
        item(vendor, "Tenda 100XXaman", "Bukan kecocokan simbol");
        assertEquals(1, search("100%_aman!", "catalog").total());
        assertEquals(0, search("' OR 1=1 --", "all").total());
        assertEquals(1, search("  kanopi  ", "catalog").total());
    }

    @Test void paginatesAllDatabaseRowsIncludingRecordsBeyondOldCacheLimits() {
        jdbc.update("""
            insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total,kondisi_barang,minimal_dp,status)
            select ?,?,'Alat tambahan '||n,10000,1,'Baik',0,'aktif' from generate_series(1,510) n
            """, vendor, category);
        assertEquals(511, search("", "catalog").total());
        assertEquals(1, search("100%_aman!", "catalog").total());
        var first = service.list(owner, "", "catalog", 1, 10);
        var second = service.list(owner, "", "catalog", 2, 10);
        assertEquals(10, first.items().size()); assertEquals(10, second.items().size());
        assertTrue(first.items().stream().noneMatch(second.items()::contains));
        assertEquals(first.items(), service.list(owner, "", "catalog", 1, 10).items());
        var last = service.list(owner, "", "catalog", 9999, 10);
        assertEquals(52, last.page()); assertEquals(1, last.items().size());
    }

    @Test void excludesOrdersThatCannotHaveAHandover() {
        order(vendor, "WAIT-" + code, "menunggu_konfirmasi");
        order(vendor, "CANCEL-" + code, "dibatalkan");
        assertEquals(3, search("", "orders").total());
        assertEquals(1, search("", "handovers").total());
    }

    @Test void missingBusinessIsEmptyWithoutCreatingOne() throws Exception {
        mvc.perform(get("/api/vendor/search").session(session(noBusiness))).andExpect(status().isOk())
            .andExpect(jsonPath("$.vendor").isEmpty()).andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.items").isEmpty());
        assertEquals(0, jdbc.queryForObject("select count(*) from vendor where user_id=?", Integer.class, noBusiness));
    }

    @Test void rejectsInvalidSearchAndPagination() throws Exception {
        for (String query : new String[]{"kind=unknown", "page=0", "page=1000001", "size=0", "size=101", "page=no"}) {
            mvc.perform(get("/api/vendor/search?" + query).session(session(owner))).andExpect(status().isBadRequest());
        }
        for (String q : new String[]{"x".repeat(121), "hello\nworld"}) {
            mvc.perform(get("/api/vendor/search").param("q", q).session(session(owner))).andExpect(status().isBadRequest());
        }
    }
}
