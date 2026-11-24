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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Read-only account directory against PostgreSQL; all fixtures roll back. */
@SpringBootTest @Transactional
class AdminAccountDatabaseTest {
  @Autowired DataSource source;
  @Autowired WebApplicationContext context;
  @Autowired jakarta.persistence.EntityManager entities;
  JdbcTemplate jdbc; MockMvc mvc;
  long admin, customer, vendor;
  static final String BASE="/api/admin/accounts";
  @BeforeEach void setup() {
    jdbc=new JdbcTemplate(source); mvc=MockMvcBuilders.webAppContextSetup(context).build();
    admin=-Math.max(10L,(UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE)-10);
    customer=admin+1; vendor=admin+2;
    for(long id:new long[]{admin,customer,vendor}) jdbc.update("""
      insert into pengguna(user_id,nama,email,password_hash,role) overriding system value
      values (?,'Directory Fixture',?,'private-fixture-hash',?)
      """,id,"readonly-"+(id-admin)+"-"+UUID.randomUUID()+"@example.test",id==admin?"admin":id==customer?"customer":"vendor");
    jdbc.update("insert into vendor(user_id,nama_vendor,kota) values (?,'Directory Business','Bogor')",vendor);
  }
  MockHttpSession session(long id) { var s=new MockHttpSession();s.setAttribute(AuthController.SESSION_USER_ID,id);return s; }
  void unavailable(MockHttpServletRequestBuilder request) throws Exception {
    int status=mvc.perform(request.session(session(admin)).header("X-Admin-Accounts","1")
      .contentType(MediaType.APPLICATION_JSON).content("{}")).andReturn().getResponse().getStatus();
    assertTrue(Set.of(404,405).contains(status),"Mutation remains mapped: "+status);
  }
  @Test void directoryRequiresAnActiveAdministrator() throws Exception {
    for(String path:List.of(BASE,"/api/admin/administrators")) {
      mvc.perform(get(path)).andExpect(status().isUnauthorized());
      for(long actor:new long[]{customer,vendor}) mvc.perform(get(path).session(session(actor))).andExpect(status().isForbidden());
      mvc.perform(get(path).session(session(admin))).andExpect(status().isOk());
    }
    jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",admin);
    entities.clear();
    mvc.perform(get(BASE).session(session(admin))).andExpect(status().isForbidden());
    mvc.perform(get("/api/admin/administrators").session(session(admin))).andExpect(status().isForbidden());
  }
  @Test void detailsRemainReadableWithoutSecrets() throws Exception {
    mvc.perform(get(BASE).session(session(admin))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
    for(var target:List.of(new Object[]{"customer",customer},new Object[]{"vendor",vendor}))
      mvc.perform(get(BASE+"/"+target[0]+"/"+target[1]).session(session(admin))).andExpect(status().isOk())
        .andExpect(jsonPath("$.email").exists()).andExpect(jsonPath("$.password").doesNotExist())
        .andExpect(jsonPath("$.password_hash").doesNotExist()).andExpect(jsonPath("$.google_sub").doesNotExist());
    mvc.perform(get(BASE+"/customer/"+vendor).session(session(admin))).andExpect(status().isNotFound());
    mvc.perform(get(BASE+"/vendor/"+admin).session(session(admin))).andExpect(status().isNotFound());
  }
  @Test void customerAndVendorWritesAreUnavailableAndDataIsUnchanged() throws Exception {
    var before=jdbc.queryForMap("select * from pengguna where user_id=?",vendor);
    var business=jdbc.queryForMap("select * from vendor where user_id=?",vendor);
    int count=jdbc.queryForObject("select count(*) from pengguna",Integer.class);
    for(var target:List.of(new Object[]{"customer",customer},new Object[]{"vendor",vendor})) {
      String path=BASE+"/"+target[0];
      unavailable(post(path));unavailable(put(path+"/"+target[1]));
      unavailable(delete(path+"/"+target[1]));unavailable(post(path+"/delete"));
    }
    assertEquals(count,jdbc.queryForObject("select count(*) from pengguna",Integer.class));
    assertEquals(before,jdbc.queryForMap("select * from pengguna where user_id=?",vendor));
    assertEquals(business,jdbc.queryForMap("select * from vendor where user_id=?",vendor));
    assertEquals(1,jdbc.queryForObject("select count(*) from pengguna where user_id=?",Integer.class,customer));
  }
  private String adminBody(String email, String status, String password) {
    return """
      {"nama":"Managed Admin Fixture","email":"%s","status":"%s","catatan":"Fixture CRUD","password":%s}
      """.formatted(email,status,password==null?"null":"\""+password+"\"");
  }
  @Test void administratorCanBeCreatedEditedAndDeletedWithoutChangingOtherRoles() throws Exception {
    String email="admin-crud-"+UUID.randomUUID()+"@example.test";
    String password="FixtureAdmin9!";
    String path="/api/admin/administrators";
    mvc.perform(post(path).session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(adminBody(email,"Aktif",password)))
      .andExpect(status().isCreated()).andExpect(jsonPath("$.nama").value("Managed Admin Fixture"))
      .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.password_hash").doesNotExist());
    long id=jdbc.queryForObject("select user_id from pengguna where email=?",Long.class,email);
    String hash=jdbc.queryForObject("select password_hash from pengguna where user_id=?",String.class,id);
    assertTrue(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().matches(password,hash));
    assertEquals("admin",jdbc.queryForObject("select role from pengguna where user_id=?",String.class,id));
    mvc.perform(put(path+"/"+id).session(session(admin)).contentType(MediaType.APPLICATION_JSON)
      .content(adminBody(email,"Nonaktif",null).replace("Managed Admin Fixture","Updated Admin Fixture")))
      .andExpect(status().isOk()).andExpect(jsonPath("$.nama").value("Updated Admin Fixture"))
      .andExpect(jsonPath("$.status").value("Nonaktif"));
    assertEquals(hash,jdbc.queryForObject("select password_hash from pengguna where user_id=?",String.class,id));
    mvc.perform(delete(path+"/"+id).session(session(admin))).andExpect(status().isNoContent());
    entities.flush();
    assertEquals(0,jdbc.queryForObject("select count(*) from pengguna where user_id=?",Integer.class,id));
    for(long actor:new long[]{customer,vendor}) assertEquals(1,jdbc.queryForObject("select count(*) from pengguna where user_id=?",Integer.class,actor));
  }
  @Test void onlyActiveAdministratorsCanMutateAdministrators() throws Exception {
    String path="/api/admin/administrators";
    String body=adminBody("blocked-"+UUID.randomUUID()+"@example.test","Aktif","FixtureAdmin9!");
    mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
    for(long actor:new long[]{customer,vendor}) {
      mvc.perform(post(path).session(session(actor)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
      mvc.perform(put(path+"/"+admin).session(session(actor)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
      mvc.perform(delete(path+"/"+admin).session(session(actor))).andExpect(status().isForbidden());
    }
    jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",admin);
    entities.clear();
    mvc.perform(post(path).session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
  }
  @Test void selfProtectionAndCustomerVendorIsolationRemainInPlace() throws Exception {
    String path="/api/admin/administrators";
    String email=jdbc.queryForObject("select email from pengguna where user_id=?",String.class,admin);
    mvc.perform(delete(path+"/"+admin).session(session(admin))).andExpect(status().isBadRequest());
    mvc.perform(put(path+"/"+admin).session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(adminBody(email,"Nonaktif",null)))
      .andExpect(status().isBadRequest());
    for(long target:new long[]{customer,vendor}) {
      mvc.perform(put(path+"/"+target).session(session(admin)).contentType(MediaType.APPLICATION_JSON).content(adminBody(email,"Aktif",null)))
        .andExpect(status().isNotFound());
      mvc.perform(delete(path+"/"+target).session(session(admin))).andExpect(status().isNotFound());
    }
    assertEquals("Aktif",jdbc.queryForObject("select status_akun from pengguna where user_id=?",String.class,admin));
  }
}
