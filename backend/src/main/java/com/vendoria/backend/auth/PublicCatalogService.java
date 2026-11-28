package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.PublicCatalogDtos.*;

@Service
class PublicCatalogService {
    private static final String CITY = "regexp_replace(btrim(v.kota),'\\s+',' ','g')";
    private static final String VENDORS = " from vendor v join pengguna u on u.user_id=v.user_id where v.status_aktif and u.status_akun='Aktif' and u.role='vendor'";
    private static final String SOURCE = """
        from item i join kategori k on k.kategori_id=i.kategori_id
        join vendor v on v.vendor_id=i.vendor_id join pengguna u on u.user_id=v.user_id
        where i.status='aktif' and i.stok_total>0 and v.status_aktif and u.status_akun='Aktif' and u.role='vendor'
        """;
    private static final String SELECT = """
        select i.*,k.nama_kategori,v.nama_vendor,v.kota,v.rating,u.status_verifikasi,
        (select count(*) from ulasan r where r.vendor_id=v.vendor_id) as review_count,
        (select f.tautan_foto from foto_item f where f.item_id=i.item_id order by f.urutan,f.foto_id limit 1) as photo
        """;
    private static final Map<String,String> SORTS = Map.of(
        "popular", "(select count(*) from detail_item d join pemesanan p on p.order_id=d.order_id where d.item_id=i.item_id and p.status_pesanan='selesai') desc,i.item_id desc",
        "price-low", "i.harga_sewa_per_hari,i.item_id",
        "price-high", "i.harga_sewa_per_hari desc,i.item_id",
        "rating", "v.rating desc nulls last,i.item_id");
    private final JdbcTemplate jdbc;
    private final CatalogPhotoStore photos;
    PublicCatalogService(JdbcTemplate jdbc, CatalogPhotoStore photos) { this.jdbc=jdbc; this.photos=photos; }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    Listing list(String query, String category, String city, String sort, int page, int size) {
        validateText(query,120); validateText(city,100); validateText(category,30);
        if (!SORTS.containsKey(sort) || page<1 || page>1_000_000 || size<1 || size>60
                || !category.isEmpty() && !category.matches("[0-9]{1,18}")) throw bad("Filter katalog tidak valid");
        var args = new ArrayList<Object>();
        String where = SOURCE;
        if (!query.isBlank()) {
            where += " and concat_ws(' ',i.nama_barang,i.deskripsi_barang,k.nama_kategori,v.nama_vendor) ilike ? escape '!'";
            args.add("%"+query.trim().replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        }
        if (!category.isEmpty()) { where += " and i.kategori_id=?"; args.add(Long.valueOf(category)); }
        if (!city.isBlank()) { where += " and lower("+CITY+")=lower(?)"; args.add(city.trim().replaceAll("\\s+"," ")); }
        long total=jdbc.queryForObject("select count(*) "+where,Long.class,args.toArray());
        int actual=(int)Math.min(page,Math.max(1,(total+size-1)/size));
        args.add(size); args.add((long)(actual-1)*size);
        var items=jdbc.query(SELECT+where+" order by "+SORTS.get(sort)+" limit ? offset ?",this::item,args.toArray());
        var categories=jdbc.query("select k0.kategori_id,k0.nama_kategori,(select count(*) "+SOURCE+" and i.kategori_id=k0.kategori_id) as count from kategori k0 order by k0.nama_kategori",
            (rs,n)->new Category(rs.getString(1),rs.getString(2),rs.getLong(3)));
        long available=jdbc.queryForObject("select count(*) "+SOURCE,Long.class);
        return new Listing(items,categories,cities(),total,available,actual,size);
    }
    @Transactional(readOnly=true)
    List<String> cities() {
        return jdbc.queryForList("select min("+CITY+") "+VENDORS+" and nullif(btrim(v.kota),'') is not null group by lower("+CITY+") order by lower("+CITY+")",String.class);
    }
    @Transactional(readOnly=true)
    Item get(long id) {
        var rows=jdbc.query(SELECT+SOURCE+" and i.item_id=?",this::item,id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Alat tidak tersedia");
        return rows.getFirst();
    }
    /** Ulasan untuk vendor alat ini, sama dengan jumlah dan rata-rata yang ditampilkan katalog. */
    @Transactional(readOnly=true)
    List<Review> reviews(long id) {
        get(id); // aturan visibilitas yang sama dengan detail alat
        // shortcut: 20 ulasan terbaru tanpa paging; tambah paging bila penyewa perlu membaca yang lebih lama.
        return jdbc.query("""
            select r.rating,r.komentar,r.tanggal_ulasan,u.nama,
              (select string_agg(x.nama_barang,', ' order by d.order_detail_id) from detail_item d join item x on x.item_id=d.item_id
                where d.order_id=r.order_id and x.status='aktif') as items
            from ulasan r join item i on i.vendor_id=r.vendor_id join pengguna u on u.user_id=r.user_id
            where i.item_id=? order by r.tanggal_ulasan desc,r.order_id desc limit 20
            """,(rs,n)->new Review(masked(rs.getString("nama")),rs.getInt("rating"),rs.getString("komentar"),
                rs.getTimestamp("tanggal_ulasan").toInstant(),rs.getString("items")),id);
    }
    /** Halaman publik: hanya nama depan dan inisial nama belakang. */
    static String masked(String name) {
        String[] parts=name==null?new String[0]:name.trim().split("\\s+");
        if (parts.length==0 || parts[0].isEmpty()) return "Penyewa";
        return parts.length==1?parts[0]:parts[0]+" "+parts[parts.length-1].substring(0,1).toUpperCase(java.util.Locale.ROOT)+".";
    }
    @Transactional(readOnly=true)
    List<Item> available(List<Long> ids) {
        if (ids.isEmpty()) return List.of();
        return jdbc.query(SELECT+SOURCE+" and i.item_id=any(?::bigint[])",this::item,(Object)ids.toArray(Long[]::new));
    }
    @Transactional(readOnly=true)
    byte[] photo(long id) {
        get(id); // Same visibility rules for JSON and photo; no private vendor storage leaks.
        var locators=jdbc.queryForList("select tautan_foto from foto_item where item_id=? order by urutan,foto_id limit 1",String.class,id);
        return photos.read(locators.isEmpty()?null:locators.getFirst());
    }
    @Transactional(readOnly=true)
    NearbyCity nearby(Coordinates input) {
        if (input==null || input.latitude()==null || input.longitude()==null || !Double.isFinite(input.latitude())
                || !Double.isFinite(input.longitude()) || Math.abs(input.latitude())>90 || Math.abs(input.longitude())>180)
            throw bad("Koordinat lokasi tidak valid");
        // Approximate the closest vendor city using existing coordinates, never infer city boundaries.
        var rows=jdbc.query("select "+CITY+" as city,6371*acos(least(1.0,greatest(-1.0,sin(radians(?))*sin(radians(v.latitude::float8))+cos(radians(?))*cos(radians(v.latitude::float8))*cos(radians(v.longitude::float8-?))))) as distance"
            +VENDORS+" and nullif(btrim(v.kota),'') is not null and v.latitude is not null and v.longitude is not null order by distance limit 1",
            (rs,n)->new NearbyCity(rs.getString("city"),rs.getDouble("distance")), input.latitude(),input.latitude(),input.longitude());
        if (rows.isEmpty() || rows.getFirst().distanceKm()>50) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Belum ada kota vendor dengan koordinat dalam jarak 50 km. Silakan pilih kota secara manual.");
        // Return the same canonical label as the manual city list.
        var nearest=rows.getFirst();
        String canonical=cities().stream().filter(c->c.equalsIgnoreCase(nearest.city())).findFirst().orElse(nearest.city());
        return new NearbyCity(canonical,Math.round(nearest.distanceKm()*10)/10.0);
    }
    private Item item(ResultSet rs,int n) throws SQLException {
        long id=rs.getLong("item_id"); String photo=rs.getString("photo");
        return new Item(String.valueOf(id),rs.getString("nama_barang"),rs.getString("deskripsi_barang"),rs.getString("kategori_id"),
            rs.getString("nama_kategori"),rs.getString("nama_vendor"),rs.getString("kota")==null?"":rs.getString("kota").trim().replaceAll("\\s+"," "),
            "terverifikasi".equals(rs.getString("status_verifikasi")),rs.getBigDecimal("rating"),rs.getLong("review_count"),
            rs.getBigDecimal("harga_sewa_per_hari"),rs.getBigDecimal("minimal_dp"),rs.getInt("stok_total"),rs.getString("kondisi_barang"),
            photos.available(photo)?"/api/catalog/"+id+"/photo":"");
    }
    private static void validateText(String value,int max) {
        if (value==null || value.length()>max || value.chars().anyMatch(Character::isISOControl)) throw bad("Filter katalog terlalu panjang atau tidak valid");
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
