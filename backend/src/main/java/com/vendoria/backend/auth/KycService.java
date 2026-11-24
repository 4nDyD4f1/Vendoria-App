package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.KycDtos.*;

@Service
class KycService {
	private static final String SELECT = "select k.*,p.nama,p.email,p.no_telp,p.role,a.nama as pemeriksa "
			+ "from kyc_verifikasi k join pengguna p on p.user_id=k.user_id "
			+ "left join pengguna a on a.user_id=k.diverifikasi_oleh ";
	private final JdbcTemplate jdbc;
	private final KycDocumentStore documents;

	KycService(JdbcTemplate jdbc, KycDocumentStore documents) { this.jdbc = jdbc; this.documents = documents; }

	@Transactional(readOnly = true)
	Mine mine(Long actorId) {
		Actor actor = actor(actorId, false);
		List<Row> rows = jdbc.query(SELECT + "where k.user_id=? order by k.diajukan_pada desc,k.kyc_id desc limit 1", this::row, actorId);
		return new Mine(actor.statusVerifikasi, rows.isEmpty() ? null : detail(rows.getFirst()));
	}

	@Transactional
	Mine submit(Long actorId, Identity identity, MultipartFile ktp, MultipartFile selfie) {
		Actor actor = actor(actorId, true); // satu pengajuan berjalan per pengguna, termasuk request bersamaan
		if (!Set.of("customer", "vendor").contains(actor.role)) throw denied();
		validate(identity);
		if ("terverifikasi".equals(actor.statusVerifikasi)) throw conflict("Identitas akun sudah terverifikasi");
		Long pending = jdbc.queryForObject("select count(*) from kyc_verifikasi where user_id=? and status='menunggu'", Long.class, actorId);
		if (pending != null && pending > 0) throw conflict("Pengajuan Anda masih menunggu pemeriksaan");
		String locator = documents.save(identity, ktp, selfie);
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) documents.remove(locator); }
		});
		jdbc.queryForObject("insert into kyc_verifikasi(user_id,jenis_dokumen,dokumen_url,status) "
				+ "values (?,'KTP dan Swafoto',?,'menunggu') returning kyc_id", Long.class, actorId, locator);
		jdbc.update("update pengguna set status_verifikasi='menunggu',updated_at=now() where user_id=?", actorId);
		VendorBusinessPolicy.sync(jdbc, actorId);
		return mine(actorId);
	}

	@Transactional(readOnly = true)
	Listing list(Long actorId, String status, String search, int page, int size) {
		admin(actorId);
		if (!Set.of("semua", "menunggu", "terverifikasi", "ditolak").contains(status) || page < 1 || page > 1_000_000 || size < 1 || size > 100)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filter atau halaman tidak valid");
		String term = search == null ? "" : search.trim();
		if (term.length() > 120) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pencarian maksimal 120 karakter");
		List<Object> args = new ArrayList<>();
		String where = "where 1=1 ";
		if (!"semua".equals(status)) { where += "and k.status=? "; args.add(status); }
		if (!term.isBlank()) {
			where += "and (lower(p.nama) like ? escape '!' or lower(p.email) like ? escape '!' or cast(k.kyc_id as text)=?) ";
			String pattern = "%" + term.toLowerCase(java.util.Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
			args.add(pattern); args.add(pattern); args.add(term.replaceFirst("(?i)^KYC-", ""));
		}
		Long total = jdbc.queryForObject("select count(*) from kyc_verifikasi k join pengguna p on p.user_id=k.user_id " + where, Long.class, args.toArray());
		args.add(size); args.add((page - 1) * size);
		List<Summary> rows = jdbc.query(SELECT + where + "order by k.diajukan_pada desc,k.kyc_id desc limit ? offset ?", (rs, index) -> summary(rs), args.toArray());
		Map<String, Long> counts = new LinkedHashMap<>();
		for (String state : List.of("menunggu", "terverifikasi", "ditolak")) counts.put(state, 0L);
		jdbc.query("select status,count(*) as total from kyc_verifikasi group by status", rs -> {
			counts.put(rs.getString("status"), rs.getLong("total"));
		});
		counts.put("semua", counts.values().stream().mapToLong(Long::longValue).sum());
		return new Listing(rows, total == null ? 0 : total, page, size, counts);
	}

	@Transactional(readOnly = true)
	Detail get(Long actorId, Long id) {
		Actor actor = actor(actorId, false);
		Row row = find(id, false);
		if (!"admin".equals(actor.role) && !actorId.equals(row.summary.userId())) throw denied();
		return detail(row);
	}

	@Transactional(readOnly = true)
	byte[] document(Long actorId, Long id, String kind) {
		Actor actor = actor(actorId, false);
		Row row = find(id, false);
		if (!"admin".equals(actor.role) && !actorId.equals(row.summary.userId())) throw denied();
		return documents.document(row.locator, kind);
	}

	@Transactional
	Detail decide(Long actorId, Long id, Decision decision) {
		admin(actorId);
		Long owner = find(id, false).summary.userId();
		actor(owner, true); // urutan kunci sama dengan submit; mencegah balapan pengajuan ulang/keputusan
		Row row = find(id, true);
		if (!"menunggu".equals(row.summary.status())) throw conflict("Pengajuan ini sudah diputuskan. Muat ulang daftar");
		Long latest = jdbc.queryForObject("select kyc_id from kyc_verifikasi where user_id=? order by diajukan_pada desc,kyc_id desc limit 1", Long.class, owner);
		if (!id.equals(latest)) throw conflict("Hanya pengajuan terbaru yang dapat diputuskan");
		String note = decision.catatanAdmin() == null ? null : decision.catatanAdmin().trim();
		if ("ditolak".equals(decision.status()) && (note == null || note.isBlank()))
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Alasan penolakan wajib diisi");
		if ("terverifikasi".equals(decision.status())) {
			if (!documents.available(row.locator)) throw conflict("Dokumen pengajuan tidak lengkap atau tidak tersedia");
			validate(documents.identity(row.locator));
			// Keaslian kedua file juga diperiksa sebelum persetujuan.
			documents.document(row.locator, "ktp"); documents.document(row.locator, "selfie");
		}
		jdbc.update("update kyc_verifikasi set status=?,catatan_admin=?,diverifikasi_oleh=?,diputuskan_pada=now() where kyc_id=?",
				decision.status(), note == null || note.isBlank() ? null : note, actorId, id);
		jdbc.update("update pengguna set status_verifikasi=?,updated_at=now() where user_id=?", decision.status(), owner);
		VendorBusinessPolicy.sync(jdbc, owner);
		return detail(find(id, false));
	}

	private void validate(Identity identity) {
		if (!identity.consent()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Persetujuan pemrosesan data wajib diberikan");
		try {
			LocalDate birth = LocalDate.parse(identity.tanggalLahir());
			if (birth.isAfter(LocalDate.now(ZoneId.of("Asia/Jakarta"))) || birth.isBefore(LocalDate.of(1900, 1, 1))) throw new IllegalArgumentException();
		} catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tanggal lahir tidak valid");
		}
	}

	private Detail detail(Row row) {
		boolean available = documents.available(row.locator);
		return new Detail(row.summary, available ? documents.identity(row.locator) : null, row.note, row.reviewer, available,
				available ? "/api/kyc/" + row.summary.kycId() + "/documents/ktp" : null,
				available ? "/api/kyc/" + row.summary.kycId() + "/documents/selfie" : null);
	}
	private Row find(Long id, boolean lock) {
		List<Row> rows = jdbc.query(SELECT + "where k.kyc_id=?" + (lock ? " for update of k" : ""), this::row, id);
		if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pengajuan KYC tidak ditemukan");
		return rows.getFirst();
	}
	private Row row(ResultSet rs, int index) throws SQLException {
		return new Row(summary(rs), rs.getString("dokumen_url"), rs.getString("catatan_admin"), rs.getString("pemeriksa"));
	}
	private Summary summary(ResultSet rs) throws SQLException {
		Timestamp decided = rs.getTimestamp("diputuskan_pada");
		return new Summary(rs.getLong("kyc_id"), rs.getLong("user_id"), rs.getString("nama"), rs.getString("email"),
				rs.getString("no_telp"), rs.getString("role"), rs.getString("status"), rs.getTimestamp("diajukan_pada").toInstant(),
				decided == null ? null : decided.toInstant());
	}
	private Actor actor(Long id, boolean lock) {
		if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
		List<Actor> actors = jdbc.query("select role,status_akun,status_verifikasi from pengguna where user_id=?" + (lock ? " for update" : ""),
				(rs, index) -> new Actor(rs.getString("role"), rs.getString("status_akun"), rs.getString("status_verifikasi")), id);
		if (actors.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid");
		Actor actor = actors.getFirst();
		if (!"Aktif".equals(actor.statusAkun)) throw denied();
		return actor;
	}
	private void admin(Long id) { if (!"admin".equals(actor(id, false).role)) throw denied(); }
	private static ResponseStatusException denied() { return new ResponseStatusException(HttpStatus.FORBIDDEN, "Anda tidak memiliki akses"); }
	private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
	private record Actor(String role, String statusAkun, String statusVerifikasi) {}
	private record Row(Summary summary, String locator, String note, String reviewer) {}
}
