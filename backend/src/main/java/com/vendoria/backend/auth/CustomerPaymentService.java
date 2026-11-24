package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerPaymentDtos.*;

/**
 * /pembayaran/bank + /booking/terkonfirmasi: bayar deposit pesanan lewat Midtrans Snap.
 * Satu transaksi Midtrans (order_id = ref) membayar semua pesanan yang dipilih; tiap pesanan punya satu baris
 * pembayaran dengan referensi_eksternal = ref-orderId. Status dibaca dari API Midtrans, bukan dari klien/redirect.
 */
@Service
class CustomerPaymentService {
    private static final Logger log = LoggerFactory.getLogger(CustomerPaymentService.class);
    private static final Pattern REF = Pattern.compile("^VND-PAY-\\d{12}-\\d{4}$");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String UNPAID = "menunggu_pembayaran";
    private final JdbcTemplate jdbc;
    private final MidtransClient midtrans;
    private final String frontendUrl;

    CustomerPaymentService(JdbcTemplate jdbc, MidtransClient midtrans, @Value("${app.frontend-url}") String frontendUrl) {
        this.jdbc = jdbc; this.midtrans = midtrans; this.frontendUrl = frontendUrl;
    }

    @Transactional(readOnly = true)
    Summary summary(Long actorId, List<Long> ids) {
        customer(actorId);
        var orders = load(actorId, ids, false);
        if (orders.isEmpty()) throw missing();
        return new Summary(orders, due(orders));
    }

    @Transactional
    Pay pay(Long actorId, List<Long> ids) {
        CustomerGuard.lockVerified(jdbc, actorId);
        var orders = load(actorId, ids, true);
        if (orders.isEmpty() || !ids.isEmpty() && orders.size() != new HashSet<>(ids).size()) throw missing();
        if (orders.stream().anyMatch(o -> !UNPAID.equals(o.status()))) throw conflict("Ada pesanan yang sudah dibayar atau tidak lagi menunggu pembayaran");
        if (orders.stream().anyMatch(o -> o.deposit().signum() <= 0)) throw conflict("Pesanan tanpa deposit tidak dapat dibayar lewat gateway");

        String ref = "VND-PAY-" + DateTimeFormatter.ofPattern("yyMMddHHmmss").format(LocalDateTime.now()) + "-" + (1000 + RANDOM.nextInt(9000));
        for (var o : orders) jdbc.update("""
            insert into pembayaran(order_id,jenis,metode,jumlah,status,referensi_eksternal) values (?,'deposit','payment_gateway',?,'menunggu',?)
            """, o.orderId(), o.deposit(), ref + "-" + o.orderId());

        var user = jdbc.queryForMap("select nama,email from pengguna where user_id=?", actorId);
        var items = orders.stream().map(o -> Map.<String, Object>of("id", o.code(), "price", rupiah(o.deposit()), "quantity", 1, "name", "Deposit " + o.code())).toList();
        String back = frontendUrl + "/pembayaran/bank?orders=" + String.join(",", orders.stream().map(o -> String.valueOf(o.orderId())).toList());
        var body = new HashMap<>(Map.<String, Object>of(
            "transaction_details", Map.of("order_id", ref, "gross_amount", rupiah(due(orders))),
            "item_details", items,
            "customer_details", Map.of("first_name", user.get("nama"), "email", user.get("email")),
            "expiry", Map.of("unit", "minutes", "duration", 60),
            "callbacks", Map.of("finish", frontendUrl + "/booking/terkonfirmasi?ref=" + ref, "unfinish", back, "error", back)));
        if (midtrans.autoConfirm()) body.put("enabled_payments", List.of("bca_va")); // satu-satunya VA yang bisa dilunasi otomatis di sandbox
        return new Pay(midtrans.createTransaction(body), ref);
    }

