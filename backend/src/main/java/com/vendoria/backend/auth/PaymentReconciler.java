package com.vendoria.backend.auth;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Menanyakan pembayaran yang masih 'menunggu' ke Midtrans, tanpa bergantung pada webhook atau customer yang kembali. */
@Component
class PaymentReconciler {
    private static final Logger log = LoggerFactory.getLogger(PaymentReconciler.class);
    private final JdbcTemplate jdbc;
    private final CustomerPaymentService payments;

    PaymentReconciler(JdbcTemplate jdbc, CustomerPaymentService payments) { this.jdbc = jdbc; this.payments = payments; }

    @Scheduled(fixedDelay = 300_000, initialDelay = 90_000)
    void reconcile() {
        // shortcut: 100 transaksi tertua per putaran; naikkan bila antrean menunggu pernah melebihi itu.
        List<String> references = jdbc.queryForList("""
            select regexp_replace(referensi_eksternal,'-[0-9]+$','') from pembayaran
            where status='menunggu' and metode='payment_gateway' and referensi_eksternal is not null and dibuat_pada<now()-interval '5 minutes'
            group by 1 order by min(dibuat_pada) limit 100
            """, String.class);
        for (String reference : references) {
            try { payments.sync(reference); }
            catch (RuntimeException e) { log.warn("Pembayaran {} belum bisa diperiksa: {}", reference, e.getMessage()); }
        }
    }
}
