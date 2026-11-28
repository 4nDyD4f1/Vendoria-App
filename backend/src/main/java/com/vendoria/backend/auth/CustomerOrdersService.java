package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerOrdersDtos.*;

/** /pesanan: pesanan milik customer yang login (hanya baca) + ulasan setelah pesanan selesai. */
@Service
class CustomerOrdersService {
    private static final List<String> STATUSES = List.of("menunggu_pembayaran", "menunggu_konfirmasi", "dikonfirmasi",
        "berjalan", "dikembalikan", "selesai", "dibatalkan");
    private static final Set<String> VENDOR_VISIBLE = Set.of("dikonfirmasi", "berjalan", "dikembalikan");
    private static final String SELECT = """
        select p.order_id,p.kode_pemesanan,p.tanggal_mulai_sewa,p.tanggal_selesai_sewa,p.lokasi_acara,p.total_biaya_sewa,p.total_dp,
          p.status_pesanan,p.tanggal_pemesanan,v.nama_vendor,v.kota,
          coalesce((select string_agg(i.nama_barang||' ×'||d.jumlah_sewa,', ' order by d.order_detail_id)
                    from detail_item d join item i on i.item_id=d.item_id where d.order_id=p.order_id),'') as equipment_summary,
          coalesce((select sum(d.jumlah_sewa) from detail_item d where d.order_id=p.order_id),0) as item_count,
          coalesce((select sum(b.jumlah) from pembayaran b where b.order_id=p.order_id and b.status='terverifikasi'),0) as paid,
          exists(select 1 from klaim k where k.order_id=p.order_id and k.status in ('diajukan','ditinjau')) as has_open_claim,
          exists(select 1 from ulasan r where r.order_id=p.order_id) as reviewed,
        """ + "  " + OrderMoney.AWAITING + " as awaiting_settlement\n" + """
        from pemesanan p join vendor v on v.vendor_id=p.vendor_id
        """;
    private final JdbcTemplate jdbc;
    private final HandoverEvidencePolicy evidence;
    private final CatalogPhotoStore photos;

