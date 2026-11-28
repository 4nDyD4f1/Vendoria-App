package com.vendoria.backend.auth;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.VendorOrdersDtos.*;

@Service
class VendorOrdersService {
	private static final List<String> STATUSES = List.of(
			"menunggu_pembayaran", "menunggu_konfirmasi", "dikonfirmasi",
			"berjalan", "dikembalikan", "selesai", "dibatalkan");

	private static final Set<String> VALID_FILTERS = Set.of(
			"semua", "menunggu_pembayaran", "menunggu_konfirmasi", "dikonfirmasi",
			"berjalan", "dikembalikan", "selesai", "dibatalkan");

	private static final Map<String, String> NEXT_STATUS = Map.of(
			"menunggu_konfirmasi", "dikonfirmasi",
			"dikonfirmasi", "berjalan",
			"berjalan", "dikembalikan",
			"dikembalikan", "selesai");

	private static final Map<String, String> NEXT_ACTION_LABELS = Map.of(
			"dikonfirmasi", "Konfirmasi Pesanan",
			"berjalan", "Mulai Masa Sewa",
			"dikembalikan", "Tandai Dikembalikan",
			"selesai", "Selesaikan Pesanan");

	private static final Set<String> CANCELLABLE_STATUSES = Set.of(
			"menunggu_pembayaran", "menunggu_konfirmasi", "dikonfirmasi");

	private static final String SELECT = """
			select p.order_id, p.kode_pemesanan, p.tanggal_mulai_sewa, p.tanggal_selesai_sewa,
			  p.lokasi_acara, p.total_biaya_sewa, p.total_dp, p.status_pesanan, p.tanggal_pemesanan,
			  c.nama as customer_name, c.email as customer_email, c.no_telp as customer_phone,
			  c.status_verifikasi as customer_verification,
			  coalesce((select string_agg(i.nama_barang || ' ×' || d.jumlah_sewa, ', ' order by d.order_detail_id)
			            from detail_item d join item i on i.item_id = d.item_id
			            where d.order_id = p.order_id), '') as equipment_summary,
			  coalesce((select sum(d.jumlah_sewa) from detail_item d where d.order_id = p.order_id), 0) as item_count,
			  exists(select 1 from klaim k where k.order_id = p.order_id and k.status in ('diajukan', 'ditinjau')) as has_open_claim,
			""" + "  " + OrderMoney.SETTLED + " as settled,\n  " + OrderMoney.OPEN_REPORT + " as report_open\n" + """
			from pemesanan p
			join pengguna c on c.user_id = p.user_id
			""";

	private final JdbcTemplate jdbc;
	private final HandoverEvidencePolicy handoverEvidence;

	VendorOrdersService(JdbcTemplate jdbc, HandoverEvidencePolicy handoverEvidence) {
		this.jdbc = jdbc;
		this.handoverEvidence = handoverEvidence;
	}

