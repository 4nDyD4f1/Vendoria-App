package com.vendoria.backend.auth;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Shared guard: the Orders endpoint and Handover endpoint must enforce the same evidence requirements. */
@Component
class HandoverEvidencePolicy {
    static final int PHOTOS_PER_ITEM = 4;
    private final JdbcTemplate jdbc;
    private final HandoverPhotoStore photos;

    HandoverEvidencePolicy(JdbcTemplate jdbc, HandoverPhotoStore photos) { this.jdbc = jdbc; this.photos = photos; }

    boolean complete(long orderId, String type) {
        List<Long> items = jdbc.queryForList("select item_id from detail_item where order_id=?", Long.class, orderId);
        if (items.isEmpty()) return false;
        var evidence = jdbc.queryForList("select item_id,foto_kondisi,catatan_kondisi from cek_barang where order_id=? and tipe_inspeksi=?", orderId, type);
        return items.stream().allMatch(item -> evidence.stream().filter(row -> item.equals(((Number) row.get("item_id")).longValue())
                && row.get("catatan_kondisi") instanceof String note && !note.isBlank()
                && photos.available((String) row.get("foto_kondisi"))).count() == PHOTOS_PER_ITEM);
    }

    void requireComplete(long orderId, String type) {
        if (!complete(orderId, type)) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Lengkapi 4 foto berbeda dan catatan kondisi setiap alat di halaman Serah Terima (" +
                ("serah_terima".equals(type) ? "penyerahan" : "pengembalian") + ") sebelum memproses pesanan");
    }

    static boolean editable(String type, String status) {
        return "serah_terima".equals(type) ? "dikonfirmasi".equals(status)
                : "pengembalian".equals(type) && List.of("berjalan", "dikembalikan").contains(status);
    }
}
