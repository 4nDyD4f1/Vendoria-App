package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.vendoria.backend.auth.CustomerCartDtos.*;

/** /keranjang: keranjang tersimpan per akun + checkout yang membuat satu pesanan (menunggu_pembayaran) per vendor. */
@Service
class CustomerCartService {
    static final int LIMIT = 50, MAX_DAYS = 60;
    static final List<String> EVENT_CATEGORIES = List.of("Festival & Konser", "Pernikahan", "Acara Korporat", "Wisuda & Kampus", "Ulang Tahun & Pribadi", "Lainnya");
    private static final SecureRandom RANDOM = new SecureRandom();
    /** Deposit paling banyak 60% dari biaya sewa pesanan; sama dengan src/features/interface/deposit.js. */
    private static final BigDecimal DEPOSIT_CAP = new BigDecimal("0.60");
    private final JdbcTemplate jdbc;
    private final PublicCatalogService catalog;
    CustomerCartService(JdbcTemplate jdbc, PublicCatalogService catalog) { this.jdbc = jdbc; this.catalog = catalog; }

    private record Row(long itemId, String name, long vendorId, int quantity) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    Listing list(Long actorId) {
        customer(actorId, false);
        var rows = jdbc.query("""
            select c.item_id,i.nama_barang,i.vendor_id,c.jumlah from keranjang c join item i on i.item_id=c.item_id
            where c.user_id=? order by c.ditambahkan_pada desc,c.item_id desc
            """, (rs, n) -> new Row(rs.getLong(1), rs.getString(2), rs.getLong(3), rs.getInt(4)), actorId);
        var available = catalog.available(rows.stream().map(Row::itemId).toList()).stream()
            .collect(Collectors.toMap(PublicCatalogDtos.Item::id, Function.identity()));
        return new Listing(String.valueOf(actorId), rows.stream().map(r -> {
            var item = available.get(String.valueOf(r.itemId()));
            return new Entry(String.valueOf(r.itemId()), r.name(), String.valueOf(r.vendorId()), r.quantity(), item != null, item);
        }).toList(), EVENT_CATEGORIES, LIMIT);
    }

