package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.OrderReportDtos.*;

/**
 * Laporan pesanan oleh customer (tabel klaim, jenis selain 'kerusakan'): pengajuan, tanggapan vendor,
 * akibat keputusan admin, dan konfirmasi barang kembali.
 */
@Service
class OrderReportService {
    private static final List<String> TYPES = List.of("tidak_sampai", "tidak_sesuai", "kurang", "tidak_berfungsi", "lainnya");
    private final JdbcTemplate jdbc;
    private final HandoverPhotoStore photos;

    OrderReportService(JdbcTemplate jdbc, HandoverPhotoStore photos) { this.jdbc = jdbc; this.photos = photos; }

    @Transactional(readOnly = true)
    Form form(Long actorId, String reference) {
        role(actorId, "customer");
        return form(order(actorId, reference, false));
    }

    @Transactional
    Form create(Long actorId, String reference, Input input, MultipartFile file) {
        role(actorId, "customer");
        var order = order(actorId, reference, true);
        long orderId = ((Number) order.get("order_id")).longValue();
        var form = form(order);
        if (form.report() != null) throw conflict("Pesanan ini sudah pernah dilaporkan");
        var option = form.options().stream().filter(o -> o.type().equals(input.type())).findFirst().orElseThrow(() -> bad("Jenis laporan tidak valid"));
        if (!option.available()) throw conflict(option.reason());

        Long itemId = null;
        Integer units = null;
        if (Set.of("kurang", "tidak_berfungsi").contains(input.type())) {
            var item = form.items().stream().filter(i -> Objects.equals(i.itemId(), input.itemId())).findFirst()
                .orElseThrow(() -> bad("Pilih alat yang bermasalah"));
            if (input.units() == null || input.units() > item.quantity()) throw bad("Jumlah unit harus 1 sampai " + item.quantity());
            itemId = item.itemId();
            units = input.units();
        }
        boolean hasPhoto = file != null && !file.isEmpty();
        if (!hasPhoto && !"tidak_sampai".equals(input.type())) throw bad("Sertakan foto sebagai bukti");
        jdbc.update("insert into klaim(order_id,user_id,alasan,jenis,item_id,jumlah_unit,foto_pelapor) values (?,?,?,?,?,?,?)",
            orderId, actorId, input.description(), input.type(), itemId, units, hasPhoto ? store(file) : null);
        return form(order);
    }

    /** Satu tanggapan vendor sebelum admin memutuskan. */
    @Transactional
    void respond(Long actorId, long claimId, String text, MultipartFile file) {
        VendorBusinessPolicy.requireReady(jdbc, actorId, true);
        var claim = vendorClaim(actorId, claimId);
        if (!List.of("diajukan", "ditinjau").contains(claim.get("status"))) throw conflict("Laporan sudah diputuskan");
        if (claim.get("tanggapan_vendor") != null) throw conflict("Tanggapan sudah dikirim");
        String locator = file != null && !file.isEmpty() ? store(file) : null;
        jdbc.update("update klaim set tanggapan_vendor=?,foto_vendor=? where klaim_id=?", text, locator, claimId);
    }

    /** "Barang tidak sesuai": dana baru kembali setelah barang diterima lagi (dikonfirmasi vendor atau admin). */
    @Transactional
    void confirmReturned(Long actorId, long claimId, boolean asAdmin) {
        if (asAdmin) {
            role(actorId, "admin");
            if (jdbc.queryForList("select 1 from klaim where klaim_id=? and jenis<>'kerusakan' for update", claimId).isEmpty()) throw missing();
        } else {
            VendorBusinessPolicy.requireReady(jdbc, actorId, true);
            vendorClaim(actorId, claimId);
        }
        var claim = jdbc.queryForMap("select order_id,jenis,status,barang_kembali_pada from klaim where klaim_id=?", claimId);
        if (!"tidak_sesuai".equals(claim.get("jenis")) || !"disetujui".equals(claim.get("status")) || claim.get("barang_kembali_pada") != null)
            throw conflict("Laporan ini tidak sedang menunggu pengembalian barang");
        jdbc.update("update klaim set barang_kembali_pada=now() where klaim_id=?", claimId);
        refundAllAndCancel(((Number) claim.get("order_id")).longValue(), claimId, actorId, "Barang tidak sesuai");
    }

