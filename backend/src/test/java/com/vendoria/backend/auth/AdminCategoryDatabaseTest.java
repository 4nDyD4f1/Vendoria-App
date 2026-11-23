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

/** Real PostgreSQL API tests for /api/admin/categories; every fixture row rolls back. */
@SpringBootTest
@Transactional
class AdminCategoryDatabaseTest {
  @Autowired DataSource source;
  @Autowired WebApplicationContext context;
  private JdbcTemplate jdbc;
  private MockMvc mvc;
  private long admin,customer;
  private String token;
  private static final String BASE="/api/admin/categories";
  @BeforeEach void setup() {
    jdbc=new JdbcTemplate(source); token=UUID.randomUUID().toString().substring(0,8);
    mvc=MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r->{r.setRemoteAddr(token);return r;})).build();
    admin=-Math.max(10L,(UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE)-10); customer=admin+1;
    for(long id:new long[]{admin,customer}) jdbc.update("""
        insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Category Fixture',?,'test-hash',?)
        """,id,"cat-"+(id-admin)+"-"+token+"@example.test",id==admin?"admin":"customer");
  }
  private MockHttpSession session(long id) { var s=new MockHttpSession(); s.setAttribute(AuthController.SESSION_USER_ID,id); return s; }
  private MockHttpServletRequestBuilder mutation(MockHttpServletRequestBuilder request,String body) { return request.header("X-Admin-Categories","1").session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(body); }
  private String name(String value) { return "{\"name\":\""+value+"\"}"; }
  private long create(String value) throws Exception {
    mvc.perform(mutation(post(BASE),name(value))).andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"));
    return jdbc.queryForObject("select kategori_id from kategori where nama_kategori=?",Long.class,value);
  }
  @Test void onlyActiveAdministratorsCanReadOrWrite() throws Exception {
    mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
    mvc.perform(get(BASE).session(session(customer))).andExpect(status().isForbidden());
    mvc.perform(mutation(post(BASE),name("Tidak Boleh "+token)).session(session(customer))).andExpect(status().isForbidden());
    mvc.perform(post(BASE).session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(name("Tanpa Header "+token))).andExpect(status().isForbidden());
    assertEquals(0,jdbc.queryForObject("select count(*) from kategori where nama_kategori like '%'||?",Integer.class,token));
    jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",admin);
    mvc.perform(get(BASE).session(session(admin))).andExpect(status().isForbidden());
  }
  @Test void createRenameListAndDeleteRoundTrip() throws Exception {
    long id=create("Kategori Uji "+token);
    mvc.perform(get(BASE).session(session(admin))).andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.name=='Kategori Uji "+token+"')].count").value(0));
    mvc.perform(mutation(put(BASE+"/"+id),name("  Kategori Baru "+token+"  "))).andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Kategori Baru "+token)).andExpect(jsonPath("$.id").value(String.valueOf(id)));
    assertEquals("Kategori Baru "+token,jdbc.queryForObject("select nama_kategori from kategori where kategori_id=?",String.class,id));
    mvc.perform(mutation(post(BASE+"/delete"),"{\"ids\":["+id+"]}")).andExpect(status().isNoContent());
    assertEquals(0,jdbc.queryForObject("select count(*) from kategori where kategori_id=?",Integer.class,id));
  }
  @Test void validatesNameAndRejectsCaseInsensitiveDuplicatesAndMissingRows() throws Exception {
    long id=create("Unik "+token);
    mvc.perform(mutation(post(BASE),name("   "))).andExpect(status().isBadRequest());
    mvc.perform(mutation(post(BASE),name("x".repeat(101)))).andExpect(status().isBadRequest());
    mvc.perform(mutation(post(BASE),name("UNIK "+token))).andExpect(status().isConflict());
    mvc.perform(mutation(put(BASE+"/"+id),name("Unik "+token))).andExpect(status().isOk()); // nama sendiri bukan duplikat
    mvc.perform(mutation(put(BASE+"/"+(id+1_000_000)),name("Lain "+token))).andExpect(status().isNotFound());
    mvc.perform(mutation(post(BASE+"/delete"),"{\"ids\":["+(id+1_000_000)+"]}")).andExpect(status().isNotFound());
    mvc.perform(mutation(post(BASE+"/delete"),"{\"ids\":[]}")).andExpect(status().isBadRequest());
  }
  @Test void categoryInUseCannotBeDeletedAndCountsItems() throws Exception {
    long id=create("Terpakai "+token);
    long unused=create("Kosong "+token);
    long vendor=jdbc.queryForObject("insert into vendor(user_id,nama_vendor) values (?,'Bisnis Fixture') returning vendor_id",Long.class,admin);
    jdbc.update("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) values (?,?,'Alat Fixture',100,1)",vendor,id);
    mvc.perform(get(BASE).session(session(admin))).andExpect(jsonPath("$[?(@.name=='Terpakai "+token+"')].count").value(1));
    mvc.perform(mutation(post(BASE+"/delete"),"{\"ids\":["+unused+","+id+"]}")).andExpect(status().isConflict());
    assertEquals(2,jdbc.queryForObject("select count(*) from kategori where kategori_id in (?,?)",Integer.class,id,unused)); // semua-atau-tidak-sama-sekali
  }
}
