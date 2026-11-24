package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.VendorHandoversDtos.*;

/** Orders are authoritative; cek_barang stores one private photo + condition note per row, four per item/phase. */
@Service
class VendorHandoversService {
    private static final Set<String> FILTERS = Set.of("semua", "dikonfirmasi", "berjalan", "dikembalikan", "selesai");
    private static final String SELECT = """
        select p.order_id,p.kode_pemesanan,c.nama as customer,p.tanggal_mulai_sewa,p.tanggal_selesai_sewa,
          p.lokasi_acara,p.status_pesanan,
          (select count(*) from detail_item d where d.order_id=p.order_id) as items_count,
          (select count(*) from cek_barang b where b.order_id=p.order_id and b.tipe_inspeksi='serah_terima') as handover_photos,
          (select count(*) from cek_barang b where b.order_id=p.order_id and b.tipe_inspeksi='pengembalian') as return_photos,
          exists(select 1 from klaim k where k.order_id=p.order_id and k.status in ('diajukan','ditinjau')) as has_open_claim
        from pemesanan p join pengguna c on c.user_id=p.user_id
        """;
    private final JdbcTemplate jdbc;
    private final VendorOrdersService orders;
    private final HandoverPhotoStore photos;
    private final HandoverEvidencePolicy policy;

    VendorHandoversService(JdbcTemplate jdbc, VendorOrdersService orders, HandoverPhotoStore photos, HandoverEvidencePolicy policy) {
        this.jdbc = jdbc; this.orders = orders; this.photos = photos; this.policy = policy;
    }

