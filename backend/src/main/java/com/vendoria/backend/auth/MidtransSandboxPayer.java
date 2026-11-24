package com.vendoria.backend.auth;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Hanya sandbox (MidtransClient.autoConfirm): begitu customer memilih VA BCA di Snap, VA-nya dilunasi lewat simulator
 * Midtrans, sehingga "Check status" di Snap langsung mengalihkan ke /booking/terkonfirmasi. Status lunas tetap
 * berasal dari Midtrans (settlement) dan dicatat oleh CustomerPaymentService.sync, bukan dari sini.
 */
@Component
class MidtransSandboxPayer {
    private static final Logger log = LoggerFactory.getLogger(MidtransSandboxPayer.class);
    private final JdbcTemplate jdbc;
    private final MidtransClient midtrans;

    MidtransSandboxPayer(JdbcTemplate jdbc, MidtransClient midtrans) { this.jdbc = jdbc; this.midtrans = midtrans; }

    @Scheduled(fixedDelay = 3000, initialDelay = 5000)
    void payPendingVirtualAccounts() {
        if (!midtrans.autoConfirm()) return;
        // order_id Midtrans = referensi_eksternal tanpa akhiran "-<orderId>"
        List<String> refs = jdbc.queryForList("""
            select distinct regexp_replace(referensi_eksternal,'-[0-9]+$','') from pembayaran
            where status='menunggu' and metode='payment_gateway' and dibuat_pada > now() - interval '1 hour'
            """, String.class);
        for (String ref : refs) {
            try {
                Map<String, Object> s = midtrans.status(ref);
                if (s == null || !"pending".equals(s.get("transaction_status")) || !(s.get("va_numbers") instanceof List<?> vas) || vas.isEmpty()
                    || !(vas.getFirst() instanceof Map<?, ?> va) || !"bca".equals(va.get("bank"))) continue;
                boolean ok = midtrans.simulateBcaVaPayment(String.valueOf(va.get("va_number")), String.valueOf(s.get("gross_amount")));
                log.info("Sandbox: VA BCA {} {}", ref, ok ? "dilunasi lewat simulator" : "gagal dilunasi lewat simulator");
            } catch (RuntimeException e) { log.warn("Sandbox payer {}: {}", ref, e.getMessage()); }
        }
    }
}
