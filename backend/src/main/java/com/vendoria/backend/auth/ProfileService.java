package com.vendoria.backend.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.vendoria.backend.auth.AuthDtos.UserResponse;
import com.vendoria.backend.auth.ProfileDtos.ProfileRequest;

@Service
class ProfileService {

	private final PenggunaRepository repo;

	ProfileService(PenggunaRepository repo) {
		this.repo = repo;
	}

	@Transactional(readOnly = true)
	UserResponse get(Long userId) {
		return UserResponse.from(current(userId));
	}

	@Transactional
	UserResponse update(Long userId, ProfileRequest req) {
		Pengguna user = current(userId);
		if (user.isTwoFactorEmail() && !AuthService.normalize(user.getEmail()).equals(req.email())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Nonaktifkan autentikasi 2 langkah terlebih dahulu sebelum mengubah email");
		}
		if (user.getGoogleSub() != null && !AuthService.normalize(user.getEmail()).equals(req.email())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email dikelola oleh akun Google dan tidak dapat diubah");
		}
		Pengguna other = repo.findByEmail(req.email()).orElse(null);
		if (other != null && !other.getUserId().equals(userId)) {
			throw emailTerpakai();
		}
		try {
			// Hanya kolom profil dan updated_at; identitas akun selalu diambil dari sesi.
			if (repo.updateProfile(userId, req.nama(), req.email(), req.noTelp()) != 1) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Profil berubah. Muat ulang halaman dan coba lagi");
			}
		} catch (DataIntegrityViolationException e) {
			// Indeks unik tetap melindungi email saat dua permintaan berjalan bersamaan.
			throw emailTerpakai();
		}
		return UserResponse.from(current(userId));
	}

	private Pengguna current(Long userId) {
		if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Belum login");
		Pengguna user = repo.findById(userId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi tidak valid"));
		if (!Pengguna.AKTIF.equals(user.getStatusAkun())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Akun dinonaktifkan. Hubungi administrator");
		}
		return user;
	}

	private static ResponseStatusException emailTerpakai() {
		return new ResponseStatusException(HttpStatus.CONFLICT, "Email sudah terdaftar");
	}
}