	@Transactional(readOnly = true)
	Listing list(Long actorId, String status, String search, int page, int size) {
		actor(actorId, false);
		if (!VALID_FILTERS.contains(status) || page < 1 || page > 1_000_000 || size < 1 || size > 100) {
			throw bad("Filter atau halaman tidak valid");
		}
		String term = search == null ? "" : search.trim();
		if (term.length() > 120) {
			throw bad("Pencarian maksimal 120 karakter");
		}

		VendorInfo vendor = vendor(actorId);
		Map<String, Long> counts = zeroCounts();
		if (vendor == null) {
			return new Listing(null, List.of(), 0, page, size, counts);
		}

		long vendorId = Long.parseLong(vendor.id());
		jdbc.query("select status_pesanan, count(*) as total from pemesanan where vendor_id=? group by status_pesanan",
				rs -> { counts.put(rs.getString("status_pesanan"), rs.getLong("total")); },
				vendorId);
		counts.put("semua", STATUSES.stream().mapToLong(s -> counts.getOrDefault(s, 0L)).sum());

		List<Object> args = new ArrayList<>();
		StringBuilder where = new StringBuilder("where p.vendor_id=? ");
		args.add(vendorId);
		if (!"semua".equals(status)) {
			where.append("and p.status_pesanan=? ");
			args.add(status);
		}
		if (!term.isBlank()) {
			String normalized = term.toLowerCase(Locale.ROOT);
			String escaped = normalized.replace("!", "!!").replace("%", "!%").replace("_", "!_");
			String pattern = "%" + escaped + "%";
			String codeQuery = normalized.startsWith("#") ? escaped.substring(1) : escaped;
			String idQuery = term.startsWith("#") ? term.substring(1) : term;
			where.append("""
					and (
					  lower(p.kode_pemesanan) like ? escape '!'
					  or lower(c.nama) like ? escape '!'
					  or lower(c.email) like ? escape '!'
					  or lower(coalesce(p.lokasi_acara, '')) like ? escape '!'
					  or cast(p.order_id as text) = ?
					  or exists (
					    select 1 from detail_item d join item i on i.item_id = d.item_id
					    where d.order_id = p.order_id and lower(i.nama_barang) like ? escape '!'
					  )
					)
					""");
			args.add("%" + codeQuery + "%");
			args.add(pattern);
			args.add(pattern);
			args.add(pattern);
			args.add(idQuery);
			args.add(pattern);
		}

		Long total = jdbc.queryForObject(
				"select count(*) from pemesanan p join pengguna c on c.user_id=p.user_id " + where,
				Long.class, args.toArray());
		args.add(size);
		args.add((page - 1) * size);
		List<Summary> items = jdbc.query(
				SELECT + where + "order by p.tanggal_pemesanan desc, p.order_id desc limit ? offset ?",
				(rs, idx) -> summary(rs), args.toArray());
		return new Listing(vendor, items, total == null ? 0 : total, page, size, counts);
	}

	@Transactional
	Listing setup(Long actorId, Setup input) {
		actor(actorId, true);
		jdbc.update("insert into vendor(user_id, nama_vendor) values (?, ?) on conflict(user_id) do nothing",
				actorId, input.name());
		return list(actorId, "semua", "", 1, 10);
	}

	@Transactional(readOnly = true)
	Detail get(Long actorId, Long orderId) {
		actor(actorId, false);
		long vendorId = owner(actorId);
		return detail(vendorId, orderId);
	}

	@Transactional
	Detail action(Long actorId, Long orderId, ActionRequest request) {
		actor(actorId, true);
		long vendorId = owner(actorId);

		List<Map<String, Object>> locked = jdbc.queryForList(
				"select order_id, status_pesanan from pemesanan where order_id=? and vendor_id=? for update",
				orderId, vendorId);
		if (locked.isEmpty()) {
			throw missing();
		}
		String currentStatus = String.valueOf(locked.getFirst().get("status_pesanan"));
		if (request.expectedStatus() != null && !request.expectedStatus().equals(currentStatus)) {
			throw conflict("Status pesanan sudah berubah. Muat ulang data pesanan");
		}

		if (Boolean.TRUE.equals(jdbc.queryForObject("select " + OrderMoney.OPEN_REPORT + " from pemesanan p where p.order_id=?", Boolean.class, orderId))) {
			throw conflict("Pesanan sedang dilaporkan pelanggan dan menunggu penyelesaian");
		}

		String nextStatus;
		if ("batalkan".equals(request.action())) {
			if (!CANCELLABLE_STATUSES.contains(currentStatus)) {
				throw conflict("Pesanan dengan status saat ini tidak dapat dibatalkan oleh vendor");
			}
			if ("dikonfirmasi".equals(currentStatus) && !OrderMoney.awaitingSettlement(jdbc, orderId)) {
				throw conflict("Pesanan yang sudah dilunasi customer tidak dapat dibatalkan");
			}
			nextStatus = "dibatalkan";
		} else {
			if ("menunggu_pembayaran".equals(currentStatus)) {
				throw conflict("Pesanan masih menunggu pembayaran dari pelanggan dan belum dapat diproses");
			}
			nextStatus = NEXT_STATUS.get(currentStatus);
			if (nextStatus == null) {
				throw conflict("Pesanan dengan status saat ini tidak dapat diproses lebih lanjut");
			}
			if ("dikembalikan".equals(currentStatus)) {
				boolean hasOpenClaim = Boolean.TRUE.equals(jdbc.queryForObject(
						"select exists(select 1 from klaim where order_id=? and status in ('diajukan', 'ditinjau'))",
						Boolean.class, orderId));
				if (hasOpenClaim) {
					throw conflict("Pesanan masih memiliki klaim aktif yang menunggu keputusan admin");
				}
			}
		}

		// All entry points use the same guard; /orders/action cannot bypass the inspection workflow.
		if ("berjalan".equals(nextStatus)) {
			OrderMoney.requireSettled(jdbc, orderId);
			handoverEvidence.requireComplete(orderId, "serah_terima");
		}
		if ("dikembalikan".equals(nextStatus) || "selesai".equals(nextStatus)) handoverEvidence.requireComplete(orderId, "pengembalian");

		jdbc.update("update pemesanan set status_pesanan=? where order_id=? and vendor_id=?",
				nextStatus, orderId, vendorId);
		String note = request.catatan() == null || request.catatan().isBlank() ? null : request.catatan();
		jdbc.update("""
				insert into riwayat_status_pesanan(order_id, status_sebelumnya, status_baru, diubah_oleh, catatan)
				values (?, ?, ?, ?, ?)
				""", orderId, currentStatus, nextStatus, actorId, note);

		if ("dibatalkan".equals(nextStatus)) {
			OrderMoney.refundDeposit(jdbc, orderId, "Pesanan dibatalkan, deposit dikembalikan");
		} else if ("selesai".equals(nextStatus) && !Boolean.TRUE.equals(jdbc.queryForObject(
				"select " + OrderMoney.FORFEITED + " from pemesanan p where p.order_id=?", Boolean.class, orderId))) {
			OrderMoney.refundDeposit(jdbc, orderId, "Pengembalian deposit jaminan");
		}

		return detail(vendorId, orderId);
	}