    /** Dipanggil AdminClaimService saat laporan customer disetujui. units/amount = koreksi admin (opsional). */
    void approve(long claimId, Long adminId, Integer units, Long amount) {
        var claim = jdbc.queryForMap("""
            select k.order_id,k.jenis,k.item_id,k.jumlah_unit,p.total_biaya_sewa,
              greatest(p.tanggal_selesai_sewa-p.tanggal_mulai_sewa,1) as days,
              greatest(k.diajukan_pada::date-p.tanggal_mulai_sewa,0) as used
            from klaim k join pemesanan p on p.order_id=k.order_id where k.klaim_id=?
            """, claimId);
        long orderId = ((Number) claim.get("order_id")).longValue();
        String type = (String) claim.get("jenis");
        BigDecimal refund;
        switch (type) {
            case "tidak_sampai" -> { refundAllAndCancel(orderId, claimId, adminId, "Barang tidak sampai"); return; }
            case "tidak_sesuai" -> { return; } // menunggu barang kembali
            case "lainnya" -> {
                if (amount == null) throw bad("Isi nominal pengembalian untuk laporan jenis Lainnya");
                refund = BigDecimal.valueOf(amount);
                if (refund.compareTo((BigDecimal) claim.get("total_biaya_sewa")) > 0) throw bad("Pengembalian tidak boleh melebihi total sewa");
            }
            default -> {
                var line = jdbc.queryForMap("select sum(jumlah_sewa) as qty,sum(subtotal) as subtotal from detail_item where order_id=? and item_id=?",
                    orderId, claim.get("item_id"));
                int quantity = ((Number) line.get("qty")).intValue();
                int affected = units != null ? units : ((Number) claim.get("jumlah_unit")).intValue();
                if (affected > quantity) throw bad("Jumlah unit harus 1 sampai " + quantity);
                refund = ((BigDecimal) line.get("subtotal")).multiply(BigDecimal.valueOf(affected));
                long divisor = quantity;
                if ("tidak_berfungsi".equals(type)) {
                    int days = ((Number) claim.get("days")).intValue(), used = Math.min(((Number) claim.get("used")).intValue(), days - 1);
                    refund = refund.multiply(BigDecimal.valueOf(days - used));
                    divisor *= days;
                }
                refund = refund.divide(BigDecimal.valueOf(divisor), 0, RoundingMode.HALF_UP);
            }
        }
        if (refund.signum() > 0)
            jdbc.update("insert into pengembalian_dana(order_id,klaim_id,jumlah,alasan) values (?,?,?,?)", orderId, claimId, refund, label(type));
    }

