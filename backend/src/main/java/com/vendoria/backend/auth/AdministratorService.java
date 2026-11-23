package com.vendoria.backend.auth;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AuthDtos.AdministratorRequest;
import com.vendoria.backend.auth.AuthDtos.AdministratorResponse;

/**
 * Kelola akun administrator (role = 'admin'). Semua administrator aktif setara (akses penuh), dan endpoint ini tak bisa dipakai
 * pada akun non-admin. Status admin dicek ulang dari DB di setiap request (bukan dari sesi), jadi admin yang dinonaktifkan/dihapus
 * langsung kehilangan akses.
 */
@Service
class AdministratorService {

	private final PenggunaRepository repo;
	private final PasswordEncoder encoder = new BCryptPasswordEncoder();

	AdministratorService(PenggunaRepository repo) {
		this.repo = repo;
	}

	List<AdministratorResponse> daftar(Long aktorId) {
		cek(aktorId);
		return repo.findByRoleOrderByUserIdDesc("admin").stream().map(AdministratorResponse::from).toList();
	}

	AdministratorResponse tambah(Long aktorId, AdministratorRequest req) {
		cek(aktorId);
		if (req.password() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kata sandi wajib diisi (minimal 8 karakter)");
		}
		String email = AuthService.normalize(req.email());
		if (repo.findByEmail(email).isPresent()) {
			throw emailTerpakai();
		}
		Pengguna p = Pengguna.admin(req.nama().trim(), email, encoder.encode(req.password()), req.status(), catatan(req));
		try {
			return AdministratorResponse.from(repo.saveAndFlush(p));
		} catch (DataIntegrityViolationException e) { // dua permintaan bersamaan dengan email sama
			throw emailTerpakai();
		}
	}

	AdministratorResponse ubah(Long aktorId, Long id, AdministratorRequest req) {
		cek(aktorId);
		Pengguna target = cariAdmin(id);
		// mencegah admin menonaktifkan dirinya sendiri (bisa mengunci semua admin)
		if (id.equals(aktorId) && !req.status().equals(target.getStatusAkun())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status akun sendiri tidak dapat diubah");
		}
		String email = AuthService.normalize(req.email());
		Pengguna dipakai = repo.findByEmail(email).orElse(null);
		if (dipakai != null && !dipakai.getUserId().equals(id)) {
			throw emailTerpakai();
		}
		try {
			repo.updateAdmin(id, req.nama().trim(), email, req.status(), catatan(req));
		} catch (DataIntegrityViolationException e) {
			throw emailTerpakai();
		}
		if (req.password() != null) {
			repo.updatePassword(id, encoder.encode(req.password()));
		}
		return AdministratorResponse.from(cariAdmin(id)); // baca ulang: updateAdmin lewat query native
	}

	void hapus(Long aktorId, Long id) {
		cek(aktorId);
		cariAdmin(id);
		if (id.equals(aktorId)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Akun sendiri tidak dapat dihapus");
		}
		try {
			repo.deleteById(id);
		} catch (DataIntegrityViolationException e) { // FK tabel lain menghalangi (saat ini semuanya ON DELETE SET NULL, jadi jarang)
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"Administrator masih terkait data lain dan tidak dapat dihapus. Ubah statusnya menjadi Nonaktif");
		}
	}

	private void cek(Long aktorId) {
		Pengguna aktor = aktorId == null ? null : repo.findById(aktorId).orElse(null);
		if (aktor == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
		}
		if (!"admin".equals(aktor.getRole()) || !Pengguna.AKTIF.equals(aktor.getStatusAkun())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hanya untuk administrator");
		}
	}

	private Pengguna cariAdmin(Long id) {
		return repo.findById(id).filter(p -> "admin".equals(p.getRole()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Administrator tidak ditemukan"));
	}

	private static String catatan(AdministratorRequest req) {
		return req.catatan() == null || req.catatan().isBlank() ? null : req.catatan().trim();
	}

	private static ResponseStatusException emailTerpakai() {
		return new ResponseStatusException(HttpStatus.CONFLICT, "Email sudah terdaftar");
	}
}