    @Transactional
    void put(Long actorId, long itemId, Quantity input) {
        customer(actorId, true);
        if (itemId <= 0) throw bad("ID alat tidak valid");
        var item = catalog.get(itemId); // aturan ketersediaan sama dengan katalog publik; harga/nama tak pernah dari klien
        if (input.quantity() > item.stock()) throw bad("Stok alat ini hanya " + item.stock() + " unit");
        boolean exists = Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from keranjang where user_id=? and item_id=?)", Boolean.class, actorId, itemId));
        if (!exists && jdbc.queryForObject("select count(*) from keranjang where user_id=?", Integer.class, actorId) >= LIMIT)
            throw conflict("Keranjang maksimal " + LIMIT + " alat. Hapus beberapa alat terlebih dahulu");
        if (exists && Boolean.TRUE.equals(input.keepExisting())) return;
        jdbc.update("""
            insert into keranjang(user_id,item_id,jumlah) values (?,?,?)
            on conflict(user_id,item_id) do update set jumlah=excluded.jumlah
            """, actorId, itemId, input.quantity());
    }

    @Transactional
    void remove(Long actorId, long itemId) { customer(actorId, true); jdbc.update("delete from keranjang where user_id=? and item_id=?", actorId, itemId); }

    @Transactional
    PlacedOrders checkout(Long actorId, Checkout in) {
        CustomerGuard.lockVerified(jdbc, actorId);
        LocalDate today = LocalDate.now();
        if (!EVENT_CATEGORIES.contains(in.category())) throw bad("Kategori acara tidak valid");
        if (in.startDate().isBefore(today)) throw bad("Tanggal mulai tidak boleh di masa lalu");
        if (!in.endDate().isAfter(in.startDate())) throw bad("Tanggal selesai harus setelah tanggal mulai");
        long days = ChronoUnit.DAYS.between(in.startDate(), in.endDate());
        if (days > MAX_DAYS) throw bad("Masa sewa maksimal " + MAX_DAYS + " hari");

        // Kunci baris alat (urut tetap) supaya dua checkout bersamaan tidak sama-sama lolos cek stok.
        var rows = jdbc.queryForList("""
            select c.item_id,c.jumlah,i.nama_barang,i.vendor_id,i.harga_sewa_per_hari,i.minimal_dp,i.stok_total,v.nama_vendor,
              (i.status='aktif' and i.stok_total>0 and v.status_aktif and u.status_akun='Aktif') as ok
            from keranjang c join item i on i.item_id=c.item_id join vendor v on v.vendor_id=i.vendor_id join pengguna u on u.user_id=v.user_id
            where c.user_id=? order by i.vendor_id,c.item_id for update of i
            """, actorId);
        if (rows.isEmpty()) throw conflict("Keranjang masih kosong");
        for (var r : rows) {
            String name = (String) r.get("nama_barang");
            int qty = ((Number) r.get("jumlah")).intValue(), stock = ((Number) r.get("stok_total")).intValue();
            if (!Boolean.TRUE.equals(r.get("ok"))) throw conflict(name + " sudah tidak tersedia. Hapus dari keranjang untuk melanjutkan");
            if (((BigDecimal) r.get("harga_sewa_per_hari")).signum() <= 0) throw conflict(name + " belum punya harga sewa. Hapus dari keranjang atau minta vendor mengisinya");
            if (((BigDecimal) r.get("minimal_dp")).signum() <= 0) throw conflict(name + " belum punya deposit jaminan. Hapus dari keranjang atau minta vendor mengisinya");
            long booked = jdbc.queryForObject("""
                select coalesce(max(dipakai),0) from (
                  select sum(d.jumlah_sewa) as dipakai
                  from generate_series(?::date, ?::date - 1, interval '1 day') as hari(tanggal)
                  join pemesanan p on p.tanggal_mulai_sewa<=hari.tanggal::date and p.tanggal_selesai_sewa>hari.tanggal::date
                    and p.status_pesanan not in ('selesai','dibatalkan')
                  join detail_item d on d.order_id=p.order_id and d.item_id=?
                  group by hari.tanggal) per_hari
                """, Long.class, in.startDate(), in.endDate(), r.get("item_id"));
            if (booked + qty > stock) throw conflict("Stok " + name + " pada tanggal tersebut tinggal " + Math.max(0, stock - booked) + " unit");
        }

        var byVendor = rows.stream().collect(Collectors.groupingBy(r -> ((Number) r.get("vendor_id")).longValue(), LinkedHashMap::new, Collectors.toList()));
        var placed = new ArrayList<Placed>();
        for (var group : byVendor.entrySet()) {
            BigDecimal total = BigDecimal.ZERO, deposit = BigDecimal.ZERO;
            for (var r : group.getValue()) {
                BigDecimal qty = BigDecimal.valueOf(((Number) r.get("jumlah")).longValue());
                total = total.add(((BigDecimal) r.get("harga_sewa_per_hari")).multiply(qty).multiply(BigDecimal.valueOf(days)));
                deposit = deposit.add(((BigDecimal) r.get("minimal_dp")).multiply(qty));
            }
            deposit = deposit.min(total.multiply(DEPOSIT_CAP).setScale(0, RoundingMode.CEILING));
            long orderId = 0; String code = null;
            for (int attempt = 0; attempt < 5 && orderId == 0; attempt++) {
                code = "VND-" + DateTimeFormatter.ofPattern("yyMMdd").format(today) + "-" + (1000 + RANDOM.nextInt(9000));
                var ids = jdbc.queryForList("""
                    insert into pemesanan(user_id,vendor_id,kode_pemesanan,tanggal_mulai_sewa,tanggal_selesai_sewa,lokasi_acara,total_biaya_sewa,total_dp,
                      nama_acara,kategori_acara,nama_venue,nama_pic,whatsapp_pic,catatan_akses)
                    values (?,?,?,?,?,?,?,?,?,?,?,?,?,?) on conflict(kode_pemesanan) do nothing returning order_id
                    """, Long.class, actorId, group.getKey(), code, in.startDate(), in.endDate(), in.address(), total, deposit,
                    in.eventName(), in.category(), in.venue(), in.picName(), in.picPhone(), in.note());
                if (!ids.isEmpty()) orderId = ids.getFirst();
            }
            if (orderId == 0) throw conflict("Gagal membuat kode pesanan. Coba lagi");
            for (var r : group.getValue()) {
                BigDecimal price = (BigDecimal) r.get("harga_sewa_per_hari");
                int qty = ((Number) r.get("jumlah")).intValue();
                jdbc.update("insert into detail_item(order_id,item_id,jumlah_sewa,harga_saat_sewa,subtotal) values (?,?,?,?,?)",
                    orderId, r.get("item_id"), qty, price, price.multiply(BigDecimal.valueOf(qty * days)));
            }
            jdbc.update("insert into riwayat_status_pesanan(order_id,status_sebelumnya,status_baru,diubah_oleh,catatan) values (?,null,'menunggu_pembayaran',?,'Pesanan dibuat dari keranjang')",
                orderId, actorId);
            placed.add(new Placed(orderId, code, (String) group.getValue().getFirst().get("nama_vendor"), total, deposit));
        }
        jdbc.update("delete from keranjang where user_id=?", actorId);
        return new PlacedOrders(placed);
    }

    private void customer(Long id, boolean lock) {
        if (lock) { CustomerGuard.lock(jdbc, id); return; }
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
        var rows = jdbc.queryForList("select role,status_akun from pengguna where user_id=?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid. Silakan masuk kembali");
        if (!"customer".equals(rows.getFirst().get("role")) || !Pengguna.AKTIF.equals(rows.getFirst().get("status_akun")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Keranjang hanya untuk akun customer aktif");
    }
    private static ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
    private static ResponseStatusException conflict(String m) { return new ResponseStatusException(HttpStatus.CONFLICT, m); }
}
