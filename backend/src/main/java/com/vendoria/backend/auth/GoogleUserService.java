package com.vendoria.backend.auth;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Mencocokkan akun Google dengan baris di tabel pengguna.
 * Identitas utama = "sub" Google (stabil, tidak berubah walau email berganti), bukan email.
 */
@Service
class GoogleUserService {

	/** code dipakai frontend untuk memilih pesan (query ?error=<code> di halaman login). */
	static class GoogleLoginException extends RuntimeException {
		final String code;

		GoogleLoginException(String code) {
			super(code, null, false, false);
			this.code = code;
		}
	}

	private final PenggunaRepository repo;
	private final PasswordEncoder encoder = new BCryptPasswordEncoder();
	private final SecureRandom random = new SecureRandom();

	GoogleUserService(PenggunaRepository repo) {
		this.repo = repo;
	}

	Pengguna findOrCreate(String sub, String email, boolean emailVerified, String name) {
		// 1. Sudah pernah login dengan Google: cukup dari sub.
		Optional<Pengguna> bySub = repo.findByGoogleSub(sub);
		if (bySub.isPresent()) {
			return bySub.get();
		}

		// 2. Akun baru/tautan baru hanya boleh dibuat dari email yang sudah diverifikasi Google; tanpa itu
		//    orang bisa mengaku-ngaku memiliki email milik akun lain.
		if (email == null || email.isBlank() || !emailVerified) {
			throw new GoogleLoginException("email_belum_terverifikasi");
		}
		String mail = AuthService.normalize(email);

		// 3. Email sudah terdaftar (mis. daftar dengan password): tautkan Google ke akun itu, kecuali
		//    akun tersebut sudah tertaut ke akun Google lain (jangan ditimpa).
		Optional<Pengguna> byEmail = repo.findByEmail(mail);
		if (byEmail.isPresent()) {
			Pengguna p = byEmail.get();
			if (p.getGoogleSub() != null) {
				throw new GoogleLoginException("akun_google_berbeda");
			}
			repo.linkGoogle(p.getUserId(), sub);
			return p;
		}

		// 4. Pengguna baru. password_hash wajib ada (NOT NULL) tapi dibuat acak: akun ini tidak bisa login dengan
		//    password sampai pemiliknya membuatnya lewat "Lupa kata sandi". no_telp dikosongkan (NULL): Google tidak
		//    dimintai nomor telepon; customer melengkapinya sendiri di profil.
		String nama = name == null || name.isBlank() ? mail.split("@")[0] : name.trim();
		if (nama.length() > 120) {
			nama = nama.substring(0, 120);
		}
		byte[] secret = new byte[32];
		random.nextBytes(secret);
		String unusableHash = encoder.encode(Base64.getEncoder().encodeToString(secret));
		return repo.saveAndFlush(Pengguna.dariGoogle(nama, mail, unusableHash, sub));
	}
}
