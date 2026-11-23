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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL API tests; all fixture accounts/businesses/history roll back. */
@SpringBootTest
@Transactional
class AdminAccountDatabaseTest {
  @Autowired DataSource source;
  @Autowired WebApplicationContext context;
  private JdbcTemplate jdbc;
  private MockMvc mvc;
  private long admin,outsider,vendorUser;
  private String token,email;
  private static final String BASE="/api/admin/accounts";
  private static final String PASSWORD="FixturePassword9!";
  @BeforeEach void setup() {
    jdbc=new JdbcTemplate(source); token=UUID.randomUUID().toString(); email="managed-"+token+"@example.test";
    mvc=MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r->{r.setRemoteAddr(token);return r;})).build();
    admin=-Math.max(10L,(UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE)-10); outsider=admin+1; vendorUser=admin+2;
    for(long id:new long[]{admin,outsider,vendorUser}) jdbc.update("""
        insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Admin Account Fixture',?,'test-hash',?)
        """,id,"aa-"+(id-admin)+"-"+token+"@example.test",id==admin?"admin":id==outsider?"customer":"vendor");
  }
  private MockHttpSession session(long id) { var s=new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID,id); return s; }
  private MockHttpServletRequestBuilder mutation(MockHttpServletRequestBuilder request,String body) { return request.header("X-Admin-Accounts","1").session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(body); }
  private String customer() { return """
      {"name":"Customer Fixture","email":"%s","phone":"081234567890","status":"Aktif","notes":"Catatan fixture","password":"%s"}
      """.formatted(email,PASSWORD); }
  private String vendor() { return """
      {"name":"Bisnis Fixture","owner":"Pemilik Fixture","email":"%s","phone":"081234567890","city":"Bogor","address":"Alamat Fixture","description":"Usaha fixture","status":"Aktif","businessStatus":"Nonaktif","password":"%s"}
      """.formatted(email,PASSWORD); }
  private long create(String kind,String body) throws Exception {
    mvc.perform(mutation(post(BASE+"/"+kind),body)).andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"));
    return jdbc.queryForObject("select user_id from pengguna where email=?",Long.class,email);
  }
  @Test void onlyActiveAdministratorsCanReadOrWriteAndCannotTargetAdminAccounts() throws Exception {
    mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
    for(long user:new long[]{outsider,vendorUser}) {
      mvc.perform(get(BASE).session(session(user))).andExpect(status().isForbidden());
      mvc.perform(mutation(post(BASE+"/customer"),customer()).session(session(user))).andExpect(status().isForbidden());
    }
    mvc.perform(mutation(put(BASE+"/customer/"+admin),customer())).andExpect(status().isNotFound());
    mvc.perform(mutation(delete(BASE+"/vendor/"+admin),"{}")).andExpect(status().isNotFound());
    mvc.perform(mutation(post(BASE+"/admin"),customer())).andExpect(status().isNotFound());
    jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",admin);
    mvc.perform(get(BASE).session(session(admin))).andExpect(status().isForbidden());
  }
  @Test void customerCreateStoresHashAndNeverExposesSecretsOrCreatesBusiness() throws Exception {
    long id=create("customer",customer());
    var row=jdbc.queryForMap("select role,password_hash,password_dibuat,status_verifikasi from pengguna where user_id=?",id);
    assertEquals("customer",row.get("role")); assertEquals("belum_diverifikasi",row.get("status_verifikasi")); assertEquals(true,row.get("password_dibuat"));
    assertTrue(new BCryptPasswordEncoder().matches(PASSWORD,(String)row.get("password_hash")));
    assertEquals(0,jdbc.queryForObject("select count(*) from vendor where user_id=?",Integer.class,id));
    mvc.perform(get(BASE+"/customer/"+id).session(session(admin))).andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Customer Fixture")).andExpect(jsonPath("$.password").doesNotExist())
        .andExpect(jsonPath("$.password_hash").doesNotExist()).andExpect(jsonPath("$.google_sub").doesNotExist());
    mvc.perform(get(BASE).session(session(admin))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
  }
  @Test void vendorCreateAndUpdatePersistBothTablesWithoutChangingOtherBusinessColumns() throws Exception {
    long id=create("vendor",vendor());
    assertEquals("Pemilik Fixture",jdbc.queryForObject("select nama from pengguna where user_id=?",String.class,id));
    var business=jdbc.queryForMap("select nama_vendor,kota,alamat,status_aktif from vendor where user_id=?",id);
    assertEquals("Bisnis Fixture",business.get("nama_vendor")); assertEquals("Bogor",business.get("kota")); assertEquals(false,business.get("status_aktif"));
    jdbc.update("update vendor set rating=4.5,latitude=-6,foto='fixture-photo' where user_id=?",id);
    mvc.perform(mutation(put(BASE+"/vendor/"+id),vendor().replace("Bisnis Fixture","Bisnis Diperbarui").replace("Bogor","Depok").replace("Nonaktif","Aktif").replace(PASSWORD,"")))
        .andExpect(status().isOk()).andExpect(jsonPath("$.businessStatus").value("Aktif"));
    business=jdbc.queryForMap("select nama_vendor,kota,rating,latitude,foto from vendor where user_id=?",id);
    assertEquals("Bisnis Diperbarui",business.get("nama_vendor")); assertEquals("Depok",business.get("kota"));
    assertEquals("fixture-photo",business.get("foto")); assertEquals(4.5,((Number)business.get("rating")).doubleValue()); assertEquals(-6,((Number)business.get("latitude")).intValue());
    mvc.perform(get(BASE+"/customer/"+id).session(session(admin))).andExpect(status().isNotFound());
  }
  @Test void registeredVendorWithoutBusinessIsIncludedAndCanBeCompleted() throws Exception {
    mvc.perform(get(BASE+"/vendor/"+vendorUser).session(session(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.businessStatus").value("Nonaktif"));
    String currentEmail=jdbc.queryForObject("select email from pengguna where user_id=?",String.class,vendorUser);
    mvc.perform(mutation(put(BASE+"/vendor/"+vendorUser),vendor().replace(email,currentEmail).replace(PASSWORD,""))).andExpect(status().isOk());
    assertEquals(1,jdbc.queryForObject("select count(*) from vendor where user_id=?",Integer.class,vendorUser));
  }
  @Test void blankPasswordPreservesCredentialsAndGoogleTwoFactorAndKycAreProtected() throws Exception {
    long id=create("customer",customer());
    jdbc.update("update pengguna set google_sub=?,password_dibuat=false,two_factor_email=true,status_verifikasi='terverifikasi' where user_id=?","fixture-"+token,id);
    String before=jdbc.queryForObject("select password_hash from pengguna where user_id=?",String.class,id);
    mvc.perform(mutation(put(BASE+"/customer/"+id),customer().replace(PASSWORD,"").replace("Customer Fixture","Customer Baru"))).andExpect(status().isOk()).andExpect(jsonPath("$.email_locked").value(true));
    assertEquals(before,jdbc.queryForObject("select password_hash from pengguna where user_id=?",String.class,id));
    assertEquals(false,jdbc.queryForObject("select password_dibuat from pengguna where user_id=?",Boolean.class,id));
    mvc.perform(mutation(put(BASE+"/customer/"+id),customer().replace(email,"changed-"+email))).andExpect(status().isBadRequest());
    mvc.perform(mutation(put(BASE+"/customer/"+id),customer().replace(PASSWORD,"ReplacementPassword9!"))).andExpect(status().isOk());
    var row=jdbc.queryForMap("select password_hash,password_dibuat,two_factor_email,status_verifikasi,google_sub from pengguna where user_id=?",id);
    assertTrue(new BCryptPasswordEncoder().matches("ReplacementPassword9!",(String)row.get("password_hash")));
    assertEquals(true,row.get("password_dibuat")); assertEquals(true,row.get("two_factor_email")); assertEquals("terverifikasi",row.get("status_verifikasi")); assertEquals("fixture-"+token,row.get("google_sub"));
  }
  @Test void validatesFieldsAndCaseInsensitiveEmailUniquenessWithoutPartialVendorRows() throws Exception {
    long id=create("customer",customer());
    mvc.perform(mutation(post(BASE+"/vendor"),vendor().replace(email,email.toUpperCase(java.util.Locale.ROOT)))).andExpect(status().isConflict());
    assertEquals(0,jdbc.queryForObject("select count(*) from vendor where user_id=?",Integer.class,id));
    for(String invalid:new String[]{customer().replace(PASSWORD,""),customer().replace(PASSWORD,"short"),customer().replace("081234567890","abc"),customer().replace("Aktif","Ditangguhkan"),customer().replace("Customer Fixture","x".repeat(121)),customer().replace(PASSWORD,"😀".repeat(24))})
      mvc.perform(mutation(post(BASE+"/customer"),invalid.replace(email,"new-"+email))).andExpect(status().isBadRequest());
    mvc.perform(mutation(post(BASE+"/vendor"),vendor().replace("Pemilik Fixture","").replace(email,"new-"+email))).andExpect(status().isBadRequest());
    assertEquals(0,jdbc.queryForObject("select count(*) from pengguna where email=?",Integer.class,"new-"+email));
  }
  @Test void deletesOnlyUnlinkedAccountsAndBulkDeletionIsAtomic() throws Exception {
    long clean=create("customer",customer()); email="second-"+email; long linked=create("customer",customer());
    jdbc.update("insert into kyc_verifikasi(user_id,jenis_dokumen,dokumen_url) values (?,'Fixture','private://fixture')",linked);
    mvc.perform(mutation(post(BASE+"/customer/delete"),"{\"ids\":["+clean+","+linked+"]}")).andExpect(status().isConflict());
    assertEquals(2,jdbc.queryForObject("select count(*) from pengguna where user_id in (?,?)",Integer.class,clean,linked));
    mvc.perform(mutation(delete(BASE+"/customer/"+clean),"{}")).andExpect(status().isNoContent());
    assertEquals(0,jdbc.queryForObject("select count(*) from pengguna where user_id=?",Integer.class,clean));
    email="vendor-"+email; long vendor=create("vendor",vendor());
    mvc.perform(mutation(delete(BASE+"/vendor/"+vendor),"{}")).andExpect(status().isNoContent());
    assertEquals(0,jdbc.queryForObject("select count(*) from vendor where user_id=?",Integer.class,vendor));
  }
  @Test void transactionHistoryBlocksDeletionAndDeactivationImmediatelyBlocksVendorApi() throws Exception {
    long customer=create("customer",customer()); email="vendor-"+email; long vendor=create("vendor",vendor());
    long business=jdbc.queryForObject("select vendor_id from vendor where user_id=?",Long.class,vendor);
    jdbc.update("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa) values (?,?,?,current_date,current_date+1)",customer,business,token);
    for(var target:new Object[][]{{"customer",customer},{"vendor",vendor}})
      mvc.perform(mutation(delete(BASE+"/"+target[0]+"/"+target[1]),"{}")).andExpect(status().isConflict());
    mvc.perform(mutation(put(BASE+"/vendor/"+vendor),vendor().replace("\"status\":\"Aktif\"","\"status\":\"Nonaktif\"").replace(PASSWORD,""))).andExpect(status().isOk());
    mvc.perform(get("/api/vendor/catalog").session(session(vendor))).andExpect(status().isForbidden());
    assertEquals(1,jdbc.queryForObject("select count(*) from pemesanan where kode_pemesanan=?",Integer.class,token));
  }
  @Test void requiresCustomMutationHeaderAndRejectsUntrustedOrigins() throws Exception {
    mvc.perform(post(BASE+"/customer").session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(customer())).andExpect(status().isForbidden());
    mvc.perform(mutation(post(BASE+"/customer"),customer()).header("Origin","https://untrusted.example")).andExpect(status().isForbidden());
    assertEquals(0,jdbc.queryForObject("select count(*) from pengguna where email=?",Integer.class,email));
  }
  @Test void vendorWithCatalogItemsCannotBeDeleted() throws Exception {
    long user=create("vendor",vendor());
    long business=jdbc.queryForObject("select vendor_id from vendor where user_id=?",Long.class,user);
    long category=jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id",Long.class,"Accounts Fixture "+token);
    long item=jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) values (?,?,'Account Fixture',100,1) returning item_id",Long.class,business,category);
    mvc.perform(mutation(delete(BASE+"/vendor/"+user),"{}")).andExpect(status().isConflict());
    assertEquals(1,jdbc.queryForObject("select count(*) from item where item_id=?",Integer.class,item));
    assertEquals(1,jdbc.queryForObject("select count(*) from pengguna where user_id=?",Integer.class,user));
  }
}
