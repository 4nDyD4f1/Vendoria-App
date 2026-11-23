package com.vendoria.backend.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.VendorSettingsDtos.*;

@Service
class VendorSettingsService {
	private final JdbcTemplate jdbc;

	VendorSettingsService(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Transactional(readOnly = true)
	SettingsResponse get(Long actorId) {
		OwnerRow owner = actor(actorId, false);
		return new SettingsResponse(owner.profile, business(actorId));
	}

	@Transactional
	SettingsResponse updateOwner(Long actorId, OwnerRequest req) {
		OwnerRow current = actor(actorId, true);
		String currentEmail = AuthService.normalize(current.profile.email());
		if (!currentEmail.equals(req.email())) {
			if (current.profile.twoFactorEmail()) {
				throw bad("Nonaktifkan autentikasi 2 langkah terlebih dahulu sebelum mengubah email");
			}
			if (current.profile.akunGoogle()) {
				throw bad("Email dikelola oleh akun Google dan tidak dapat diubah");
			}
		}
		if (Boolean.TRUE.equals(jdbc.queryForObject(
				"select exists(select 1 from pengguna where lower(email)=? and user_id<>?)",
				Boolean.class, req.email(), actorId))) {
			throw duplicateEmail();
		}
		try {
			int updated = jdbc.update("""
					update pengguna set nama=?, email=?, no_telp=?, updated_at=now()
					where user_id=? and status_akun='Aktif'
					  and (google_sub is null or lower(email)=?)
					  and (two_factor_email=false or lower(email)=?)
					""", req.nama(), req.email(), req.noTelp(), actorId, req.email(), req.email());
			if (updated != 1) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Profil berubah. Muat ulang halaman dan coba lagi");
			}
		} catch (DataIntegrityViolationException e) {
			throw duplicateEmail();
		}

		if (req.namaVendor() != null) {
			jdbc.update("""
					insert into vendor(user_id, nama_vendor) values (?, ?)
					on conflict(user_id) do update set nama_vendor = excluded.nama_vendor
					""", actorId, req.namaVendor());
		}

		return new SettingsResponse(actor(actorId, false).profile, business(actorId));
	}

	@Transactional
	SettingsResponse updateBusiness(Long actorId, BusinessRequest req) {
		actor(actorId, true);
		jdbc.update("""
				insert into vendor(user_id, nama_vendor, kota, alamat, deskripsi)
				values (?, ?, ?, ?, ?)
				on conflict(user_id) do update set
				  nama_vendor = excluded.nama_vendor,
				  kota = excluded.kota,
				  alamat = excluded.alamat,
				  deskripsi = excluded.deskripsi
				""", actorId, req.namaVendor(), req.kota(), req.alamat(), req.deskripsi());
		return new SettingsResponse(actor(actorId, false).profile, business(actorId));
	}

	private OwnerRow actor(Long actorId, boolean lock) {
		if (actorId == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
		}
		List<OwnerRow> rows = jdbc.query("""
				select user_id, nama, email, no_telp, role, status_akun, status_verifikasi,
				       foto_profil, google_sub, two_factor_email, created_at
				from pengguna
				where user_id=?
				""" + (lock ? " for update" : ""), this::ownerRow, actorId);
		if (rows.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid. Silakan masuk kembali");
		}
		OwnerRow row = rows.getFirst();
		if (!"vendor".equals(row.role) || !Pengguna.AKTIF.equals(row.statusAkun)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN,
					"Hanya akun vendor aktif yang dapat mengelola pengaturan vendor");
		}
		return row;
	}

	private BusinessProfile business(Long actorId) {
		List<BusinessProfile> rows = jdbc.query("""
				select vendor_id, nama_vendor, kota, alamat, deskripsi, rating, status_aktif, created_at
				from vendor
				where user_id=?
				""", (rs, idx) -> new BusinessProfile(
				rs.getLong("vendor_id"),
				rs.getString("nama_vendor"),
				rs.getString("kota"),
				rs.getString("alamat"),
				rs.getString("deskripsi"),
				rs.getBigDecimal("rating"),
				rs.getBoolean("status_aktif"),
				instant(rs.getTimestamp("created_at"))), actorId);
		return rows.isEmpty() ? null : rows.getFirst();
	}

	private OwnerRow ownerRow(ResultSet rs, int idx) throws SQLException {
		boolean google = rs.getString("google_sub") != null;
		boolean twoFactor = rs.getBoolean("two_factor_email");
		OwnerProfile profile = new OwnerProfile(
				rs.getLong("user_id"),
				rs.getString("nama"),
				rs.getString("email"),
				rs.getString("no_telp"),
				rs.getString("status_verifikasi"),
				rs.getString("foto_profil"),
				google,
				twoFactor,
				google || twoFactor,
				instant(rs.getTimestamp("created_at")));
		return new OwnerRow(profile, rs.getString("role"), rs.getString("status_akun"));
	}

	private static Instant instant(Timestamp ts) {
		return ts == null ? null : ts.toInstant();
	}

	private static ResponseStatusException bad(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

	private static ResponseStatusException duplicateEmail() {
		return new ResponseStatusException(HttpStatus.CONFLICT, "Email sudah terdaftar");
	}

	private record OwnerRow(OwnerProfile profile, String role, String statusAkun) {}
}
