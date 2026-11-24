package com.vendoria.backend.auth;

import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Business activation is derived from identity verification and the business profile. */
@Service
class VendorBusinessPolicy {
    private static final String COMPLETE = """
        coalesce(v.nama_vendor,'') ~ '[^[:space:]]' and coalesce(v.kota,'') ~ '[^[:space:]]'
        and coalesce(v.alamat,'') ~ '[^[:space:]]' and coalesce(v.deskripsi,'') ~ '[^[:space:]]'
        """;
    private final JdbcTemplate jdbc;
    VendorBusinessPolicy(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    record Readiness(String userId, String verification, boolean profileComplete, List<String> missingFields, boolean ready) {}

    @Transactional(readOnly = true)
    Readiness get(Long actorId) { return readiness(jdbc, actorId, false); }

    static Readiness readiness(JdbcTemplate jdbc, Long actorId, boolean lock) {
        String verification = VendorAccess.verification(jdbc, actorId, lock);
        var rows = jdbc.queryForList("select nama_vendor,kota,alamat,deskripsi from vendor where user_id=?", actorId);
        var missing = new ArrayList<String>();
        for (String key : List.of("nama_vendor", "kota", "alamat", "deskripsi")) {
            Object value = rows.isEmpty() ? null : rows.getFirst().get(key);
            if (value == null || value.toString().isBlank()) missing.add(key);
        }
        return new Readiness(String.valueOf(actorId), verification, missing.isEmpty(), List.copyOf(missing),
            "terverifikasi".equals(verification) && missing.isEmpty());
    }

    static void requireReady(JdbcTemplate jdbc, Long actorId, boolean lock) {
        if (!readiness(jdbc, actorId, lock).ready())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Selesaikan verifikasi KYC dan lengkapi nama, kota, alamat, serta deskripsi bisnis untuk mengakses fitur vendor.");
    }

    /** Called in the same transaction after user/profile changes, with the user row already locked. */
    static void sync(JdbcTemplate jdbc, Long actorId) {
        jdbc.update("""
            update vendor v set status_aktif=(u.role='vendor' and u.status_akun='Aktif'
              and u.status_verifikasi='terverifikasi' and (
            """ + COMPLETE + ")) from pengguna u where v.user_id=u.user_id and v.user_id=?", actorId);
    }
}
