package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
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
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL fixture data; every row is rolled back after each test. */
@SpringBootTest
@Transactional
class CustomerNotificationDatabaseTest {
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    @Autowired CustomerNotificationService service;
    JdbcTemplate jdbc;
    MockMvc mvc;
    long customer,other,vendorUser,admin,vendor;
    String token;
    @BeforeEach void setup() {
        jdbc=new JdbcTemplate(source); token=UUID.randomUUID().toString();
        mvc=MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r->{r.setRemoteAddr(token);return r;})).build();
        customer=-Math.max(10L,(UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE)-10); other=customer+1; vendorUser=customer+2; admin=customer+3;
        for(long id:new long[]{customer,other,vendorUser,admin}) jdbc.update("insert into pengguna(user_id,nama,email,password_hash,role,status_verifikasi) overriding system value values (?,'Customer notification fixture',?,'fixture',?,'terverifikasi')",
            id,"cnotif-"+id+"-"+token+"@example.test",id==vendorUser?"vendor":id==admin?"admin":"customer");
        vendor=jdbc.queryForObject("insert into vendor(user_id,nama_vendor) values (?,'Notification fixture vendor') returning vendor_id",Long.class,vendorUser);
    }
    MockHttpSession session(long id) { var session=new MockHttpSession();session.setAttribute(AuthController.SESSION_USER_ID,id);return session; }
    ResultActions list(long user) throws Exception { return mvc.perform(get("/api/customer/notifications").session(session(user))); }
    ResultActions read(long user,String body) throws Exception {
        return mvc.perform(post("/api/customer/notifications/read").session(session(user)).header("X-Customer-Notifications","1").contentType(MediaType.APPLICATION_JSON).content(body));
    }
    long order(long owner,String status) {
        return jdbc.queryForObject("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,status_pesanan) values (?,?,?,current_date+1,current_date+3,?) returning order_id",Long.class,owner,vendor,"CN-"+UUID.randomUUID().toString().substring(0,12),status);
    }
    long kyc(long owner,String status) {
        return jdbc.queryForObject("insert into kyc_verifikasi(user_id,jenis_dokumen,dokumen_url,status) values (?,'KTP','private://never-expose',?) returning kyc_id",Long.class,owner,status);
    }
    String ids(String... ids) { return "{\"ids\":["+String.join(",",Arrays.stream(ids).map(id->"\""+id+"\"").toList())+"]}"; }

    @Test void onlyActiveAuthenticatedCustomersCanReadAndWrite() throws Exception {
        mvc.perform(get("/api/customer/notifications")).andExpect(status().isUnauthorized());
        for(long user:new long[]{vendorUser,admin}) {
            list(user).andExpect(status().isForbidden());
            read(user,ids("c:o:1:done")).andExpect(status().isForbidden());
        }
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",customer);
        list(customer).andExpect(status().isForbidden());
        read(customer,ids("c:o:1:done")).andExpect(status().isForbidden());
        list(Long.MAX_VALUE).andExpect(status().isUnauthorized());
    }
    @Test void emptyAccountHasNoInventedKycOrUnreadCount() throws Exception {
        list(customer).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.items").isEmpty()).andExpect(jsonPath("$.unread").value(0)).andExpect(jsonPath("$.total").value(0));
    }
    @Test void unverifiedCustomerGetsOwnKycReminderUntilVerificationStarts() throws Exception {
        jdbc.update("update pengguna set status_verifikasi='belum_diverifikasi' where user_id=?",customer);
        list(customer).andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.unread").value(1))
            .andExpect(jsonPath("$.items[0].id").value("c:k:0:none")).andExpect(jsonPath("$.items[0].kind").value("kyc"));
        assertEquals(0,service.list(other).total());
        read(customer,ids("c:k:0:none")).andExpect(status().isNoContent());
        list(customer).andExpect(jsonPath("$.items[0].read").value(true)).andExpect(jsonPath("$.unread").value(0));
        jdbc.update("update pengguna set status_verifikasi='menunggu' where user_id=?",customer);
        assertEquals(0,service.list(customer).total());
    }
    @Test void onlyOwnersOrdersKycPaymentsRefundsAndClaimsAreIncluded() throws Exception {
        long own=order(customer,"dikonfirmasi"); order(other,"berjalan");
        long older=kyc(customer,"ditolak"),latest=kyc(customer,"menunggu");kyc(other,"terverifikasi");
        long payment=jdbc.queryForObject("insert into pembayaran(order_id,jenis,metode,jumlah,status) values (?,'deposit','transfer_bank',100,'terverifikasi') returning pembayaran_id",Long.class,own);
        jdbc.update("insert into pengembalian_dana(order_id,pembayaran_id,jumlah,status) values (?,?,100,'berhasil')",own,payment);
        jdbc.update("insert into klaim(order_id,user_id,alasan,status) values (?,?,'Fixture','ditinjau')",own,vendorUser);
        var result=service.list(customer);
        assertEquals(5,result.total()); assertEquals(5,result.unread());
        assertEquals(Set.of("order","kyc","payment","refund","claim"),new HashSet<>(result.items().stream().map(i->i.kind()).toList()));
        assertTrue(result.items().stream().anyMatch(i->i.id().equals("c:k:"+latest+":pending")));
        assertFalse(result.items().stream().anyMatch(i->i.id().startsWith("c:k:"+older+":")));
        mvc.perform(get("/api/customer/notifications").param("user_id",String.valueOf(other)).session(session(customer)))
            .andExpect(jsonPath("$.total").value(5)).andExpect(jsonPath("$.items[0].dokumen_url").doesNotExist())
            .andExpect(jsonPath("$.items[0].path").doesNotExist());
        assertEquals(2,service.list(other).total());
    }
    @Test void readIsPersistentIdempotentAndRejectsForeignOrInventedEvents() throws Exception {
        long own=order(customer,"dikonfirmasi"),foreign=order(other,"dikonfirmasi");
        String key="c:o:"+own+":confirmed";
        read(customer,ids(key,key,"c:o:"+foreign+":confirmed","c:o:0:done")).andExpect(status().isNoContent());
        read(customer,ids(key)).andExpect(status().isNoContent());
        list(customer).andExpect(jsonPath("$.items[0].read").value(true)).andExpect(jsonPath("$.unread").value(0));
        assertEquals(1,jdbc.queryForObject("select count(*) from notifikasi_admin where user_id=?",Integer.class,customer));
        assertEquals(1,service.list(other).unread());
        assertEquals(0,jdbc.queryForObject("select count(*) from notifikasi_admin where user_id=?",Integer.class,other));
    }
    @Test void statusChangesProduceNewUnreadEventWithActualHistoryTime() throws Exception {
        long own=order(customer,"menunggu_konfirmasi");
        read(customer,ids("c:o:"+own+":review")).andExpect(status().isNoContent());
        jdbc.update("update pemesanan set status_pesanan='dikonfirmasi' where order_id=?",own);
        jdbc.update("insert into riwayat_status_pesanan(order_id,status_sebelumnya,status_baru,diubah_oleh,diubah_pada) values (?,'menunggu_konfirmasi','dikonfirmasi',?,now()+interval '1 minute')",own,vendorUser);
        var result=service.list(customer);
        assertEquals(1,result.total());assertEquals(1,result.unread());
        assertEquals("c:o:"+own+":confirmed",result.items().getFirst().id());
        assertTrue(java.time.Instant.parse(result.items().getFirst().createdAt()).isAfter(java.time.Instant.now()));
    }
    @Test void unreadCountAndMarkAllCoverMoreThanTheFiftyDisplayedEvents() throws Exception {
        for(int n=0;n<55;n++) order(customer,"selesai");
        order(other,"selesai");
        var before=service.list(customer); assertEquals(50,before.items().size());assertEquals(55,before.unread());assertEquals(55,before.total());
        mvc.perform(post("/api/customer/notifications/read-all").session(session(customer)).header("X-Customer-Notifications","1"))
            .andExpect(status().isNoContent());
        assertEquals(0,service.list(customer).unread());assertEquals(1,service.list(other).unread());
        assertEquals(55,jdbc.queryForObject("select count(*) from notifikasi_admin where user_id=?",Integer.class,customer));
    }
    @Test void validationMutationHeaderAndOriginAreEnforced() throws Exception {
        for(String body:new String[]{"{}","{\"ids\":[]}","{\"ids\":[null]}","{\"ids\":[\"kyc:1\"]}","{\"ids\":[\"c:o:1:drop;\"]}"})
            read(customer,body).andExpect(status().isBadRequest());
        mvc.perform(post("/api/customer/notifications/read").session(session(customer)).contentType(MediaType.APPLICATION_JSON).content(ids("c:o:1:done")))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/customer/notifications/read-all").session(session(customer)))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/customer/notifications/read-all").session(session(customer)).header("X-Customer-Notifications","1").header("Origin","https://untrusted.example"))
            .andExpect(status().isForbidden());
        assertEquals(0,jdbc.queryForObject("select count(*) from notifikasi_admin where user_id=?",Integer.class,customer));
    }
}