    @Transactional
    Confirmation confirmation(Long actorId, String ref) {
        customer(actorId);
        if (ref == null || !REF.matcher(ref).matches()) throw bad("Referensi pembayaran tidak valid");
        var ids = jdbc.queryForList("""
            select b.order_id from pembayaran b join pemesanan p on p.order_id=b.order_id where b.referensi_eksternal like ? and p.user_id=?
            """, Long.class, ref + "-%", actorId);
        if (ids.isEmpty()) throw missing();
        sync(ref);
        var payments = jdbc.queryForList("select status,jumlah from pembayaran where referensi_eksternal like ?", ref + "-%");
        var states = payments.stream().map(r -> (String) r.get("status")).toList();
        String state = states.stream().allMatch("terverifikasi"::equals) ? "paid" : states.contains("menunggu") ? "pending" : "failed";
        BigDecimal amount = payments.stream().map(r -> (BigDecimal) r.get("jumlah")).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Confirmation(ref, state, amount, load(actorId, ids, false));
    }

    /** Menyamakan baris pembayaran 'menunggu' milik ref dengan status di Midtrans. Aman dipanggil berulang / dari webhook publik. */
    @Transactional
    void sync(String ref) {
        if (ref == null || !REF.matcher(ref).matches()) return;
        // Kunci dulu: return-URL dan webhook bisa datang bersamaan; yang kedua melihat baris sudah tak 'menunggu'.
        var rows = jdbc.queryForList("select pembayaran_id,order_id,jumlah from pembayaran where referensi_eksternal like ? and status='menunggu' order by order_id for update", ref + "-%");
        if (rows.isEmpty()) return;
        var s = midtrans.status(ref);
        if (s == null) return;
        String ts = String.valueOf(s.get("transaction_status")), fraud = String.valueOf(s.get("fraud_status"));
        boolean paid = ts.equals("settlement") || ts.equals("capture") && (fraud.equals("null") || fraud.equals("accept"));
        boolean failed = Set.of("deny", "cancel", "expire", "failure").contains(ts);
        if (paid) {
            BigDecimal sum = rows.stream().map(r -> (BigDecimal) r.get("jumlah")).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (new BigDecimal(String.valueOf(s.get("gross_amount"))).compareTo(sum) != 0) { log.warn("Nominal Midtrans {} tidak cocok dengan tagihan {}", ref, sum); return; }
            for (var r : rows) {
                jdbc.update("update pembayaran set status='terverifikasi',dibayar_pada=now(),diverifikasi_pada=now() where pembayaran_id=?", r.get("pembayaran_id"));
                if (jdbc.update("update pemesanan set status_pesanan='menunggu_konfirmasi' where order_id=? and status_pesanan=?", r.get("order_id"), UNPAID) > 0)
                    jdbc.update("insert into riwayat_status_pesanan(order_id,status_sebelumnya,status_baru,catatan) values (?,?,'menunggu_konfirmasi','Deposit dibayar lewat Midtrans')", r.get("order_id"), UNPAID);
            }
        } else if (failed) {
            for (var r : rows) jdbc.update("update pembayaran set status='gagal' where pembayaran_id=?", r.get("pembayaran_id"));
        }
    }

    private List<Order> load(Long actorId, List<Long> ids, boolean lock) {
        if (ids.size() > 20) throw bad("Terlalu banyak pesanan");
        String where = ids.isEmpty() ? "and p.status_pesanan='" + UNPAID + "'" : "and p.order_id in (" + String.join(",", Collections.nCopies(ids.size(), "?")) + ")";
        var args = new ArrayList<Object>(); args.add(actorId); args.addAll(ids);
        return jdbc.query("""
            select p.order_id,p.kode_pemesanan,v.nama_vendor,p.total_biaya_sewa,p.total_dp,p.status_pesanan
            from pemesanan p join vendor v on v.vendor_id=p.vendor_id where p.user_id=?
            """ + where + " order by p.order_id" + (lock ? " for update of p" : ""),
            (rs, n) -> new Order(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getBigDecimal(4), rs.getBigDecimal(5), rs.getString(6)), args.toArray());
    }
    private static BigDecimal due(List<Order> orders) {
        return orders.stream().filter(o -> UNPAID.equals(o.status())).map(Order::deposit).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    private static long rupiah(BigDecimal v) { return v.setScale(0, RoundingMode.HALF_UP).longValue(); }

    private void customer(Long id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
        var rows = jdbc.queryForList("select role,status_akun from pengguna where user_id=?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid");
        if (!"customer".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Pembayaran hanya untuk akun customer aktif");
    }
    private static ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
    private static ResponseStatusException conflict(String m) { return new ResponseStatusException(HttpStatus.CONFLICT, m); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Tagihan tidak ditemukan"); }
}
