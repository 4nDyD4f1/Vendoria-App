package com.vendoria.backend.auth;

import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorSearchDtos.*;

@Service
class VendorSearchService {
    private static final Set<String> KINDS = Set.of("all", "catalog", "orders", "handovers", "claims", "payouts");
    // Every source is scoped before it enters the union. No client-supplied vendor identity.
    private static final String SEARCH = """
        with own as (select vendor_id from vendor where user_id=?), orders as (
          select p.*,c.nama as customer,
            coalesce((select string_agg(i.nama_barang,' ') from detail_item d
              join item i on i.item_id=d.item_id and i.vendor_id=p.vendor_id where d.order_id=p.order_id),'') as equipment
          from pemesanan p join own v on v.vendor_id=p.vendor_id join pengguna c on c.user_id=p.user_id
        ), records as (
          select i.item_id as id,'catalog' as kind,'Katalog' as label,i.nama_barang as title,
            concat('ALT-',i.item_id,' · ',k.nama_kategori) as subtitle,i.status,
            '/vendor/katalog/'||i.item_id as path,
            concat_ws(' ',i.nama_barang,i.deskripsi_barang,k.nama_kategori,'ALT-'||i.item_id,i.status) as searchable,
            coalesce(i.updated_at,i.created_at) as occurred
          from item i join own v on v.vendor_id=i.vendor_id join kategori k on k.kategori_id=i.kategori_id
          union all
          select p.order_id,'orders','Pesanan',p.kode_pemesanan,p.customer,p.status_pesanan,
            '/vendor/pesanan/'||p.order_id,
            concat_ws(' ',p.kode_pemesanan,p.customer,p.equipment,p.lokasi_acara,p.status_pesanan),p.tanggal_pemesanan
          from orders p
          union all
          select p.order_id,'handovers','Serah terima',p.kode_pemesanan,p.customer,p.status_pesanan,
            '/vendor/serah-terima/'||p.order_id,
            concat_ws(' ',p.kode_pemesanan,p.customer,p.equipment,p.lokasi_acara,p.status_pesanan),p.tanggal_pemesanan
          from orders p where p.status_pesanan in ('dikonfirmasi','berjalan','dikembalikan','selesai')
          union all
          select k.klaim_id,'claims','Klaim','KLM-'||k.klaim_id,
            concat_ws(' · ',p.kode_pemesanan,p.customer,left(k.alasan,180)),k.status,
            '/vendor/klaim/KLM-'||k.klaim_id,
            concat_ws(' ','KLM-'||k.klaim_id,p.kode_pemesanan,p.customer,k.alasan,k.status),k.diajukan_pada
          from klaim k join orders p on p.order_id=k.order_id
          union all
          select d.pencairan_id,'payouts','Pencairan','PCR-'||d.pencairan_id,
            concat_ws(' · ',p.kode_pemesanan,d.bank,d.nama_pemilik),d.status,
            '/vendor/pencairan/PCR-'||d.pencairan_id,
            concat_ws(' ','PCR-'||d.pencairan_id,p.kode_pemesanan,p.customer,d.bank,d.nama_pemilik,d.status),d.diajukan_pada
          from pencairan_dana d join own v on v.vendor_id=d.vendor_id join orders p on p.order_id=d.order_id
        ), matches as (
          select * from records where (?='all' or kind=?) and searchable ilike ? escape '!'
        )
        """;
    private final JdbcTemplate jdbc;
    VendorSearchService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    Listing list(Long actorId, String query, String kind, int page, int size) {
        VendorAccess.verification(jdbc, actorId);
        if (query == null || query.length() > 120 || query.chars().anyMatch(Character::isISOControl))
            throw bad("Kata kunci maksimal 120 karakter dan tidak boleh memuat karakter kontrol");
        if (!KINDS.contains(kind) || page < 1 || page > 1_000_000 || size < 1 || size > 100)
            throw bad("Filter atau pembagian halaman tidak valid");
        var vendors = jdbc.query("select vendor_id,nama_vendor from vendor where user_id=?",
            (rs,n) -> new Vendor(rs.getString(1), rs.getString(2)), actorId);
        if (vendors.isEmpty()) return new Listing(null, List.of(), 0, 1, size);
        String pattern = "%" + query.trim().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        long total = jdbc.queryForObject(SEARCH + "select count(*) from matches", Long.class, actorId, kind, kind, pattern);
        int actualPage = (int)Math.min(page, Math.max(1, (total + size - 1) / size));
        var items = jdbc.query(SEARCH + "select * from matches order by occurred desc nulls last,kind,id desc limit ? offset ?",
            (rs,n) -> new Item(rs.getString("id"), rs.getString("kind"), rs.getString("label"),
                rs.getString("title"), rs.getString("subtitle"), rs.getString("status"), rs.getString("path")),
            actorId, kind, kind, pattern, size, (long)(actualPage - 1) * size);
        return new Listing(vendors.getFirst(), items, total, actualPage, size);
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