    CustomerOrdersService(JdbcTemplate jdbc, HandoverEvidencePolicy evidence, CatalogPhotoStore photos) {
        this.jdbc = jdbc; this.evidence = evidence; this.photos = photos;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    Listing list(Long actorId, String status, String query, int page, int size) {
        customer(actorId);
        String term = query == null ? "" : query.trim();
        if (status == null || !(status.equals("semua") || STATUSES.contains(status)) || page < 1 || page > 1_000_000 || size < 1 || size > 100 || term.length() > 120)
            throw bad("Filter atau halaman tidak valid");

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("semua", 0L);
        STATUSES.forEach(s -> counts.put(s, 0L));
        jdbc.query("select status_pesanan,count(*) from pemesanan where user_id=? group by status_pesanan",
            rs -> { counts.put(rs.getString(1), rs.getLong(2)); }, actorId);
        counts.put("semua", STATUSES.stream().mapToLong(counts::get).sum());

        List<Object> args = new ArrayList<>(List.of(actorId));
        String where = "where p.user_id=? ";
        if (!status.equals("semua")) { where += "and p.status_pesanan=? "; args.add(status); }
        if (!term.isEmpty()) {
            String like = "%" + term.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            where += """
                and (lower(p.kode_pemesanan) like ? escape '!' or lower(v.nama_vendor) like ? escape '!'
                  or exists(select 1 from detail_item d join item i on i.item_id=d.item_id
                            where d.order_id=p.order_id and lower(i.nama_barang) like ? escape '!'))
                """;
            args.add(like); args.add(like); args.add(like);
        }
        long total = jdbc.queryForObject("select count(*) from pemesanan p join vendor v on v.vendor_id=p.vendor_id " + where, Long.class, args.toArray());
        int actualPage = (int) Math.min(page, Math.max(1, (total + size - 1) / size));
        args.add(size); args.add((actualPage - 1) * size);
        var items = jdbc.query(SELECT + where + "order by p.tanggal_pemesanan desc,p.order_id desc limit ? offset ?",
            (rs, n) -> summary(rs), args.toArray());
        BigDecimal escrow = jdbc.queryForObject("""
            select coalesce(sum(b.jumlah),0) from pembayaran b join pemesanan p on p.order_id=b.order_id
            where p.user_id=? and b.jenis='deposit' and b.status='terverifikasi' and p.status_pesanan not in ('selesai','dibatalkan')
            """, BigDecimal.class, actorId);
        return new Listing(items, total, actualPage, size, counts, escrow, String.valueOf(actorId));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    Detail get(Long actorId, long orderId) {
        customer(actorId);
        return detail(actorId, orderId);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    Detail getByReference(Long actorId, String reference) {
        customer(actorId);
        if (reference == null || reference.length() > 100) throw missing();
        if (reference.matches("[0-9]{1,18}")) return detail(actorId, Long.parseLong(reference));
        var ids = jdbc.queryForList("select order_id from pemesanan where kode_pemesanan=? and user_id=?", Long.class, reference, actorId);
        if (ids.isEmpty()) throw missing();
        return detail(actorId, ids.getFirst());
    }

    @Transactional(readOnly = true)
    byte[] photo(Long actorId, long orderId, long itemId) {
        customer(actorId);
        var locators = jdbc.queryForList("""
            select f.tautan_foto from pemesanan p join detail_item d on d.order_id=p.order_id
            join foto_item f on f.item_id=d.item_id where p.user_id=? and p.order_id=? and d.item_id=?
            order by f.urutan,f.foto_id limit 1
            """, String.class, actorId, orderId, itemId);
        if (locators.isEmpty()) throw missing();
        return photos.read(locators.getFirst());
    }

    @Transactional
    Detail review(Long actorId, long orderId, ReviewInput input) {
        CustomerGuard.lock(jdbc, actorId); // urutan kunci sama dengan layanan lain: pengguna -> pesanan
        var rows = jdbc.queryForList("select vendor_id,status_pesanan from pemesanan where order_id=? and user_id=? for update", orderId, actorId);
        if (rows.isEmpty()) throw missing();
        if (!"selesai".equals(rows.getFirst().get("status_pesanan"))) throw conflict("Ulasan hanya dapat diberikan setelah pesanan selesai");
        if (Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from ulasan where order_id=?)", Boolean.class, orderId)))
            throw conflict("Pesanan ini sudah diulas");
        long vendorId = ((Number) rows.getFirst().get("vendor_id")).longValue();
        // Serialize reviews for the same vendor before calculating its new average.
        jdbc.queryForObject("select vendor_id from vendor where vendor_id=? for update", Long.class, vendorId);
        jdbc.update("insert into ulasan(order_id,user_id,vendor_id,rating,komentar) values (?,?,?,?,?)",
            orderId, actorId, vendorId, input.rating(), input.comment());
        // vendor.rating dibaca katalog publik; jaga tetap sama dengan rata-rata ulasan.
        jdbc.update("update vendor set rating=(select round(avg(rating),2) from ulasan where vendor_id=?) where vendor_id=?", vendorId, vendorId);
        return detail(actorId, orderId);
    }

    private Detail detail(long userId, long orderId) {
        var rows = jdbc.query(SELECT + "where p.order_id=? and p.user_id=?", (rs, n) -> summary(rs), orderId, userId);
        if (rows.isEmpty()) throw missing();
        Summary order = rows.getFirst();
        String phone = VENDOR_VISIBLE.contains(order.status())
            ? jdbc.queryForList("""
                select u.no_telp from pemesanan p join vendor v on v.vendor_id=p.vendor_id join pengguna u on u.user_id=v.user_id
                where p.order_id=?
                """, String.class, orderId).getFirst()
            : null;
        var items = jdbc.query("""
            select d.item_id,i.nama_barang,k.nama_kategori,d.jumlah_sewa,d.harga_saat_sewa,d.subtotal,
              exists(select 1 from foto_item f where f.item_id=i.item_id) as has_photo
            from detail_item d join item i on i.item_id=d.item_id join kategori k on k.kategori_id=i.kategori_id
            where d.order_id=? order by d.order_detail_id
            """, (rs, n) -> new Item(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getBigDecimal(5), rs.getBigDecimal(6),
                rs.getBoolean(7) ? "/api/orders/" + orderId + "/items/" + rs.getLong(1) + "/photo" : null), orderId);
        var payments = jdbc.query("""
            select pembayaran_id,jenis,metode,jumlah,status,dibayar_pada,dibuat_pada from pembayaran
            where order_id=? order by dibuat_pada desc,pembayaran_id desc
            """, (rs, n) -> new Payment(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getBigDecimal(4), rs.getString(5),
                instant(rs.getTimestamp(6)), instant(rs.getTimestamp(7))), orderId);
        var history = jdbc.query("""
            select riwayat_id,status_sebelumnya,status_baru,catatan,diubah_pada from riwayat_status_pesanan
            where order_id=? order by diubah_pada,riwayat_id
            """, (rs, n) -> new History(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), instant(rs.getTimestamp(5))), orderId);
        var claims = jdbc.query("""
            select klaim_id,alasan,status,diajukan_pada,diputuskan_pada from klaim
            where order_id=? order by diajukan_pada desc,klaim_id desc
            """, (rs, n) -> new Claim(rs.getLong(1), rs.getString(2), rs.getString(3), instant(rs.getTimestamp(4)), instant(rs.getTimestamp(5))), orderId);
        var refunds = jdbc.query("""
            select pengembalian_id,jumlah,alasan,status,diajukan_pada,dikembalikan_pada from pengembalian_dana
            where order_id=? order by diajukan_pada desc,pengembalian_id desc
            """, (rs, n) -> new Refund(rs.getLong(1), rs.getBigDecimal(2), rs.getString(3), rs.getString(4),
                instant(rs.getTimestamp(5)), instant(rs.getTimestamp(6))), orderId);
        var reviews = jdbc.query("select rating,komentar,tanggal_ulasan from ulasan where order_id=?",
            (rs, n) -> new Review(rs.getInt(1), rs.getString(2), instant(rs.getTimestamp(3))), orderId);
        return new Detail(order, phone, items, payments, history, claims, refunds, reviews.isEmpty() ? null : reviews.getFirst(),
            evidence.complete(orderId, "serah_terima"), evidence.complete(orderId, "pengembalian"), String.valueOf(userId));
    }

    private static Summary summary(ResultSet rs) throws SQLException {
        String status = rs.getString("status_pesanan");
        boolean reviewed = rs.getBoolean("reviewed");
        return new Summary(rs.getLong("order_id"), rs.getString("kode_pemesanan"), rs.getString("nama_vendor"), rs.getString("kota"),
            rs.getString("equipment_summary"), rs.getInt("item_count"), rs.getDate("tanggal_mulai_sewa").toLocalDate(),
            rs.getDate("tanggal_selesai_sewa").toLocalDate(), rs.getString("lokasi_acara"), rs.getBigDecimal("total_biaya_sewa"),
            rs.getBigDecimal("total_dp"), rs.getBigDecimal("paid"), status, instant(rs.getTimestamp("tanggal_pemesanan")),
            rs.getBoolean("has_open_claim"), reviewed, "selesai".equals(status) && !reviewed, rs.getBoolean("awaiting_settlement"));
    }

    private void customer(Long id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
        var rows = jdbc.queryForList("select role,status_akun from pengguna where user_id=?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid");
        if (!"customer".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hanya untuk akun customer aktif");
    }
    private static Instant instant(Timestamp ts) { return ts == null ? null : ts.toInstant(); }
    private static ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
    private static ResponseStatusException conflict(String m) { return new ResponseStatusException(HttpStatus.CONFLICT, m); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Pesanan tidak ditemukan"); }
}