	private Detail detail(long vendorId, Long orderId) {
		List<DetailHeader> rows = jdbc.query(
				SELECT + "where p.order_id=? and p.vendor_id=?",
				(rs, idx) -> new DetailHeader(summary(rs), rs.getString("customer_verification")),
				orderId, vendorId);
		if (rows.isEmpty()) {
			throw missing();
		}
		DetailHeader header = rows.getFirst();

		List<OrderItem> items = jdbc.query("""
				select d.order_detail_id, d.item_id, i.nama_barang, k.nama_kategori,
				       d.jumlah_sewa, d.harga_saat_sewa, d.subtotal
				from detail_item d
				join item i on i.item_id = d.item_id
				join kategori k on k.kategori_id = i.kategori_id
				where d.order_id = ?
				order by d.order_detail_id
				""", (rs, idx) -> new OrderItem(
				rs.getLong("order_detail_id"),
				rs.getLong("item_id"),
				rs.getString("nama_barang"),
				rs.getString("nama_kategori"),
				rs.getInt("jumlah_sewa"),
				rs.getBigDecimal("harga_saat_sewa"),
				rs.getBigDecimal("subtotal")), orderId);

		List<PaymentRecord> payments = jdbc.query("""
				select pembayaran_id, jenis, metode, jumlah, status, dibayar_pada, diverifikasi_pada, dibuat_pada
				from pembayaran
				where order_id = ?
				order by dibuat_pada desc, pembayaran_id desc
				""", (rs, idx) -> new PaymentRecord(
				rs.getLong("pembayaran_id"),
				rs.getString("jenis"),
				rs.getString("metode"),
				rs.getBigDecimal("jumlah"),
				rs.getString("status"),
				instant(rs.getTimestamp("dibayar_pada")),
				instant(rs.getTimestamp("diverifikasi_pada")),
				instant(rs.getTimestamp("dibuat_pada"))), orderId);

		BigDecimal verifiedPaymentTotal = payments.stream()
				.filter(p -> "terverifikasi".equals(p.status()))
				.map(PaymentRecord::jumlah)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		List<ClaimRecord> claims = jdbc.query("""
				select klaim_id, alasan, status, diajukan_pada, diputuskan_pada
				from klaim
				where order_id = ?
				order by diajukan_pada desc, klaim_id desc
				""", (rs, idx) -> new ClaimRecord(
				rs.getLong("klaim_id"),
				rs.getString("alasan"),
				rs.getString("status"),
				instant(rs.getTimestamp("diajukan_pada")),
				instant(rs.getTimestamp("diputuskan_pada"))), orderId);

		List<StatusHistory> history = jdbc.query("""
				select r.riwayat_id, r.status_sebelumnya, r.status_baru, u.nama as diubah_oleh_nama,
				       r.catatan, r.diubah_pada
				from riwayat_status_pesanan r
				left join pengguna u on u.user_id = r.diubah_oleh
				where r.order_id = ?
				order by r.diubah_pada desc, r.riwayat_id desc
				""", (rs, idx) -> new StatusHistory(
				rs.getLong("riwayat_id"),
				rs.getString("status_sebelumnya"),
				rs.getString("status_baru"),
				rs.getString("diubah_oleh_nama"),
				rs.getString("catatan"),
				instant(rs.getTimestamp("diubah_pada"))), orderId);

		return new Detail(header.summary, header.customerVerification, verifiedPaymentTotal,
				items, payments, claims, history);
	}

