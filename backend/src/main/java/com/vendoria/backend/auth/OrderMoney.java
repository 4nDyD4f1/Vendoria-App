package com.vendoria.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Aturan uang satu pesanan, dipakai bersama. Semua potongan SQL mengharapkan tabel pemesanan beralias {@code p}.
 * Deposit adalah jaminan (tidak mengurangi tagihan); sewa dilunasi penuh lewat pembayaran jenis 'pelunasan'.
 */
final class OrderMoney {
    private OrderMoney() {}

    static final String SETTLED = "((select coalesce(sum(sp.jumlah),0) from pembayaran sp where sp.order_id=p.order_id"
        + " and sp.jenis='pelunasan' and sp.status='terverifikasi')>=p.total_biaya_sewa)";
    static final String AWAITING = "(p.status_pesanan='dikonfirmasi' and not " + SETTLED + ")";
    /** Deposit terverifikasi yang masih ditahan (belum dicatat untuk dikembalikan). */
    static final String HELD_DEPOSIT = "(select coalesce(sum(hd.jumlah),0) from pembayaran hd where hd.order_id=p.order_id"
        + " and hd.jenis='deposit' and hd.status='terverifikasi'"
        + " and not exists(select 1 from pengembalian_dana hr where hr.pembayaran_id=hd.pembayaran_id))";
    /** Laporan kerusakan disetujui admin. Klaim lama yang punya baris pengembalian_dana sendiri tidak dihitung. */
    static final String FORFEITED = "exists(select 1 from klaim fk where fk.order_id=p.order_id and fk.jenis='kerusakan' and fk.status='disetujui'"
        + " and not exists(select 1 from pengembalian_dana fr where fr.klaim_id=fk.klaim_id))";

    /** Laporan customer yang belum tuntas (termasuk menunggu barang kembali): vendor tidak boleh memproses pesanan. */
    static final String OPEN_REPORT = "exists(select 1 from klaim op where op.order_id=p.order_id and op.jenis<>'kerusakan'"
        + " and (op.status in ('diajukan','ditinjau') or (op.jenis='tidak_sesuai' and op.status='disetujui' and op.barang_kembali_pada is null)))";

    /** 'Rp 1.500.000' dari ekspresi numerik. */
    static String rupiah(String expression) {
        return "'Rp '||replace(to_char(" + expression + ",'FM999,999,999,999,990'),',','.')";
    }

    static boolean awaitingSettlement(JdbcTemplate jdbc, long orderId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select " + AWAITING + " from pemesanan p where p.order_id=?", Boolean.class, orderId));
    }

    static void requireSettled(JdbcTemplate jdbc, long orderId) {
        if (awaitingSettlement(jdbc, orderId)) throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Menunggu pelunasan dari customer. Alat baru boleh diserahkan setelah sewa dibayar penuh");
    }

    /** Mencatat deposit yang masih ditahan sebagai pengembalian dana (ditransfer manual oleh admin). Aman dipanggil ulang. */
    static void refundDeposit(JdbcTemplate jdbc, long orderId, String reason) {
        jdbc.update("""
            insert into pengembalian_dana(order_id,pembayaran_id,jumlah,alasan)
            select b.order_id,b.pembayaran_id,b.jumlah,? from pembayaran b
            where b.order_id=? and b.jenis='deposit' and b.status='terverifikasi'
              and not exists(select 1 from pengembalian_dana r where r.pembayaran_id=b.pembayaran_id)
            """, reason, orderId);
    }
}
