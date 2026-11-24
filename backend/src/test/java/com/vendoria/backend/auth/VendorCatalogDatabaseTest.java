package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.context.transaction.AfterTransaction;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL and file storage; all fixture rows and newly uploaded files roll back. */
@SpringBootTest
@Transactional
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class VendorCatalogDatabaseTest {
  @Autowired InMemoryBlobStore blobs;
  @Autowired DataSource dataSource;
  @Autowired WebApplicationContext context;
  private JdbcTemplate jdbc;
  private MockMvc mvc;
  private long vendorUser,other,customer,admin;
  private String category,token;
  @BeforeEach void setup() {
    jdbc=new JdbcTemplate(dataSource); token=UUID.randomUUID().toString(); category="Catalog Fixture "+token;
    mvc=MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r->{r.setRemoteAddr(token);return r;})).build();
    vendorUser=-Math.max(10L,(UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE)-10); other=vendorUser+1; customer=vendorUser+2; admin=vendorUser+3;
    for(long id:new long[]{vendorUser,other,customer,admin}) jdbc.update("""
        insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Catalog Fixture',?,'test-hash',?)
        """,id,"catalog-test-"+id+"-"+token+"@example.test",id==customer?"customer":id==admin?"admin":"vendor");
    jdbc.update("insert into kategori(nama_kategori) values (?)",category);
  }
  private MockHttpSession session(long id) { var session=new MockHttpSession(); session.setAttribute(AuthController.SESSION_USER_ID,id); return session; }
  private MockMultipartFile json(String value) { return new MockMultipartFile("data","data.json","application/json",value.getBytes(StandardCharsets.UTF_8)); }
  private String data() { return """
      {"name":"Alat Fixture","category":"%s","stock":4,"price":125000.25,"deposit":25000.50,"status":"aktif","description":"Deskripsi fixture","condition":"Baik"}
      """.formatted(category); }
  private long profile(long user) {
    jdbc.update("update pengguna set status_verifikasi='terverifikasi' where user_id=?",user);
    return jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,alamat,deskripsi,status_aktif) values (?,'Bisnis Fixture','Bogor','Alamat uji','Penyewaan alat',true) returning vendor_id",Long.class,user);
  }
  private long create(long user) throws Exception {
    mvc.perform(multipart("/api/vendor/catalog").header("X-Catalog-Request","1").file(json(data())).file(KycDocumentStoreTest.image("photo")).session(session(user)))
        .andExpect(result -> assertEquals(201,result.getResponse().getStatus(),result.getResponse().getContentAsString()+" "+result.getResolvedException()))
        .andExpect(jsonPath("$.name").value("Alat Fixture"));
    return jdbc.queryForObject("select item_id from item where vendor_id=(select vendor_id from vendor where user_id=?) order by item_id desc limit 1",Long.class,user);
  }
  private int count(long user) { return jdbc.queryForObject("select count(*) from item where vendor_id=(select vendor_id from vendor where user_id=?)",Integer.class,user); }
  @Test void requiresActiveVendorRoleAndNeverCreatesProfileOnRead() throws Exception {
    mvc.perform(get("/api/vendor/catalog")).andExpect(status().isUnauthorized());
    for(long id:new long[]{customer,admin}) mvc.perform(get("/api/vendor/catalog").session(session(id))).andExpect(status().isForbidden());
    mvc.perform(get("/api/vendor/catalog").session(session(vendorUser))).andExpect(status().isForbidden());
    assertEquals(0,jdbc.queryForObject("select count(*) from vendor where user_id=?",Integer.class,vendorUser));
    jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",vendorUser);
    mvc.perform(get("/api/vendor/catalog").session(session(vendorUser))).andExpect(status().isForbidden());
  }
  @Test void legacySetupCannotBypassReadinessOrReplaceCompleteProfile() throws Exception {
    mvc.perform(post("/api/vendor/catalog/setup").header("X-Catalog-Request","1").session(session(vendorUser)).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Usaha Baru\"}"))
        .andExpect(status().isForbidden());
    assertEquals(0,jdbc.queryForObject("select count(*) from vendor where user_id=?",Integer.class,vendorUser));
    profile(vendorUser);
    for(String name:new String[]{"Usaha Baru","Nama Pengganti"}) mvc.perform(post("/api/vendor/catalog/setup").header("X-Catalog-Request","1").session(session(vendorUser)).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\""+name+"\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.vendor.name").value("Bisnis Fixture")).andExpect(jsonPath("$.vendor.active").value(true));
    assertEquals(1,jdbc.queryForObject("select count(*) from vendor where user_id=?",Integer.class,vendorUser));
  }
  @Test void createPersistsAllFieldsPhotoAndSessionOwnership() throws Exception {
    long owner=profile(vendorUser); profile(other); long id=create(vendorUser);
    var row=jdbc.queryForMap("select * from item where item_id=?",id);
    assertEquals(owner,((Number)row.get("vendor_id")).longValue()); assertEquals("125000.25",row.get("harga_sewa_per_hari").toString());
    assertEquals("25000.50",row.get("minimal_dp").toString()); assertEquals("Baik",row.get("kondisi_barang"));
    mvc.perform(get("/api/vendor/catalog").session(session(vendorUser))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
        .andExpect(jsonPath("$.items[0].id").value(String.valueOf(id))).andExpect(jsonPath("$.items[0].category").value(category));
    mvc.perform(get("/api/vendor/catalog/"+id+"/photo").session(session(vendorUser))).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG)).andExpect(header().string("X-Content-Type-Options","nosniff"));
    mvc.perform(get("/api/vendor/catalog").session(session(other))).andExpect(jsonPath("$.items").isEmpty());
  }
  @Test void anotherVendorCannotReadChangeDeleteOrFetchPhoto() throws Exception {
    profile(vendorUser); profile(other); long id=create(vendorUser);
    mvc.perform(get("/api/vendor/catalog/"+id).session(session(other))).andExpect(status().isNotFound());
    mvc.perform(get("/api/vendor/catalog/"+id+"/photo").session(session(other))).andExpect(status().isNotFound());
    mvc.perform(multipart("/api/vendor/catalog/"+id).with(r->{r.setMethod("PUT");return r;}).header("X-Catalog-Request","1").file(json(data())).session(session(other))).andExpect(status().isNotFound());
    mvc.perform(delete("/api/vendor/catalog/"+id).header("X-Catalog-Request","1").session(session(other))).andExpect(status().isNotFound());
    assertEquals(1,count(vendorUser));
  }
  @Test void updatePreservesReplacesAndRemovesPhotoAndUsesDatabaseStatuses() throws Exception {
    profile(vendorUser); long id=create(vendorUser);
    String first=jdbc.queryForObject("select tautan_foto from foto_item where item_id=?",String.class,id);
    mvc.perform(multipart("/api/vendor/catalog/"+id).with(r->{r.setMethod("PUT");return r;}).header("X-Catalog-Request","1").file(json(data().replace("aktif","nonaktif"))).session(session(vendorUser)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("nonaktif"));
    assertEquals(first,jdbc.queryForObject("select tautan_foto from foto_item where item_id=?",String.class,id));
    mvc.perform(multipart("/api/vendor/catalog/"+id).with(r->{r.setMethod("PUT");return r;}).header("X-Catalog-Request","1").file(json(data())).file(KycDocumentStoreTest.image("photo")).session(session(vendorUser))).andExpect(status().isOk());
    assertNotEquals(first,jdbc.queryForObject("select tautan_foto from foto_item where item_id=?",String.class,id));
    mvc.perform(multipart("/api/vendor/catalog/"+id).with(r->{r.setMethod("PUT");return r;}).header("X-Catalog-Request","1").file(json(data().replace("\"aktif\"","\"arsip\"").replace("\"condition\":\"Baik\"","\"condition\":\"Baik\",\"remove_image\":true"))).session(session(vendorUser)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("arsip")).andExpect(jsonPath("$.image").value(""));
    assertEquals(0,jdbc.queryForObject("select count(*) from foto_item where item_id=?",Integer.class,id));
    // Verify the deferred cleanup against the database's current references.
    for(var synchronization:TransactionSynchronizationManager.getSynchronizations()) synchronization.afterCommit();
    assertTrue(blobs.blobs.isEmpty());
  }
  @Test void invalidFieldsUnknownCategoriesDisguisedPhotosAndMissingHeaderCannotWrite() throws Exception {
    profile(vendorUser);
    for(String invalid:new String[]{data().replace("\"stock\":4","\"stock\":-1"),data().replace("125000.25","-1"),data().replace("25000.50","9999999999999"),data().replace("aktif","perawatan"),data().replace(category,"Unknown"),data().replace("Alat Fixture"," ")})
      mvc.perform(multipart("/api/vendor/catalog").header("X-Catalog-Request","1").file(json(invalid)).session(session(vendorUser))).andExpect(status().isBadRequest());
    mvc.perform(multipart("/api/vendor/catalog").header("X-Catalog-Request","1").file(json(data())).file(new MockMultipartFile("photo","fake.png","image/png","<html>bad</html>".getBytes(StandardCharsets.UTF_8))).session(session(vendorUser))).andExpect(status().isBadRequest());
    mvc.perform(multipart("/api/vendor/catalog").file(json(data())).session(session(vendorUser))).andExpect(status().isForbidden());
    mvc.perform(multipart("/api/vendor/catalog").header("X-Catalog-Request","1").file(json("{")).session(session(vendorUser))).andExpect(status().isBadRequest());
    mvc.perform(post("/api/vendor/catalog/setup").header("X-Catalog-Request","1").header("Origin","https://untrusted.example").session(session(vendorUser)).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Injected\"}")).andExpect(status().isForbidden());
    assertEquals(0,count(vendorUser));
  }
  @Test void deletingMixedOwnershipIsAtomicAndValidDeleteCascadesPhotos() throws Exception {
    profile(vendorUser); profile(other); long own=create(vendorUser),foreign=create(other);
    mvc.perform(post("/api/vendor/catalog/delete").header("X-Catalog-Request","1").session(session(vendorUser)).contentType(MediaType.APPLICATION_JSON).content("{\"ids\":["+own+","+foreign+"]}"))
        .andExpect(status().isNotFound());
    assertEquals(1,count(vendorUser)); assertEquals(1,count(other));
    mvc.perform(delete("/api/vendor/catalog/"+own).header("X-Catalog-Request","1").session(session(vendorUser))).andExpect(status().isNoContent());
    assertEquals(0,count(vendorUser)); assertEquals(0,jdbc.queryForObject("select count(*) from foto_item where item_id=?",Integer.class,own));
  }
  @Test void orderedItemsCannotBeDeletedButCanBeArchived() throws Exception {
    long vendor=profile(vendorUser); long id=create(vendorUser);
    long order=jdbc.queryForObject("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa) values (?,?,?,current_date,current_date+1) returning order_id",Long.class,customer,vendor,token);
    jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,1,100,100)",order,id);
    mvc.perform(delete("/api/vendor/catalog/"+id).header("X-Catalog-Request","1").session(session(vendorUser))).andExpect(status().isConflict());
    assertEquals(1,count(vendorUser));
    mvc.perform(multipart("/api/vendor/catalog/"+id).with(r->{r.setMethod("PUT");return r;}).header("X-Catalog-Request","1").file(json(data().replace("aktif","arsip"))).session(session(vendorUser)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("arsip"));
  }
  @AfterTransaction void rollbackRemovesUploadedFiles() throws Exception { assertTrue(blobs.blobs.isEmpty()); }
}