    @Transactional(readOnly = true)
    byte[] photo(Long actorId, long claimId, String side) {
        if (actorId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
        var users = jdbc.queryForList("select role,status_akun from pengguna where user_id=?", actorId);
        if (users.isEmpty() || !Pengguna.AKTIF.equals(users.getFirst().get("status_akun"))) throw missing();
        String role = (String) users.getFirst().get("role");
        var locators = jdbc.queryForList("select " + ("vendor".equals(side) ? "k.foto_vendor" : "k.foto_pelapor") + """
             from klaim k join pemesanan p on p.order_id=k.order_id join vendor v on v.vendor_id=p.vendor_id
            where k.klaim_id=? and ((?='customer' and p.user_id=?) or (?='vendor' and v.user_id=?) or ?='admin')
            """, String.class, claimId, role, actorId, role, actorId, role);
        if (locators.isEmpty() || locators.getFirst() == null) throw missing();
        return photos.read(locators.getFirst());
    }

    private void refundAllAndCancel(long orderId, long claimId, Long actorId, String reason) {
        // Semua uang yang sudah masuk (sewa dan deposit) kembali; vendor tidak mendapat apa-apa.
        jdbc.update("""
            insert into pengembalian_dana(order_id,pembayaran_id,klaim_id,jumlah,alasan)
            select b.order_id,b.pembayaran_id,?,b.jumlah,? from pembayaran b where b.order_id=? and b.status='terverifikasi'
              and not exists(select 1 from pengembalian_dana r where r.pembayaran_id=b.pembayaran_id)
            """, claimId, reason, orderId);
        String from = jdbc.queryForObject("select status_pesanan from pemesanan where order_id=? for update", String.class, orderId);
        jdbc.update("update pemesanan set status_pesanan='dibatalkan' where order_id=?", orderId);
        jdbc.update("insert into riwayat_status_pesanan(order_id,status_sebelumnya,status_baru,diubah_oleh,catatan) values (?,?,'dibatalkan',?,?)",
            orderId, from, actorId, "Laporan pelanggan disetujui: " + reason.toLowerCase(Locale.ROOT));
    }

    private Map<String, Object> order(Long actorId, String reference, boolean lock) {
        var rows = jdbc.queryForList("""
            select p.order_id,p.kode_pemesanan,p.status_pesanan,v.nama_vendor,
              current_date>=p.tanggal_mulai_sewa as started,
              (select max(h.diubah_pada) from riwayat_status_pesanan h where h.order_id=p.order_id and h.status_baru='berjalan') as handed_over,
              coalesce(now()<=(select max(h.diubah_pada) from riwayat_status_pesanan h where h.order_id=p.order_id and h.status_baru='berjalan')+interval '24 hours',true) as in_window,
            """ + "  " + OrderMoney.AWAITING + " as awaiting\n" + """
            from pemesanan p join vendor v on v.vendor_id=p.vendor_id
            where p.user_id=? and (p.kode_pemesanan=? or cast(p.order_id as text)=?)
            """ + (lock ? " for update of p" : ""), actorId, reference, reference);
        if (rows.isEmpty()) throw missing();
        return rows.getFirst();
    }

    private Form form(Map<String, Object> order) {
        long orderId = ((Number) order.get("order_id")).longValue();
        var items = jdbc.query("""
            select d.item_id,i.nama_barang,sum(d.jumlah_sewa) from detail_item d join item i on i.item_id=d.item_id
            where d.order_id=? group by d.item_id,i.nama_barang order by d.item_id
            """, (rs, n) -> new Item(rs.getLong(1), rs.getString(2), rs.getInt(3)), orderId);
        var report = jdbc.query("select klaim_id,jenis,status,alasan,keputusan_admin from klaim where order_id=? and jenis<>'kerusakan' order by klaim_id desc limit 1",
            (rs, n) -> new Report(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)), orderId)
            .stream().findFirst().orElse(null);

        String status = (String) order.get("status_pesanan");
        boolean started = Boolean.TRUE.equals(order.get("started"));
        boolean awaiting = Boolean.TRUE.equals(order.get("awaiting"));
        boolean handedOver = order.get("handed_over") != null;
        boolean open = !awaiting && ("dikonfirmasi".equals(status) || "berjalan".equals(status));
        boolean active = open && ("berjalan".equals(status) || started);
        var options = TYPES.stream().map(type -> {
            String reason = null;
            if (report != null) reason = "Pesanan ini sudah pernah dilaporkan";
            else if (!open) reason = "Laporan hanya untuk pesanan lunas yang belum dikembalikan";
            else if ("tidak_sampai".equals(type)) { if (!started) reason = "Dapat dilaporkan mulai tanggal sewa"; }
            else if (!active) reason = "Dapat dilaporkan mulai tanggal sewa atau setelah serah terima";
            else if (Set.of("kurang", "tidak_sesuai").contains(type) && handedOver && !Boolean.TRUE.equals(order.get("in_window")))
                reason = "Batas 24 jam setelah serah terima sudah lewat";
            return new Option(type, label(type), reason == null, reason);
        }).toList();
        return new Form(orderId, (String) order.get("kode_pemesanan"), (String) order.get("nama_vendor"), items, options, report);
    }

    private Map<String, Object> vendorClaim(Long actorId, long claimId) {
        var rows = jdbc.queryForList("""
            select k.status,k.tanggapan_vendor from klaim k join pemesanan p on p.order_id=k.order_id join vendor v on v.vendor_id=p.vendor_id
            where k.klaim_id=? and v.user_id=? and k.jenis<>'kerusakan' for update of k
            """, claimId, actorId);
        if (rows.isEmpty()) throw missing();
        return rows.getFirst();
    }

    private String store(MultipartFile file) {
        String locator = photos.save(photos.normalize(file));
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int completion) {
                if (completion == STATUS_COMMITTED) return;
                try { photos.remove(locator); }
                catch (RuntimeException ex) { LoggerFactory.getLogger(OrderReportService.class).warn("Pembersihan foto laporan belum berhasil"); }
            }
        });
        return locator;
    }

    private void role(Long actorId, String role) {
        if (actorId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
        var rows = jdbc.queryForList("select role,status_akun from pengguna where user_id=?", actorId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid");
        if (!role.equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Akun ini tidak dapat melakukan tindakan tersebut");
    }

    static String label(String type) {
        return switch (type) {
            case "tidak_sampai" -> "Barang tidak sampai";
            case "tidak_sesuai" -> "Barang tidak sesuai";
            case "kurang" -> "Barang kurang";
            case "tidak_berfungsi" -> "Barang rusak / tidak berfungsi";
            default -> "Lainnya";
        };
    }
    private static ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
    private static ResponseStatusException conflict(String m) { return new ResponseStatusException(HttpStatus.CONFLICT, m); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Laporan atau pesanan tidak ditemukan"); }
}