	private Summary summary(ResultSet rs) throws SQLException {
		String status = rs.getString("status_pesanan");
		boolean hasOpenClaim = rs.getBoolean("has_open_claim");
		String candidateNext = NEXT_STATUS.get(status);
		boolean blockedByClaim = "dikembalikan".equals(status) && hasOpenClaim;
		boolean awaitingSettlement = "dikonfirmasi".equals(status) && !rs.getBoolean("settled");
		boolean reportOpen = rs.getBoolean("report_open");
		boolean canProcess = candidateNext != null && !blockedByClaim && !awaitingSettlement && !reportOpen;
		String nextStatus = canProcess ? candidateNext : null;
		String nextLabel = nextStatus == null ? null : NEXT_ACTION_LABELS.get(nextStatus);
		boolean canCancel = CANCELLABLE_STATUSES.contains(status) && !("dikonfirmasi".equals(status) && !awaitingSettlement) && !reportOpen;

		Date start = rs.getDate("tanggal_mulai_sewa");
		Date end = rs.getDate("tanggal_selesai_sewa");
		return new Summary(
				rs.getLong("order_id"),
				rs.getString("kode_pemesanan"),
				rs.getString("customer_name"),
				rs.getString("customer_email"),
				rs.getString("customer_phone"),
				rs.getString("equipment_summary"),
				rs.getInt("item_count"),
				start == null ? null : start.toLocalDate(),
				end == null ? null : end.toLocalDate(),
				rs.getString("lokasi_acara"),
				rs.getBigDecimal("total_biaya_sewa"),
				rs.getBigDecimal("total_dp"),
				status,
				instant(rs.getTimestamp("tanggal_pemesanan")),
				hasOpenClaim,
				canProcess,
				canCancel,
				nextStatus,
				nextLabel,
				awaitingSettlement,
				reportOpen);
	}

	private static Map<String, Long> zeroCounts() {
		Map<String, Long> counts = new LinkedHashMap<>();
		counts.put("semua", 0L);
		for (String status : STATUSES) {
			counts.put(status, 0L);
		}
		return counts;
	}

	private void actor(Long id, boolean lock) {
		VendorBusinessPolicy.requireReady(jdbc, id, lock);
	}

	private VendorInfo vendor(Long actorId) {
		var rows = jdbc.query(
				"select vendor_id, nama_vendor, status_aktif from vendor where user_id=?",
				(rs, n) -> new VendorInfo(rs.getString(1), rs.getString(2), rs.getBoolean(3)), actorId);
		return rows.isEmpty() ? null : rows.getFirst();
	}

	private long owner(Long actorId) {
		VendorInfo vendor = vendor(actorId);
		if (vendor == null) {
			throw conflict("Lengkapi nama bisnis sebelum mengelola pesanan");
		}
		return Long.parseLong(vendor.id());
	}

	private static Instant instant(Timestamp ts) {
		return ts == null ? null : ts.toInstant();
	}

	private static ResponseStatusException bad(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

	private static ResponseStatusException missing() {
		return new ResponseStatusException(HttpStatus.NOT_FOUND, "Pesanan tidak ditemukan");
	}

	private static ResponseStatusException conflict(String message) {
		return new ResponseStatusException(HttpStatus.CONFLICT, message);
	}

	private record DetailHeader(Summary summary, String customerVerification) {}
}
