package com.vendoria.backend.auth;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Membatalkan pesanan yang macet: deposit tak kunjung dibayar, atau vendor tak kunjung mengonfirmasi. */
@Component
class UnpaidOrderExpiry {
    private static final Logger log = LoggerFactory.getLogger(UnpaidOrderExpiry.class);
    private final JdbcTemplate jdbc;
    private final CustomerPaymentService payments;
    private final int hours, confirmHours;

    UnpaidOrderExpiry(JdbcTemplate jdbc, CustomerPaymentService payments, @Value("${app.order.unpaid-expiry-hours:24}") int hours,
            @Value("${app.order.confirm-expiry-hours:24}") int confirmHours) {
        this.jdbc = jdbc; this.payments = payments; this.hours = hours; this.confirmHours = confirmHours;
    }

    @Scheduled(fixedDelay = 600_000, initialDelay = 60_000)
    void expire() {
        cancelUnconfirmed();
        List<Long> stale = jdbc.queryForList(
            "select order_id from pemesanan where status_pesanan='menunggu_pembayaran' and tanggal_pemesanan<now()-make_interval(hours=>?)",
            Long.class, hours);
        for (Long order : stale) {
            try {
                // Tanya Midtrans dulu: webhook bisa tidak sampai, dan pesanan yang sudah dibayar tidak boleh dibatalkan.
                jdbc.queryForList("select distinct regexp_replace(referensi_eksternal,'-[0-9]+$','') from pembayaran where order_id=? and status='menunggu'",
                    String.class, order).forEach(payments::sync);
                jdbc.update("""
                    with cancelled as (
                      update pemesanan p set status_pesanan='dibatalkan' where p.order_id=? and p.status_pesanan='menunggu_pembayaran'
                        and not exists(select 1 from pembayaran b where b.order_id=p.order_id and b.status='menunggu' and b.dibuat_pada>now()-interval '2 hours')
                      returning p.order_id)
                    insert into riwayat_status_pesanan(order_id,status_sebelumnya,status_baru,catatan)
                    select order_id,'menunggu_pembayaran','dibatalkan',? from cancelled
                    """, order, "Dibatalkan otomatis: deposit tidak dibayar dalam " + hours + " jam");
            } catch (RuntimeException e) {
                log.warn("Pesanan {} belum bisa diperiksa untuk kedaluwarsa: {}", order, e.getMessage());
            }
        }
    }

    /** Vendor diam atau dinonaktifkan: batal dan depositnya dicatat untuk dikembalikan, dalam satu pernyataan. */
    private void cancelUnconfirmed() {
        // Batas dihitung sejak deposit lunas (masuk 'menunggu_konfirmasi'), bukan sejak pesanan dibuat.
        jdbc.update("""
            with cancelled as (
              update pemesanan p set status_pesanan='dibatalkan' where p.status_pesanan='menunggu_konfirmasi'
                and coalesce((select max(h.diubah_pada) from riwayat_status_pesanan h
                      where h.order_id=p.order_id and h.status_baru='menunggu_konfirmasi'),p.tanggal_pemesanan)<now()-make_interval(hours=>?)
              returning p.order_id),
            noted as (
              insert into riwayat_status_pesanan(order_id,status_sebelumnya,status_baru,catatan)
              select order_id,'menunggu_konfirmasi','dibatalkan',? from cancelled)
            insert into pengembalian_dana(order_id,pembayaran_id,jumlah,alasan)
            select b.order_id,b.pembayaran_id,b.jumlah,'Vendor tidak mengonfirmasi, deposit dikembalikan'
            from pembayaran b join cancelled c on c.order_id=b.order_id
            where b.jenis='deposit' and b.status='terverifikasi'
              and not exists(select 1 from pengembalian_dana r where r.pembayaran_id=b.pembayaran_id)
            """, confirmHours, "Dibatalkan otomatis: vendor tidak mengonfirmasi dalam " + confirmHours + " jam");
    }
}
