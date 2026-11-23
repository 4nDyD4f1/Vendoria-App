package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL API tests for /api/account/addresses, /refund-accounts and /refunds; every fixture row rolls back. */
@SpringBootTest
@Transactional
class AccountAddressRefundDatabaseTest {
  @Autowired DataSource source;
  @Autowired WebApplicationContext context;
  private JdbcTemplate jdbc;
  private MockMvc mvc;
  private long me,other,vendorUser;
  private String token;
  private static final String ADDR="/api/account/addresses",BANK="/api/account/refund-accounts";
  @BeforeEach void setup() {
    jdbc=new JdbcTemplate(source); token=UUID.randomUUID().toString().substring(0,8);
    mvc=MockMvcBuilders.webAppContextSetup(context).build();
    me=-Math.max(10L,(UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE)-10); other=me+1; vendorUser=me+2;
    for(long id:new long[]{me,other,vendorUser}) jdbc.update("""
        insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,?,?,'test-hash',?)
        """,id,id==me?"Bagas  Arya Pratama":"Orang Lain",id+"-"+token+"@example.test",id==vendorUser?"vendor":"customer");
  }
  private MockHttpSession as(long id) { var s=new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID,id); return s; }
  private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request,long user,String body) { return request.session(as(user)).contentType(MediaType.APPLICATION_JSON).content(body); }
  private String addr(String name,boolean primary) { return "{\"name\":\""+name+"\",\"address\":\"Jl. Raya Dramaga\",\"note\":\"Gerbang barat\",\"primary\":"+primary+"}"; }
  private long addAddress(long user,String name,boolean primary) throws Exception {
    mvc.perform(json(post(ADDR),user,addr(name,primary))).andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"));
    return jdbc.queryForObject("select max(alamat_id) from alamat_acara where user_id=?",Long.class,user);
  }

  @Test void onlyActiveCustomersCanUseTheirAccountData() throws Exception {
    for(String url:new String[]{ADDR,BANK,"/api/account/refunds"}) mvc.perform(get(url)).andExpect(status().isUnauthorized());
    mvc.perform(get(ADDR).session(as(vendorUser))).andExpect(status().isForbidden());
    mvc.perform(get(BANK).session(as(vendorUser))).andExpect(status().isForbidden());
    jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",me);
    mvc.perform(get(ADDR).session(as(me))).andExpect(status().isForbidden());
  }
  @Test void firstAddressBecomesPrimaryAndPrimaryMovesWithoutEverHavingTwo() throws Exception {
    long a=addAddress(me,"Gedung A",false), b=addAddress(me,"Gedung B",false);
    assertTrue(jdbc.queryForObject("select utama from alamat_acara where alamat_id=?",Boolean.class,a));
    assertFalse(jdbc.queryForObject("select utama from alamat_acara where alamat_id=?",Boolean.class,b));
    mvc.perform(json(put(ADDR+"/"+b),me,addr("Gedung B",true))).andExpect(status().isOk()).andExpect(jsonPath("$.primary").value(true));
    assertEquals(1,jdbc.queryForObject("select count(*) from alamat_acara where user_id=? and utama",Integer.class,me));
    assertTrue(jdbc.queryForObject("select utama from alamat_acara where alamat_id=?",Boolean.class,b));
    mvc.perform(json(put(ADDR+"/"+b),me,addr("Gedung B baru",false))).andExpect(status().isOk()).andExpect(jsonPath("$.primary").value(true)); // tidak bisa dicabut
    mvc.perform(get(ADDR).session(as(me))).andExpect(jsonPath("$[0].name").value("Gedung B baru")).andExpect(jsonPath("$[1].name").value("Gedung A"));
  }
  @Test void deletingThePrimaryPromotesAnotherAndRowsOfOthersAreInvisible() throws Exception {
    long a=addAddress(me,"Gedung A",false), b=addAddress(me,"Gedung B",false), c=addAddress(other,"Milik Orang Lain",false);
    mvc.perform(delete(ADDR+"/"+a).session(as(me))).andExpect(status().isNoContent());
    assertTrue(jdbc.queryForObject("select utama from alamat_acara where alamat_id=?",Boolean.class,b));
    mvc.perform(delete(ADDR+"/"+c).session(as(me))).andExpect(status().isNotFound());
    mvc.perform(json(put(ADDR+"/"+c),me,addr("Dibajak",false))).andExpect(status().isNotFound());
    assertEquals("Milik Orang Lain",jdbc.queryForObject("select nama_venue from alamat_acara where alamat_id=?",String.class,c));
    mvc.perform(get(ADDR).session(as(me))).andExpect(jsonPath("$.length()").value(1));
  }
  @Test void validatesAddressInputAndCapsTheCount() throws Exception {
    mvc.perform(json(post(ADDR),me,"{\"name\":\" \",\"address\":\"x\"}")).andExpect(status().isBadRequest());
    mvc.perform(json(post(ADDR),me,"{\"name\":\"x\",\"address\":\""+"a".repeat(501)+"\"}")).andExpect(status().isBadRequest());
    mvc.perform(json(post(ADDR),me,"{\"name\":\"Tanpa Catatan\",\"address\":\"Jl. X\",\"note\":\"  \"}")).andExpect(status().isCreated()).andExpect(jsonPath("$.note").doesNotExist());
    for(int i=1;i<AccountAddressService.MAX;i++) addAddress(me,"Alamat "+i,false);
    mvc.perform(json(post(ADDR),me,addr("Kelebihan",false))).andExpect(status().isBadRequest());
  }
  @Test void refundAccountIsMaskedNeverReturnsFullNumberAndRequiresMatchingOwner() throws Exception {
    String body="{\"bank\":\"BCA\",\"number\":\"8830 1234 5 7992\",\"owner\":\"bagas arya  pratama\"}"; // spasi dan huruf besar-kecil dinormalkan
    mvc.perform(json(post(BANK),me,body)).andExpect(status().isCreated()).andExpect(jsonPath("$.masked").value("8830-•••••-7992"))
        .andExpect(jsonPath("$.primary").value(true)).andExpect(jsonPath("$.number").doesNotExist());
    assertEquals("883012345"+"7992",jdbc.queryForObject("select nomor_rekening from rekening_refund where user_id=?",String.class,me));
    mvc.perform(get(BANK).session(as(me))).andExpect(jsonPath("$[0].bank").value("BCA")).andExpect(jsonPath("$[0].owner").value("bagas arya  pratama".trim()))
        .andExpect(jsonPath("$[0].number").doesNotExist()).andExpect(jsonPath("$[0].nomor_rekening").doesNotExist());
    mvc.perform(json(post(BANK),me,body)).andExpect(status().isConflict());
    mvc.perform(json(post(BANK),me,"{\"bank\":\"Mandiri\",\"number\":\"1234567890\",\"owner\":\"Nama Lain\"}")).andExpect(status().isBadRequest());
    mvc.perform(json(post(BANK),me,"{\"bank\":\"Mandiri\",\"number\":\"1234567890\",\"owner\":\"Bagas Arya Pratama\"}")).andExpect(status().isCreated()).andExpect(jsonPath("$.primary").value(false));
    mvc.perform(get(BANK).session(as(other))).andExpect(jsonPath("$.length()").value(0));
  }
  @Test void refundAccountValidationAndCap() throws Exception {
    String owner="Orang Lain";
    mvc.perform(json(post(BANK),other,"{\"bank\":\"XYZ\",\"number\":\"1234567890\",\"owner\":\""+owner+"\"}")).andExpect(status().isBadRequest());
    mvc.perform(json(post(BANK),other,"{\"bank\":\"BRI\",\"number\":\"12ab\",\"owner\":\""+owner+"\"}")).andExpect(status().isBadRequest());
    for(int i=0;i<RefundAccountService.MAX;i++) mvc.perform(json(post(BANK),other,"{\"bank\":\"BNI\",\"number\":\"10000000"+i+"\",\"owner\":\""+owner+"\"}")).andExpect(status().isCreated());
    mvc.perform(json(post(BANK),other,"{\"bank\":\"BNI\",\"number\":\"2000000000\",\"owner\":\""+owner+"\"}")).andExpect(status().isBadRequest());
    assertEquals(1,jdbc.queryForObject("select count(*) from rekening_refund where user_id=? and utama",Integer.class,other));
  }
  @Test void refundHistoryListsOnlyOwnOrdersRefunds() throws Exception {
    long vendor=jdbc.queryForObject("insert into vendor(user_id,nama_vendor) values (?,'Bisnis Fixture') returning vendor_id",Long.class,vendorUser);
    long mine=jdbc.queryForObject("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa) values (?,?,?,current_date,current_date+1) returning order_id",Long.class,me,vendor,"M-"+token);
    long theirs=jdbc.queryForObject("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa) values (?,?,?,current_date,current_date+1) returning order_id",Long.class,other,vendor,"O-"+token);
    jdbc.update("insert into pengembalian_dana(order_id,jumlah,alasan,status) values (?,150000,'Pesanan dibatalkan','menunggu')",mine);
    jdbc.update("insert into pengembalian_dana(order_id,jumlah,status) values (?,99000,'berhasil')",theirs);
    mvc.perform(get("/api/account/refunds").session(as(me))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].orderCode").value("M-"+token)).andExpect(jsonPath("$[0].amount").value(150000.0)).andExpect(jsonPath("$[0].status").value("menunggu"));
  }
}