    @Transactional(readOnly=true)
    Listing list(Long actorId, String status, String query, int page, int size) {
        VendorBusinessPolicy.requireReady(jdbc, actorId, false);
        if (!FILTERS.contains(status) || page < 1 || page > 1000000 || size < 1 || size > 100 || query.length() > 120)
            throw bad("Filter atau halaman tidak valid");
        var vendors = jdbc.query("select vendor_id,nama_vendor,status_aktif from vendor where user_id=?",
                (rs, n) -> new VendorOrdersDtos.VendorInfo(rs.getString(1), rs.getString(2), rs.getBoolean(3)), actorId);
        if (vendors.isEmpty()) return new Listing(null, List.of(), 0, page, size);
        var vendor = vendors.getFirst();
        List<Object> args = new ArrayList<>(); args.add(Long.valueOf(vendor.id()));
        String where = "where p.vendor_id=? and p.status_pesanan in ('dikonfirmasi','berjalan','dikembalikan','selesai') ";
        if (!"semua".equals(status)) { where += "and p.status_pesanan=? "; args.add(status); }
        if (!query.isBlank()) {
            String term = "%" + query.trim().toLowerCase(java.util.Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            where += """
                and (lower(p.kode_pemesanan) like ? escape '!' or lower(c.nama) like ? escape '!'
                  or cast(p.order_id as text)=? or exists(select 1 from detail_item d join item i on i.item_id=d.item_id
                  where d.order_id=p.order_id and lower(i.nama_barang) like ? escape '!'))
                """;
            args.add(term); args.add(term); args.add(query.trim()); args.add(term);
        }
        long total = jdbc.queryForObject("select count(*) from pemesanan p join pengguna c on c.user_id=p.user_id " + where, Long.class, args.toArray());
        args.add(size); args.add((page - 1) * size);
        var items = jdbc.query(SELECT + where + """
            order by case p.status_pesanan when 'dikembalikan' then 0 when 'dikonfirmasi' then 1 when 'berjalan' then 2 else 3 end,
            p.tanggal_mulai_sewa,p.order_id desc limit ? offset ?
            """, VendorHandoversService::summary, args.toArray());
        return new Listing(vendor, items, total, page, size);
    }

    @Transactional(readOnly=true)
    Detail get(Long actorId, long orderId) {
        owner(actorId, orderId, false);
        return detail(orderId);
    }

    /** Customer owner, vendor owner, or active administrator can inspect the same original evidence. */
    @Transactional(readOnly=true)
    Detail sharedDetail(Long actorId, long orderId) {
        reader(actorId, orderId);
        return detail(orderId);
    }

    @Transactional(readOnly=true)
    byte[] photo(Long actorId, long orderId, long evidenceId) {
        reader(actorId, orderId);
        var locators = jdbc.queryForList("select foto_kondisi from cek_barang where cek_barang_id=? and order_id=?", String.class, evidenceId, orderId);
        if (locators.isEmpty()) throw missing();
        return photos.read(locators.getFirst());
    }

    @Transactional
    Detail upload(Long actorId, long orderId, Upload input, MultipartFile file) {
        String status = owner(actorId, orderId, true);
        expected(status, input.expectedStatus());
        if (!HandoverEvidencePolicy.editable(input.type(), status)) throw conflict("Bukti tahap ini sudah dikunci atau belum dapat diunggah");
        if (!Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from detail_item where order_id=? and item_id=?)", Boolean.class, orderId, input.itemId())))
            throw bad("Alat tidak termasuk pesanan ini");
        var existing = jdbc.queryForList("select foto_kondisi from cek_barang where order_id=? and item_id=? and tipe_inspeksi=?", String.class, orderId, input.itemId(), input.type());
        if (existing.size() >= HandoverEvidencePolicy.PHOTOS_PER_ITEM) throw conflict("Sudah ada 4 foto untuk alat dan tahap ini. Hapus foto draft yang ingin diganti");
        byte[] normalized = photos.normalize(file);
        for (String locator : existing) {
            if (photos.available(locator) && Arrays.equals(normalized, photos.read(locator)))
                throw conflict("Foto yang sama sudah diunggah. Gunakan sudut foto yang berbeda");
        }
        String locator = photos.save(normalized);
        // If any SQL/write/commit fails, remove the newly written file, including outer transaction rollbacks.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int completion) { if (completion != STATUS_COMMITTED) clean(locator); }
        });
        jdbc.update("""
            insert into cek_barang(order_id,item_id,tipe_inspeksi,foto_kondisi,catatan_kondisi,diperiksa_oleh)
            values (?,?,?,?,?,?)
            """, orderId, input.itemId(), input.type(), locator, input.note(), actorId);
        return detail(orderId);
    }

    @Transactional
    Detail deleteEvidence(Long actorId, long orderId, long evidenceId, String expectedStatus) {
        String status = owner(actorId, orderId, true);
        expected(status, expectedStatus);
        var evidence = jdbc.queryForList("select tipe_inspeksi,foto_kondisi from cek_barang where cek_barang_id=? and order_id=?", evidenceId, orderId);
        if (evidence.isEmpty()) throw missing();
        var row = evidence.getFirst();
        if (hasClaims(orderId)) throw conflict("Bukti pesanan dengan riwayat klaim dilindungi dan tidak dapat dihapus");
        if (!HandoverEvidencePolicy.editable((String) row.get("tipe_inspeksi"), status)) throw conflict("Bukti yang sudah dikonfirmasi tidak dapat dihapus");
        jdbc.update("delete from cek_barang where cek_barang_id=? and order_id=?", evidenceId, orderId);
        String locator = (String) row.get("foto_kondisi");
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { clean(locator); }
        });
        return detail(orderId);
    }

    @Transactional
    Detail action(Long actorId, long orderId, Action input) {
        String status = owner(actorId, orderId, true);
        expected(status, input.expectedStatus());
        String required = switch (input.action()) {
            case "handover" -> "dikonfirmasi";
            case "receive" -> "berjalan";
            case "complete" -> "dikembalikan";
            default -> throw bad("Aksi tidak valid");
        };
        if (!required.equals(status)) throw conflict("Aksi tidak sesuai tahap pesanan saat ini");
        if (!Boolean.TRUE.equals(input.confirmed())) throw bad("Konfirmasi pemeriksaan wajib dicentang");
        String prefix = switch (input.action()) {
            case "handover" -> "Serah terima: alat dan bukti kondisi awal diperiksa vendor.";
            case "receive" -> "Pengembalian: alat dan bukti kondisi akhir diterima vendor.";
            default -> "Inspeksi pengembalian dikonfirmasi vendor.";
        };
        String note = prefix + (input.note() == null || input.note().isBlank() ? "" : " " + input.note());
        // Delegates claim checks, evidence requirements, row locking and audit trail to the authoritative order service.
        orders.action(actorId, orderId, new VendorOrdersDtos.ActionRequest("proses", note, status));
        return detail(orderId);
    }

    private Detail detail(long orderId) {
        Summary order = jdbc.queryForObject(SELECT + "where p.order_id=?", VendorHandoversService::summary, orderId);
        var items = jdbc.query("""
            select d.item_id,i.nama_barang,d.jumlah_sewa from detail_item d join item i on i.item_id=d.item_id
            where d.order_id=? order by d.order_detail_id
            """, (rs, n) -> new Item(rs.getLong(1), rs.getString(2), rs.getInt(3)), orderId);
        var evidence = jdbc.query("""
            select b.*,u.nama as examiner from cek_barang b left join pengguna u on u.user_id=b.diperiksa_oleh
            where b.order_id=? order by b.cek_barang_id
            """, (rs, n) -> {
                boolean available = photos.available(rs.getString("foto_kondisi"));
                long id = rs.getLong("cek_barang_id");
                return new Evidence(id, rs.getLong("item_id"), rs.getString("tipe_inspeksi"), rs.getString("catatan_kondisi"),
                    rs.getString("examiner"), rs.getTimestamp("tanggal_bukti").toInstant(), available,
                    available ? "/api/orders/" + orderId + "/handovers/evidence/" + id + "/photo" : null);
            }, orderId);
        var history = jdbc.query("""
            select r.*,u.nama as examiner from riwayat_status_pesanan r left join pengguna u on u.user_id=r.diubah_oleh
            where r.order_id=? order by r.diubah_pada,r.riwayat_id
            """, (rs, n) -> new VendorOrdersDtos.StatusHistory(rs.getLong("riwayat_id"), rs.getString("status_sebelumnya"),
                rs.getString("status_baru"), rs.getString("examiner"), rs.getString("catatan"), rs.getTimestamp("diubah_pada").toInstant()), orderId);
        return new Detail(order, items, evidence, history, policy.complete(orderId, "serah_terima"), policy.complete(orderId, "pengembalian"), HandoverEvidencePolicy.PHOTOS_PER_ITEM, hasClaims(orderId));
    }

    private boolean hasClaims(long orderId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from klaim where order_id=?)", Boolean.class, orderId));
    }

    /** Same lock order as VendorOrdersService: user -> order. Serializes uploads, deletes and finalization. */
    private String owner(Long actorId, long orderId, boolean lock) {
        VendorBusinessPolicy.requireReady(jdbc, actorId, lock);
        var statuses = jdbc.queryForList("""
            select p.status_pesanan from pemesanan p join vendor v on v.vendor_id=p.vendor_id
            where p.order_id=? and v.user_id=?
            """ + (lock ? " for update of p" : ""), String.class, orderId, actorId);
        if (statuses.isEmpty()) throw missing();
        return statuses.getFirst();
    }

    private void reader(Long actorId, long orderId) {
        if (actorId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
        var users = jdbc.queryForList("select role,status_akun from pengguna where user_id=?", actorId);
        if (users.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid");
        var user = users.getFirst();
        if (!Pengguna.AKTIF.equals(user.get("status_akun"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Akun tidak aktif");
        if ("vendor".equals(user.get("role"))) VendorBusinessPolicy.requireReady(jdbc, actorId, false);
        boolean access = Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists(select 1 from pemesanan p join vendor v on v.vendor_id=p.vendor_id where p.order_id=? and
              ((?='customer' and p.user_id=?) or (?='vendor' and v.user_id=?) or ?='admin'))
            """, Boolean.class, orderId, user.get("role"), actorId, user.get("role"), actorId, user.get("role")));
        if (!access) throw missing();
    }

    private void clean(String locator) {
        try { photos.remove(locator); }
        catch (RuntimeException ex) { LoggerFactory.getLogger(VendorHandoversService.class).warn("Pembersihan file bukti belum berhasil; perlu rekonsiliasi penyimpanan"); }
    }
    private static Summary summary(ResultSet rs, int n) throws SQLException {
        return new Summary(rs.getLong("order_id"), rs.getString("kode_pemesanan"), rs.getString("customer"),
            rs.getDate("tanggal_mulai_sewa").toLocalDate(), rs.getDate("tanggal_selesai_sewa").toLocalDate(), rs.getString("lokasi_acara"),
            rs.getString("status_pesanan"), rs.getInt("items_count"), rs.getInt("handover_photos"), rs.getInt("return_photos"), rs.getBoolean("has_open_claim"));
    }
    private static void expected(String status, String expected) {
        if (!status.equals(expected)) throw conflict("Status pesanan sudah berubah. Muat ulang sebelum melanjutkan");
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Pesanan atau bukti tidak ditemukan"); }
}
