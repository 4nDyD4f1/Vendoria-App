package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.nio.file.Path;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Real db_vendoria queries with fixture rows rolled back after every test. */
@SpringBootTest
@Transactional
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class PublicCatalogDatabaseTest {
    @TempDir static Path storage;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) { registry.add("app.catalog.storage-root",()->storage.toString()); }
    @Autowired DataSource source;
    @Autowired WebApplicationContext context;
    @Autowired PublicCatalogService service;
    @Autowired CatalogPhotoStore photos;
    JdbcTemplate jdbc;
    MockMvc mvc;
    String token,cityA,cityB;
    long categoryA,categoryB,vendorA,vendorB,ownerA,first,second,third;
    @BeforeEach void setup() {
        jdbc=new JdbcTemplate(source); mvc=MockMvcBuilders.webAppContextSetup(context).build();
        token="PublicCatalog-"+UUID.randomUUID(); cityA="Kota A "+token; cityB="Kota B "+token;
        categoryA=jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id",Long.class,"Sound "+token);
        categoryB=jdbc.queryForObject("insert into kategori(nama_kategori) values (?) returning kategori_id",Long.class,"Tenda "+token);
        ownerA=owner("terverifikasi");
        vendorA=vendor(ownerA,cityA,true,4.9,0,0);
        vendorB=vendor(owner("belum_diverifikasi"),cityB,true,4.5,0,0.2);
        first=item(vendorA,categoryA,"Audio 100% "+token,200,"aktif",3);
        second=item(vendorB,categoryB,"Tenda "+token,100,"aktif",2);
        third=item(vendorA,categoryA,"Mixer "+token,300,"aktif",1);
    }
    long owner(String verified) {
        return jdbc.queryForObject("insert into pengguna(nama,email,password_hash,role,status_verifikasi) values ('Public catalog fixture',?,'fixture','vendor',?) returning user_id",Long.class,UUID.randomUUID()+"@example.test",verified);
    }
    long vendor(long user,String city,boolean active,double rating,double lat,double lon) {
        return jdbc.queryForObject("insert into vendor(user_id,nama_vendor,kota,status_aktif,rating,latitude,longitude) values (?,?,?,?,?,?,?) returning vendor_id",Long.class,user,"Bisnis "+token,city,active,rating,lat,lon);
    }
    long item(long vendor,long category,String name,int price,String status,int stock) {
        return jdbc.queryForObject("insert into item(vendor_id,kategori_id,nama_barang,harga_sewa_per_hari,stok_total,status,deskripsi_barang,kondisi_barang,minimal_dp) values (?,?,?,?,?,?,?,'Baik',25) returning item_id",Long.class,vendor,category,name,price,stock,status,"Deskripsi "+token);
    }
    @Test void reviewsArePublicPerVendorWithMaskedNames() throws Exception {
        long customer=jdbc.queryForObject("insert into pengguna(nama,email,password_hash,role) values ('Budi  Santoso',?,'fixture','customer') returning user_id",Long.class,UUID.randomUUID()+"@example.test");
        long order=jdbc.queryForObject("insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,total_biaya_sewa,total_dp,status_pesanan) values (?,?,?,current_date,current_date+1,200,0,'selesai') returning order_id",
            Long.class,customer,vendorA,"VND-RV-"+UUID.randomUUID().toString().substring(0,8));
        jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,1,200,200)",order,first);
        jdbc.update("insert into ulasan(order_id,user_id,vendor_id,rating,komentar) values (?,?,?,4,'Suara jernih')",order,customer,vendorA);
        mvc.perform(get("/api/catalog/"+third+"/reviews")).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].author").value("Budi S."))
            .andExpect(jsonPath("$[0].rating").value(4)).andExpect(jsonPath("$[0].comment").value("Suara jernih"))
            .andExpect(jsonPath("$[0].items").value("Audio 100% "+token));
        mvc.perform(get("/api/catalog/"+second+"/reviews")).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/catalog/0/reviews")).andExpect(status().isNotFound());
    }
    @Test void anonymousListingAndDetailsReadRealFieldsWithoutPrivateOwnerData() throws Exception {
        mvc.perform(get("/api/catalog").param("q",token)).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.items.length()").value(3))
            .andExpect(jsonPath("$.items[0].email").doesNotExist()).andExpect(jsonPath("$.items[0].password_hash").doesNotExist());
        mvc.perform(get("/api/catalog/"+first)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Audio 100% "+token))
            .andExpect(jsonPath("$.city").value(cityA)).andExpect(jsonPath("$.verified").value(true))
            .andExpect(jsonPath("$.stock").value(3)).andExpect(jsonPath("$.deposit").value(25))
            .andExpect(jsonPath("$.image").value("")).andExpect(jsonPath("$.reviewCount").value(0));
    }
    @Test void citiesComeFromDatabaseAndDeduplicateCaseWhitespaceExcludingInactiveVendors() throws Exception {
        vendor(owner("terverifikasi"),"  "+cityA.toUpperCase(Locale.ROOT).replace(" ","   ")+"  ",true,4,0,0);
        vendor(owner("terverifikasi"),"   ",true,4,0,0);
        vendor(owner("terverifikasi"),"Hidden "+token,false,4,0,0);
        long inactive=owner("terverifikasi"); jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",inactive);
        vendor(inactive,"Disabled "+token,true,4,0,0);
        var cities=service.cities();
        assertEquals(1,cities.stream().filter(city->city.equalsIgnoreCase(cityA)).count());
        assertTrue(cities.contains(cityB)); assertTrue(cities.stream().noneMatch(String::isBlank));
        assertFalse(cities.contains("Hidden "+token)); assertFalse(cities.contains("Disabled "+token));
        mvc.perform(get("/api/catalog/cities")).andExpect(status().isOk());
    }
    @Test void filtersCombineAndTreatWildcardsAsLiteralText() throws Exception {
        mvc.perform(get("/api/catalog").param("q",token).param("city",cityA.toLowerCase(Locale.ROOT)).param("category",String.valueOf(categoryA)))
            .andExpect(jsonPath("$.total").value(2));
        mvc.perform(get("/api/catalog").param("q","100% "+token)).andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].id").value(String.valueOf(first)));
        mvc.perform(get("/api/catalog").param("q",token).param("city","No Such City")).andExpect(jsonPath("$.total").value(0));
    }
    @Test void sortingPaginationAndCountsAreDatabaseBacked() throws Exception {
        mvc.perform(get("/api/catalog").param("q",token).param("sort","price-low").param("size","1").param("page","2"))
            .andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.page").value(2)).andExpect(jsonPath("$.items[0].id").value(String.valueOf(first)));
        mvc.perform(get("/api/catalog").param("q",token).param("sort","price-high").param("size","1"))
            .andExpect(jsonPath("$.items[0].id").value(String.valueOf(third)));
        mvc.perform(get("/api/catalog").param("q",token).param("page","999"))
            .andExpect(jsonPath("$.page").value(1));
        var listing=service.list(token,"","","rating",1,12);
        assertEquals(2,listing.categories().stream().filter(c->c.id().equals(String.valueOf(categoryA))).findFirst().orElseThrow().count());
        assertEquals(vendorA,jdbc.queryForObject("select vendor_id from item where item_id=?",Long.class,Long.valueOf(listing.items().getFirst().id())));
    }
    @Test void privateInactiveArchivedAndOutOfStockItemsNeverAppearOrExposePhotos() throws Exception {
        var hidden=new ArrayList<Long>();
        hidden.add(item(vendorA,categoryA,"Hidden "+token,50,"nonaktif",1));
        hidden.add(item(vendorA,categoryA,"Hidden "+token,50,"arsip",1));
        hidden.add(item(vendorA,categoryA,"Hidden "+token,50,"aktif",0));
        long privateVendor=vendor(owner("terverifikasi"),cityA,false,5,0,0);
        hidden.add(item(privateVendor,categoryA,"Hidden "+token,50,"aktif",1));
        long disabledOwner=owner("terverifikasi"); jdbc.update("update pengguna set status_akun='Nonaktif' where user_id=?",disabledOwner);
        hidden.add(item(vendor(disabledOwner,cityA,true,5,0,0),categoryA,"Hidden "+token,50,"aktif",1));
        mvc.perform(get("/api/catalog").param("q",token)).andExpect(jsonPath("$.total").value(3));
        for(long id:hidden) {
            mvc.perform(get("/api/catalog/"+id)).andExpect(status().isNotFound());
            mvc.perform(get("/api/catalog/"+id+"/photo")).andExpect(status().isNotFound());
        }
    }
    @Test void publicPhotoRequiresVisibleItemAndManagedFile() throws Exception {
        mvc.perform(get("/api/catalog/"+first+"/photo")).andExpect(status().isNotFound());
        String locator=photos.save(KycDocumentStoreTest.image("photo"));
        try {
            jdbc.update("insert into foto_item(item_id,tautan_foto) values (?,?)",first,locator);
            mvc.perform(get("/api/catalog/"+first)).andExpect(jsonPath("$.image").value("/api/catalog/"+first+"/photo"));
            mvc.perform(get("/api/catalog/"+first+"/photo")).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG)).andExpect(header().string("X-Content-Type-Options","nosniff"));
            jdbc.update("update vendor set status_aktif=false where vendor_id=?",vendorA);
            mvc.perform(get("/api/catalog/"+first+"/photo")).andExpect(status().isNotFound());
        } finally { photos.remove(locator); }
    }
    @Test void nearbyCityUsesDatabaseCoordinatesWithDistanceLimitAndDoesNotPersistUserLocation() throws Exception {
        mvc.perform(post("/api/catalog/nearby-city").contentType(MediaType.APPLICATION_JSON).content("{\"latitude\":0,\"longitude\":0.001}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.city").value(cityA)).andExpect(jsonPath("$.distanceKm").value(0.1));
        mvc.perform(post("/api/catalog/nearby-city").contentType(MediaType.APPLICATION_JSON).content("{\"latitude\":80,\"longitude\":100}"))
            .andExpect(status().isNotFound());
        jdbc.update("update vendor set latitude=null,longitude=null where vendor_id in (?,?)",vendorA,vendorB);
        mvc.perform(post("/api/catalog/nearby-city").contentType(MediaType.APPLICATION_JSON).content("{\"latitude\":0,\"longitude\":0}"))
            .andExpect(status().isNotFound());
    }
    @Test void invalidFiltersCoordinatesAndMissingRecordsReturnClientErrors() throws Exception {
        for(String[] parameter:new String[][]{{"sort","price;drop"},{"size","0"},{"size","61"},{"page","0"},{"category","oops"},{"category","9999999999999999999"},{"q","x".repeat(121)},{"city","x".repeat(101)}})
            mvc.perform(get("/api/catalog").param(parameter[0],parameter[1])).andExpect(status().isBadRequest());
        for(String coordinates:new String[]{"{}","null","{\"latitude\":91,\"longitude\":0}","{\"latitude\":0,\"longitude\":181}"})
            mvc.perform(post("/api/catalog/nearby-city").contentType(MediaType.APPLICATION_JSON).content(coordinates)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/catalog/0")).andExpect(status().isNotFound());
    }
}
