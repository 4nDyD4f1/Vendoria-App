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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real PostgreSQL tests; all customer, vendor, category, item and wishlist fixtures roll back. */
@SpringBootTest
@Transactional
class CustomerWishlistDatabaseTest {
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    @Autowired CustomerWishlistService service;
    JdbcTemplate jdbc; MockMvc mvc;
    long customer,other,vendorUser,admin,vendor,category,first,second;
    String token;
    @BeforeEach void setup() {
        jdbc=new JdbcTemplate(source);token=UUID.randomUUID().toString();
        mvc=MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").with(r->{r.setRemoteAddr(token);return r;})).build();
        customer=-Math.max(10L,(UUID.randomUUID().getMostSignificantBits() & Long.MAX_VALUE)-10);other=customer+1;vendorUser=customer+2;admin=customer+3;
        for(long id:new long[]{customer,other,vendorUser,admin}) jdbc.update("insert into pengguna(user_id,nama,email,password_hash,role) overriding system value values (?,'Wishlist fixture',?,'fixture',?)",id,"wishlist-"+id+"-"+token+"@example.test",id==vendorUser?"vendor":id==admin?"admin":"customer");
        vendor=jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,status_aktif) values (?,'Wishlist Vendor','Bogor',true) returning vendor_id",Long.class,vendorUser);
        category=jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id",Long.class,"Wishlist "+token);
        first=item("Identical names",125000.25);second=item("Identical names",250000.50);
    }
    long item(String name,double price) { return jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total,status,deskripsi_barang) values (?,?,?, ?,3,'aktif','Public description') returning item_id",Long.class,vendor,category,name,price); }
    MockHttpSession session(long id) { var session=new MockHttpSession();session.setAttribute(AuthController.SESSION_USER_ID,id);return session; }
    MockHttpServletRequestBuilder mutation(String method,long user,long item) { return (method.equals("PUT")?put("/api/customer/wishlist/"+item):delete("/api/customer/wishlist/"+item)).session(session(user)).header("X-Wishlist-Request","1").header("X-Wishlist-Owner",String.valueOf(user)); }
    ResultActions save(long user,long item) throws Exception { return mvc.perform(mutation("PUT",user,item)); }
    ResultActions list(long user) throws Exception { return mvc.perform(get("/api/customer/wishlist").session(session(user))); }

    @Test void authenticationAndActiveCustomerRoleAreRequiredForEveryOperation() throws Exception {
        mvc.perform(get("/api/customer/wishlist")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/customer/wishlist/"+first).header("X-Wishlist-Request","1")).andExpect(status().isUnauthorized());
        for(long user:new long[]{vendorUser,admin}) {
            list(user).andExpect(status().isForbidden());save(user,first).andExpect(status().isForbidden());
            mvc.perform(mutation("DELETE",user,first)).andExpect(status().isForbidden());
        }
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",customer);
        list(customer).andExpect(status().isForbidden());save(customer,first).andExpect(status().isForbidden());
        list(Long.MAX_VALUE).andExpect(status().isUnauthorized());
    }
    @Test void listsEmptyWithoutCreatingRecordsAndBindsOwnerFromSession() throws Exception {
        mvc.perform(get("/api/customer/wishlist").param("user_id",String.valueOf(other)).session(session(customer)))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.userId").value(String.valueOf(customer))).andExpect(jsonPath("$.items").isEmpty()).andExpect(jsonPath("$.limit").value(200));
        assertEquals(0,jdbc.queryForObject("select count(*) from wishlist where user_id=?",Integer.class,customer));
    }
    @Test void persistentSaveIsIdempotentAndUsesIdsRatherThanItemNames() throws Exception {
        save(customer,first).andExpect(status().isNoContent());
        var initial=jdbc.queryForMap("select * from wishlist where user_id=? and item_id=?",customer,first);
        save(customer,first).andExpect(status().isNoContent());save(customer,second).andExpect(status().isNoContent());
        assertEquals(initial,jdbc.queryForMap("select * from wishlist where user_id=? and item_id=?",customer,first));
        list(customer).andExpect(jsonPath("$.items.length()").value(2)).andExpect(jsonPath("$.items[0].available").value(true))
            .andExpect(jsonPath("$.items[0].item.price").value(250000.50));
        list(other).andExpect(jsonPath("$.items").isEmpty());
        save(other,first).andExpect(status().isNoContent());
        mvc.perform(mutation("DELETE",customer,first)).andExpect(status().isNoContent());
        mvc.perform(mutation("DELETE",customer,first)).andExpect(status().isNoContent());
        assertEquals(1,service.list(other).items().size());assertEquals(1,service.list(customer).items().size());
    }
    @Test void catalogPriceNameAndStockAreRefreshedInsteadOfUsingClientSnapshots() throws Exception {
        mvc.perform(mutation("PUT",customer,first).contentType(MediaType.APPLICATION_JSON).content("{\"user_id\":"+other+",\"price\":1,\"name\":\"Spoofed\"}"))
            .andExpect(status().isNoContent());
        jdbc.update("update item set nama_barang='Updated publicly',harga_sewa_per_hari=999.75 where item_id=?",first);
        list(customer).andExpect(jsonPath("$.items[0].name").value("Updated publicly")).andExpect(jsonPath("$.items[0].item.price").value(999.75));
        assertEquals("Identical names",jdbc.queryForObject("select nama_saat_disimpan from wishlist where user_id=? and item_id=?",String.class,customer,first));
        assertTrue(service.list(other).items().isEmpty());
    }
    @Test void unavailableItemsKeepPreviouslyPublicNameButDoNotExposePrivateUpdates() throws Exception {
        save(customer,first).andExpect(status().isNoContent());
        jdbc.update("update item set status='arsip',nama_barang='Private renamed draft',deskripsi_barang='Private secret' where item_id=?",first);
        list(customer).andExpect(jsonPath("$.items[0].available").value(false)).andExpect(jsonPath("$.items[0].name").value("Identical names"))
            .andExpect(jsonPath("$.items[0].item").isEmpty());
        save(customer,first).andExpect(status().isNoContent()); // Retrying an already saved record is harmless.
        save(other,first).andExpect(status().isNotFound());
        mvc.perform(mutation("DELETE",customer,first)).andExpect(status().isNoContent());
        assertTrue(service.list(customer).items().isEmpty());
    }
    @Test void suspendedVendorsInactiveOwnersAndOutOfStockRecordsCannotBeNewlySaved() throws Exception {
        jdbc.update("update item set stok_total=0 where item_id=?",first);save(customer,first).andExpect(status().isNotFound());
        jdbc.update("update item set stok_total=1 where item_id=?",first);
        jdbc.update("update vendor set status_aktif=false where vendor_id=?",vendor);save(customer,first).andExpect(status().isNotFound());
        jdbc.update("update vendor set status_aktif=true where vendor_id=?",vendor);
        jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",vendorUser);save(customer,first).andExpect(status().isNotFound());
    }
    @Test void missingInvalidAndCrossAccountMutationRequestsCannotWrite() throws Exception {
        save(customer,Long.MAX_VALUE).andExpect(status().isNotFound());save(customer,0).andExpect(status().isBadRequest());
        mvc.perform(put("/api/customer/wishlist/invalid").session(session(customer))).andExpect(status().isBadRequest());
        mvc.perform(put("/api/customer/wishlist/"+first).session(session(customer))).andExpect(status().isForbidden());
        mvc.perform(put("/api/customer/wishlist/"+first).session(session(other)).header("X-Wishlist-Request","1").header("X-Wishlist-Owner",String.valueOf(customer)))
            .andExpect(status().isConflict());
        mvc.perform(mutation("PUT",customer,first).header("Origin","https://untrusted.example")).andExpect(status().isForbidden());
        assertTrue(service.list(customer).items().isEmpty());assertTrue(service.list(other).items().isEmpty());
    }
    @Test void perAccountLimitAllowsIdempotentRetriesAndRemovalBeforeAddingAnotherItem() throws Exception {
        var ids=jdbc.queryForList("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total) select ?,?,'Cap fixture '||n,10,1 from generate_series(1,201) n returning item_id",Long.class,vendor,category);
        for(long id:ids.subList(0,200)) jdbc.update("insert into wishlist(user_id,item_id,nama_saat_disimpan) values (?,?,'Cap fixture')",customer,id);
        save(customer,ids.getFirst()).andExpect(status().isNoContent());save(customer,ids.getLast()).andExpect(status().isConflict());
        assertEquals(200,service.list(customer).items().size());
        mvc.perform(mutation("DELETE",customer,ids.getFirst())).andExpect(status().isNoContent());
        save(customer,ids.getLast()).andExpect(status().isNoContent());save(other,ids.getLast()).andExpect(status().isNoContent());
        assertEquals(200,service.list(customer).items().size());
    }
    @Test void deletingItemsOrAccountsCleansOnlyTheirOwnForeignKeyRecords() throws Exception {
        save(customer,first).andExpect(status().isNoContent());save(other,first).andExpect(status().isNoContent());save(other,second).andExpect(status().isNoContent());
        jdbc.update("delete from pengguna where user_id=?",customer);
        assertEquals(0,jdbc.queryForObject("select count(*) from wishlist where user_id=?",Integer.class,customer));
        assertEquals(2,service.list(other).items().size());
        jdbc.update("delete from item where item_id=?",first);assertEquals(1,service.list(other).items().size());
    }
}
